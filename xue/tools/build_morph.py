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
