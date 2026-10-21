"""Dessin 白描 → données de tracé trait par trait pour le moteur Canvas (E.drawPortrait avec o.key).
python3 portrait.py ../../episodes/<pinyin>/episode.json [--debug]

Section « portraits » de episode.json :
  "portraits": {clé: {"img": "images/confucius_baimiao_1.jpg", "largeur": 1700, ["seuil": 150, "epaissir": 0,]
                      "zones": [[nom, part_du_temps, [x0, y0, x1, y1] en fractions de l'image, ou null = le reste]…]}}
Les zones sont testées dans l'ordre (la première qui contient le milieu du trait l'emporte) et peintes dans cet ordre ;
dans chaque zone, le pinceau va de proche en proche en partant du haut. Méthode de outils/moteur/tools/build_portrait.py :
encre vectorisée (potrace) + squelette coupé aux croisements, chaque tronçon dévoile l'encre sous lui.
Sortie : <épisode>/glyphes/portrait_<clé>.js → window.PORTRAITS[clé] (copié par sync.mjs dans legacy/episodes.js).
--debug : <épisode>/apercus/portrait_<clé>_zones.png (traits colorés par zone)."""
import json, os, sys
import numpy as np, potrace
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage.morphology import skeletonize

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'moteur', 'tools'))
from build_portrait import chains, rdp  # noqa: E402


def build(base, key, cfg, debug):
    g = Image.open(os.path.join(base, cfg['img'])).convert('L')
    lw = cfg.get('largeur', 1700)
    g = g.resize((lw, round(g.height * lw / g.width)), Image.LANCZOS)
    a = np.array(g).astype(float)
    ink = ndimage.binary_opening(a < cfg.get('seuil', 150), np.ones((2, 2)))
    if cfg.get('epaissir'): ink = ndimage.binary_dilation(ink, iterations=cfg['epaissir'])  # traits trop fins pour l'écran
    lab, n = ndimage.label(ink)
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    ink = np.isin(lab, 1 + np.nonzero(sizes >= 12)[0])
    ys, xs = np.nonzero(ink)
    m = 8
    x0, y0, x1, y1 = max(0, xs.min() - m), max(0, ys.min() - m), xs.max() + m, ys.max() + m
    full_w, full_h = ink.shape[1], ink.shape[0]
    ink = ink[y0:y1, x0:x1]
    H, W = ink.shape

    d = []
    P = lambda p: f'{p.x:.1f} {p.y:.1f}'
    for c in potrace.Bitmap(~ink).trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2):
        d.append(f'M{P(c.start_point)}')
        for sg in c.segments:
            d.append(f'L{P(sg.c)}L{P(sg.end_point)}' if sg.is_corner else f'C{P(sg.c1)} {P(sg.c2)} {P(sg.end_point)}')
        d.append('Z')

    zones = cfg['zones']
    def zone_of(x, y):  # x, y : pixels du recadrage → fractions de l'image entière
        fx, fy = (x + x0) / full_w, (y + y0) / full_h
        for i, (_, _, r) in enumerate(zones):
            if r is None or (r[0] <= fx <= r[2] and r[1] <= fy <= r[3]): return i
        return len(zones) - 1

    dist = ndimage.distance_transform_edt(ink)
    strokes = []
    for path in chains(skeletonize(ink)):
        w = 2 * max(dist[p] for p in path) + 3
        pts = [(x + 0.5, y + 0.5) for y, x in rdp(path, 0.8)]
        if len(pts) == 1: pts = pts * 2
        L = sum(np.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
        strokes.append({'pts': pts, 'w': w, 'L': L, 'z': zone_of(np.mean([p[0] for p in pts]), np.mean([p[1] for p in pts]))})

    order, t, pen = [], 0.0, None
    for zi, (name, share, _) in enumerate(zones):
        todo = [s for s in strokes if s['z'] == zi]
        if not todo: continue
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
        print(f'{name:8s} {len(seq):5d} traits')
    for s in order: s['t0'] /= t; s['t1'] /= t

    js = {'w': W, 'h': H, 'ink': ''.join(d),
          'strokes': [[round(s['t0'], 5), round(s['t1'], 5), round(s['w'], 1)] + [round(v, 1) for p in s['pts'] for v in p] for s in order]}
    out = os.path.join(base, 'glyphes', f'portrait_{key}.js')
    open(out, 'w', encoding='utf-8').write(
        f"// Dessin 白描 « {key} » (portrait imaginé), tracé trait par trait — généré par outils/video_shuimo/portrait.py\n"
        f"// depuis {cfg['img']}. ink : encre vectorisée ; strokes : [t0, t1, largeur, x, y, x, y…] (ordre du peintre).\n"
        f"(window.PORTRAITS = window.PORTRAITS || {{}})[{json.dumps(key)}] = " + json.dumps(js, separators=(',', ':')) + ';\n')
    print(f'{key} : {len(order)} traits, {W}×{H}, {os.path.getsize(out) // 1024} Ko')
    if debug:
        cols = [(220, 60, 50), (40, 130, 220), (200, 150, 20), (30, 150, 90), (140, 80, 180), (90, 90, 90)]
        im = Image.new('RGB', (W, H), 'white'); dr = ImageDraw.Draw(im)
        for s in order: dr.line([tuple(p) for p in s['pts']], fill=cols[s['z'] % len(cols)], width=3)
        os.makedirs(os.path.join(base, 'apercus'), exist_ok=True)
        im.save(os.path.join(base, 'apercus', f'portrait_{key}_zones.png'))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 1: raise SystemExit(__doc__)
    chemin = os.path.abspath(args[0])
    for k, c in json.load(open(chemin, encoding='utf-8')).get('portraits', {}).items():
        build(os.path.dirname(chemin), k, c, '--debug' in sys.argv)
