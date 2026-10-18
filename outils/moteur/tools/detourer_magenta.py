"""Détoure une image générée sur fond magenta uni (#FF00FF) : alpha d'après l'écart au magenta, suppression du reflet
magenta sur les bords, recadrage au contenu. Écrit un PNG à côté (ou <sortie>).

    python3 tools/detourer_magenta.py image.jpg [sortie.png]
    python3 tools/detourer_magenta.py planche.jpg --separer [dossier]   # planche : un PNG par élément, lus en lignes
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd


def alpha_magenta(src):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = np.minimum(r, b) - g                              # « magentitude » : fort sur le fond, faible ailleurs
    a = 1 - np.clip((m - 35) / (110 - 35), 0, 1)
    # reflet magenta sur les bords : là où le pixel tire vers le magenta (R et B au-dessus de G), ramène R et B vers G
    tir = np.clip(np.minimum(r, b) - g, 0, None)
    out = im.copy()
    out[..., 0] -= tir * np.clip(1.2 - a, 0.35, 1)
    out[..., 2] -= tir * np.clip(1.2 - a, 0.35, 1)
    # bord rongé d'un pixel : supprime le liseré restant
    a = np.minimum(a, nd.grey_erosion(a, size=(3, 3)) * 0.6 + a * 0.4)
    return Image.fromarray(np.dstack([np.clip(out, 0, 255), a * 255]).astype(np.uint8), 'RGBA')


def detourer(src, dst=None):
    res = alpha_magenta(src)
    res = res.crop(res.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    dst = Path(dst) if dst else Path(src).with_suffix('.png')
    res.save(dst)
    print(dst, res.size)


def separer(src, dossier=None):
    """Planche d'éléments isolés : composantes connexes de l'alpha (petits écarts refermés), triées par ligne puis
    colonne ; écrit <nom>_01.png, <nom>_02.png… recadrés au contenu."""
    res = alpha_magenta(src)
    a = np.asarray(res.getchannel('A')) > 40
    lab, n = nd.label(nd.binary_closing(a, iterations=6))
    boites = [b for b in nd.find_objects(lab) if (b[0].stop - b[0].start) * (b[1].stop - b[1].start) > 1500]
    h = res.height
    boites.sort(key=lambda b: (round((b[0].start + b[0].stop) / 2 / (h / 3)), b[1].start))
    dossier = Path(dossier) if dossier else Path(src).parent
    for i, b in enumerate(boites, 1):
        m = 6
        el = res.crop((max(0, b[1].start - m), max(0, b[0].start - m), b[1].stop + m, b[0].stop + m))
        dst = dossier / f'{Path(src).stem}_{i:02d}.png'
        el.save(dst)
        print(dst, el.size)


if __name__ == '__main__':
    if '--separer' in sys.argv:
        args = [x for x in sys.argv[1:] if x != '--separer']
        separer(args[0], args[1] if len(args) > 1 else None)
    else:
        detourer(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
