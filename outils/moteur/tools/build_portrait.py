"""Portrait de Xu Shen (scène 5) → src/portrait.js : encre vectorisée + traits ordonnés pour le tracer à l'animation.
Source : assets/portrait/xushen_a.jpg (白描 généré, portrait imaginé).
- encre : potrace sur l'image agrandie ×2 (un seul tracé, rempli à la fin de chaque image) ;
- traits : squelette de l'encre coupé aux croisements ; chaque tronçon devient une polyligne avec sa largeur,
  qui dévoile l'encre sous elle à mesure qu'elle avance ;
- ordre du peintre : tête (bonnet, visage, barbe) → robe → mains et pinceau → table et lattes → natte,
  et dans chaque zone, de proche en proche (le pinceau part du bout le plus proche de là où il s'est levé).
python3 tools/build_portrait.py [--debug]   (--debug : out/preview/portrait_zones.png, zones en couleurs)"""
import json, sys
import numpy as np, potrace
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage.morphology import skeletonize

SRC = 'assets/portrait/xushen_a.jpg'
UP = 2  # agrandissement avant vectorisation
ZONES = [  # (nom, part du temps, polygones en pixels de l'image recadrée agrandie) — le premier qui contient le milieu du trait l'emporte
    ('tête', 0.22, [[(715, 0), (890, 0), (940, 150), (935, 320), (915, 380), (890, 490), (850, 490), (830, 330), (790, 290), (745, 270), (730, 200)]]),
    ('mains', 0.10, [[(960, 590), (990, 590), (1040, 700), (1065, 835), (1030, 840), (935, 790), (930, 700), (960, 680)],
                     [(1115, 700), (1180, 685), (1260, 700), (1260, 775), (1150, 770), (1115, 745)]]),
    ('table', 0.23, [[(725, 935), (960, 830), (1290, 650), (1300, 590), (1600, 585), (1665, 690), (1665, 730), (1100, 1060), (1080, 1060), (730, 960)],
                     [(770, 960), (840, 960), (835, 1265), (770, 1265)], [(1040, 1040), (1115, 1040), (1120, 1380), (1040, 1380)],
                     [(1550, 760), (1615, 760), (1635, 1070), (1550, 1070)], [(735, 1235), (790, 1225), (1130, 1330), (1130, 1385), (1090, 1385), (735, 1270)],
                     [(1320, 985), (1560, 1030), (1640, 1040), (1640, 1075), (1320, 1010)], [(815, 1035), (830, 1030), (1100, 1085), (1100, 1110), (815, 1065)],
                     [(1100, 1070), (1560, 835), (1580, 860), (1110, 1100)], [(1330, 900), (1580, 820), (1580, 850), (1330, 930)]]),
    ('robe', 0.30, [[(690, 300), (705, 245), (760, 250), (850, 340), (1000, 470), (1100, 625), (1160, 625), (1215, 690), (1100, 720), (1000, 830), (930, 840), (760, 960), (770, 1000),
                     (990, 1040), (1300, 1130), (1380, 1170), (1280, 1230), (1100, 1210), (900, 1220), (700, 1215), (500, 1200), (380, 1150), (390, 1050),
                     (470, 950), (500, 650), (560, 450), (600, 380)]]),
    ('natte', 0.15, None),  # le reste
]
DRAW = ['tête', 'robe', 'mains', 'table', 'natte']  # ordre du tracé


def inside(poly, x, y):
    c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c


def zone_of(x, y):
    for i, (_, _, polys) in enumerate(ZONES):
        if polys is None or any(inside(p, x, y) for p in polys): return i


def chains(skel):
    """Tronçons du squelette entre extrémités et croisements, en listes ordonnées de pixels (y, x)."""
    k = np.ones((3, 3)); k[1, 1] = 0
    nb = ndimage.convolve(skel.astype(int), k, mode='constant') * skel
    junc = skel & (nb > 2)
    body = skel & ~junc
    lab, n = ndimage.label(body, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    out = []
    for i, sl in enumerate(objs, 1):
        ys, xs = np.nonzero(lab[sl] == i)
        pts = set(zip((ys + sl[0].start).tolist(), (xs + sl[1].start).tolist()))
        nbrs = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pts]
        ends = [p for p in pts if len(nbrs(p)) <= 1]
        start = min(ends) if ends else min(pts)
        path, seen, cur = [start], {start}, start
        while True:
            nx = [q for q in nbrs(cur) if q not in seen]
            if not nx: break
            # préférer le voisin direct (4-connexe) pour ne pas sauter de pixel
            nx.sort(key=lambda q: abs(q[0] - cur[0]) + abs(q[1] - cur[1]))
            cur = nx[0]; seen.add(cur); path.append(cur)
        # rattacher le tronçon aux croisements voisins, pour que le dévoilement couvre ces nœuds
        for e in (0, -1):
            p = path[e]
            j = [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if 0 <= p[0] + dy < skel.shape[0] and 0 <= p[1] + dx < skel.shape[1] and junc[p[0] + dy, p[1] + dx]]
            if j: path.insert(0, j[0]) if e == 0 else path.append(j[0])
        out.append(path)
    # croisements isolés (amas sans tronçon) : points seuls
    return out


def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    d = np.array(pts, float) - a
    ab = b - a; L = np.hypot(*ab)
    dist = np.abs(d[:, 0] * ab[1] - d[:, 1] * ab[0]) / L if L else np.hypot(d[:, 0], d[:, 1])
    i = int(dist.argmax())
    if dist[i] > eps: return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def main():
    g = Image.open(SRC).convert('L')
    g = g.resize((g.width * UP, g.height * UP), Image.LANCZOS)
    a = np.array(g).astype(float)
    ink = a < 150
    ink = ndimage.binary_opening(ink, np.ones((2, 2)))
    lab, n = ndimage.label(ink)
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    ink = np.isin(lab, 1 + np.nonzero(sizes >= 12)[0])
    ys, xs = np.nonzero(ink)
    m = 8
    x0, y0, x1, y1 = xs.min() - m, ys.min() - m, xs.max() + m, ys.max() + m
    ink = ink[y0:y1, x0:x1]
    H, W = ink.shape

    d = []
    P = lambda p: f'{p.x:.1f} {p.y:.1f}'
    for c in potrace.Bitmap(~ink).trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2):
        d.append(f'M{P(c.start_point)}')
        for sg in c.segments:
            d.append(f'L{P(sg.c)}L{P(sg.end_point)}' if sg.is_corner else f'C{P(sg.c1)} {P(sg.c2)} {P(sg.end_point)}')
        d.append('Z')

    dist = ndimage.distance_transform_edt(ink)
    skel = skeletonize(ink)
    strokes = []
    for path in chains(skel):
        w = 2 * max(dist[p] for p in path) + 3
        pts = [(x + 0.5, y + 0.5) for y, x in rdp(path, 0.8)]
        if len(pts) == 1: pts = pts * 2
        L = sum(np.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
        mx, my = np.mean([p[0] for p in pts]), np.mean([p[1] for p in pts])
        strokes.append({'pts': pts, 'w': w, 'L': L, 'z': zone_of(mx, my)})

    # ordre du peintre : zones, puis de proche en proche en partant du haut de la zone
    order, t = [], 0.0
    pen = None
    for name in DRAW:
        zi = [z[0] for z in ZONES].index(name); share = ZONES[zi][1]
        todo = [s for s in strokes if s['z'] == zi]
        if not todo: continue
        if pen is None:
            pen = min((p for s in todo for p in (s['pts'][0], s['pts'][-1])), key=lambda p: p[1])
        seq = []
        while todo:
            best, rev, bd = None, False, 1e18
            for s in todo:
                for r, p in ((False, s['pts'][0]), (True, s['pts'][-1])):
                    dd = (p[0] - pen[0]) ** 2 + (p[1] - pen[1]) ** 2
                    if dd < bd: best, rev, bd = s, r, dd
            todo.remove(best)
            if rev: best['pts'] = best['pts'][::-1]
            pen = best['pts'][-1]
            seq.append(best)
        cost = [s['L'] ** 0.75 + 4 for s in seq]
        tot = sum(cost)
        for s, c in zip(seq, cost):
            s['t0'] = t; t += share * c / tot; s['t1'] = t
            order.append(s)
        print(f'{name:6s} {len(seq):5d} traits')
    for s in order: s['t0'] /= t; s['t1'] /= t

    js = {'w': W, 'h': H, 'ink': ''.join(d),
          'strokes': [[round(s['t0'], 5), round(s['t1'], 5), round(s['w'], 1)] + [round(v, 1) for p in s['pts'] for v in p] for s in order]}
    open('src/portrait.js', 'w').write(
        '// Portrait imaginé de Xu Shen (白描), tracé trait par trait dans la scène 5.\n'
        '// Généré par tools/build_portrait.py depuis assets/portrait/xushen_a.jpg — ink : encre vectorisée ;\n'
        '// strokes : [t0, t1, largeur, x, y, x, y…] (t dans [0, 1], ordre du peintre).\n'
        'window.PORTRAIT = ' + json.dumps(js, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{len(order)} traits, {W}×{H}, encre {len(js["ink"]) // 1024} Ko')

    if '--debug' in sys.argv:
        cols = [(220, 60, 50), (40, 130, 220), (200, 150, 20), (30, 150, 90), (140, 80, 180)]
        im = Image.new('RGB', (W, H), 'white'); dr = ImageDraw.Draw(im)
        for s in order:
            dr.line([tuple(p) for p in s['pts']], fill=cols[s['z']], width=3)
        im.save('out/preview/portrait_zones.png')


if __name__ == '__main__':
    main()
