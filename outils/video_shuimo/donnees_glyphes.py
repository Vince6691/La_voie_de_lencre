"""Glyphes d'un épisode pour le moteur Canvas → <épisode>/glyphes/donnees.js
python3 donnees_glyphes.py ../../episodes/<pinyin>/episode.json

Lit la section « glyphes » de episode.json :
  "glyphes": {
    "reels":  {clé: {"img": "glyphes/jiao_xiaoxue/00.png", "label": "甲骨文", "era": "Shang", "piece": "甲1251",
                     "defaut": "hand", "polys": [[composante, [[x, y]…]]…]}},
    "traits": {clé: {"src": "glyphes/traits/教.json", "comp": ["yao", "yao", …]}}
  }
- reels : (options « fusion », « graines », « interieur » : voir reel()) (option « fusion » : seuil de partage d'un trait continu, 0,25 par défaut) formes historiques (小學堂, CC0) découpées par composante (polygones dans la boîte 400, le premier qui
  contient le pixel l'emporte ; un trait continu reste entier sauf partage réel), vectorisées (potrace) ;
  même format que xue/tools/build_real_glyphs.py → window.REALGLYPHS[clé] (E.drawRealGlyph).
- traits : ordre et forme des traits (Make Me a Hanzi / hanzi-writer-data, Arphic Public License),
  composante de chaque trait → window.STROKES[clé] (E.drawStrokes).
Le fichier produit complète les tables du projet (Object.assign) ; sync.mjs le copie dans public/legacy/episodes/."""
import json, os, sys
import numpy as np, potrace
from scipy import ndimage
from PIL import Image, ImageDraw

N, MERGE = 1600, 0.25


def ink_400(path):
    a = np.array(Image.open(path).convert('RGBA'))
    ink = (a[..., 3] > 128) & (a[..., :3].mean(-1) < 128)
    ys, xs = np.nonzero(ink)
    ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    s = 340 / max(ink.shape)
    w, h = round(ink.shape[1] * s * N / 400), round(ink.shape[0] * s * N / 400)
    im = Image.fromarray((ink * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    out = Image.new('L', (N, N), 0)
    out.paste(im, ((N - w) // 2, (N - h) // 2))
    return np.array(out) > 127


def trace(mask):
    k = 400 / N
    plist = potrace.Bitmap(~mask).trace(turdsize=40, alphamax=1.0, opticurve=True, opttolerance=0.2)
    P = lambda p: f'{p.x * k:.1f} {p.y * k:.1f}'
    d = []
    for c in plist:
        d.append(f'M{P(c.start_point)}')
        for sg in c.segments:
            d.append(f'L{P(sg.c)}L{P(sg.end_point)}' if sg.is_corner else f'C{P(sg.c1)} {P(sg.c2)} {P(sg.end_point)}')
        d.append('Z')
    return ''.join(d)


def reel(base, g):
    ink = ink_400(os.path.join(base, g['img']))
    owner = np.full(ink.shape, '', dtype=object)
    for c, poly in g.get('polys', []):
        m = Image.new('L', (N, N), 0)
        ImageDraw.Draw(m).polygon([(x * N / 400, y * N / 400) for x, y in poly], fill=255)
        owner[(np.array(m) > 0) & (owner == '')] = c
    # « interieur » : {composante: [r, repli]} — ne garder à la composante que l'encre à plus de r (boîte 400) du bord de la
    # silhouette remplie (ex. la marque dans le torse : les traits du contour du corps vont au repli)
    if g.get('interieur'):
        dist = ndimage.distance_transform_edt(ndimage.binary_fill_holes(ink)) * 400 / N
        for c, (r, repli) in g['interieur'].items():
            owner[(owner == c) & (dist < r)] = repli
    owner[owner == ''] = g['defaut']
    lab, n = ndimage.label(ink, structure=np.ones((3, 3)))
    # « graines » : {composante: [[x, y]…]} — le tracé (composante connexe) qui contient le point lui appartient en entier
    for c, pts in g.get('graines', {}).items():
        ys, xs = np.nonzero(ink)
        for x, y in pts:
            j = np.argmin((xs - x * N / 400) ** 2 + (ys - y * N / 400) ** 2)
            owner[lab == lab[ys[j], xs[j]]] = c
    for i in range(1, n + 1):
        blob = lab == i
        names, counts = np.unique(owner[blob], return_counts=True)
        if len(names) > 1 and counts.max() / counts.sum() > 1 - g.get('fusion', MERGE):
            owner[blob] = names[counts.argmax()]
    paths, centers = [], {}
    for c in dict.fromkeys([g['defaut']] + [c for c, _ in g.get('polys', [])] + list(g.get('graines', {}))):
        mask = ink & (owner == c)
        if mask.sum() < 50: continue
        ys, xs = np.nonzero(mask)
        centers[c] = [round((xs.min() + xs.max()) / 2 * 400 / N, 1), round((ys.min() + ys.max()) / 2 * 400 / N, 1)]
        paths.append({'d': trace(mask), 'c': c, 'cut': []})
    return {'paths': paths, 'centers': centers, 'label': g['label'], 'era': g['era'], 'piece': g.get('piece', '')}


def main(chemin):
    chemin = os.path.abspath(chemin)
    base = os.path.dirname(chemin)
    cfg = json.load(open(chemin, encoding='utf-8'))['glyphes']
    reels = {k: reel(base, g) for k, g in cfg.get('reels', {}).items()}
    traits = {}
    for k, g in cfg.get('traits', {}).items():
        d = json.load(open(os.path.join(base, g['src']), encoding='utf-8'))
        assert len(d['strokes']) == len(g['comp']), (k, len(d['strokes']), len(g['comp']))
        traits[k] = {'strokes': d['strokes'], 'medians': d['medians'], 'comp': g['comp']}
    out = os.path.join(base, 'glyphes', 'donnees.js')
    open(out, 'w', encoding='utf-8').write(
        "// Glyphes de l'épisode — généré par outils/video_shuimo/donnees_glyphes.py depuis episode.json.\n"
        "// Formes réelles : 小學堂字形演變資料庫 (Academia Sinica), CC0. Traits : Make Me a Hanzi / hanzi-writer-data,\n"
        "// Arphic Public License (xue/assets/strokes/ARPHICPL.TXT).\n"
        "Object.assign(window.REALGLYPHS = window.REALGLYPHS || {}, " + json.dumps(reels, ensure_ascii=False, separators=(',', ':')) + ");\n"
        "Object.assign(window.STROKES = window.STROKES || {}, " + json.dumps(traits, ensure_ascii=False, separators=(',', ':')) + ");\n")
    print('réels :', {k: [p['c'] for p in v['paths']] for k, v in reels.items()})
    print('traits :', {k: len(v['strokes']) for k, v in traits.items()})


if __name__ == '__main__':
    if len(sys.argv) != 2: raise SystemExit(__doc__)
    main(sys.argv[1])
