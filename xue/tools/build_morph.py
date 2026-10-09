"""Fondu encre ↔ 3D : champ de propagation de chaque paire (assets/morph/<nom>_3d.jpg + <nom>_encre.jpg)
→ assets/morph/<nom>_champ.png (gris 16 bits ramené en 8 bits : 0 = révélé en premier, 1 = en dernier).

Le champ = distance au point focal (ellipse : un personnage debout s'étire en hauteur) + bruit fractal (bord
d'encre irrégulier, comme dans les fibres du papier) + un peu de l'encre de l'image (la propagation suit les formes).
Dans la vidéo, un seuil qui avance sur ce champ révèle l'autre version (remotion/src/morph/MorphEncre.tsx).
python3 tools/build_morph.py"""
import numpy as np
from PIL import Image
from scipy import ndimage

PAIRS = {
    # point focal (fraction de largeur, de hauteur), étirement vertical de l'ellipse
    'paysage': {'focus': (0.64, 0.36), 'tall': 1.0},
    'vieil_homme': {'focus': (0.67, 0.52), 'tall': 2.1},
}


def fractal(h, w, seed):
    r = np.random.default_rng(seed)
    n = sum(ndimage.gaussian_filter(r.standard_normal((h, w)), s) * s ** 0.9 for s in (90, 40, 16, 6))
    return (n - n.mean()) / n.std()


for name, p in PAIRS.items():
    ink = np.asarray(Image.open(f'assets/morph/{name}_encre.jpg').convert('L')).astype(np.float32) / 255
    h, w = ink.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    fx, fy = p['focus']
    d = np.hypot((xx / w - fx) * (w / h), (yy / h - fy) / p['tall'])
    d /= d.max()
    f = d + 0.045 * fractal(h, w, 7) + 0.04 * ndimage.gaussian_filter(1 - ink, 3)
    f = (f - f.min()) / (f.max() - f.min())
    Image.fromarray((f * 255).round().astype(np.uint8)).save(f'assets/morph/{name}_champ.png')
    print(name, 'champ', w, '×', h)


# ── mode « délavé » : quantité de couleur par pixel sur un sujet (personnage) → <nom>_couleur.png
# 1 au cœur du sujet (visage, torse), décroît vers les extrémités (bouts des manches, pieds, pinceau) et près du
# contour, de façon irrégulière ; 0 hors du sujet (le lavis shuimo y reste seul).
SUBJECTS = {
    # silhouette prise dans la version encre : boîte (x0, y0, x1, y1), zones à exclure, cœur (x, y, rx, ry) en pixels
    'vieil_homme': {'box': (690, 120, 1080, 705), 'cut': [(1005, 625, 1376, 768)], 'core': (915, 300, 140, 230)},
}
sm = lambda a, b, v: (lambda u: u * u * (3 - 2 * u))(np.clip((v - a) / (b - a), 0, 1))
for name, s in SUBJECTS.items():
    ink = np.asarray(Image.open(f'assets/morph/{name}_encre.jpg').convert('L')).astype(np.float32) / 255
    h, w = ink.shape
    m = ndimage.binary_fill_holes(ndimage.binary_closing(ink < 0.86, np.ones((15, 15))))
    box = np.zeros_like(m); x0, y0, x1, y1 = s['box']; box[y0:y1, x0:x1] = True; m &= box
    lab, n = ndimage.label(m)
    m = lab == 1 + np.argmax(ndimage.sum(m, lab, range(1, n + 1)))
    for cx0, cy0, cx1, cy1 in s['cut']: m[cy0:cy1, cx0:cx1] = False
    m = ndimage.binary_erosion(m, iterations=4)  # pas de fond 3D (ciel) autour du personnage
    din = ndimage.distance_transform_edt(m)
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy, rx, ry = s['core']
    core = 1 - 0.8 * sm(0.5, 1.6, np.hypot((xx - cx) / rx, (yy - cy) / ry))
    edge = 0.15 + 0.85 * sm(0, 1, din / 45)
    p = np.clip(core * edge + 0.16 * fractal(h, w, 3), 0, 1) * ndimage.gaussian_filter(m.astype(np.float32), 3)
    Image.fromarray((p * 255).round().astype(np.uint8)).save(f'assets/morph/{name}_couleur.png')
    print(name, 'couleur', w, '×', h)
