"""Détoure une image générée sur fond magenta uni (#FF00FF) : alpha d'après l'écart au magenta, suppression du reflet
magenta sur les bords, recadrage au contenu. Écrit un PNG à côté (ou <sortie>).

    python3 tools/detourer_magenta.py image.jpg [sortie.png]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def detourer(src, dst=None):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = np.minimum(r, b) - g                              # « magentitude » : fort sur le fond, faible ailleurs
    a = 1 - np.clip((m - 35) / (110 - 35), 0, 1)
    # reflet magenta sur les bords : ramène R et B vers G là où il en reste
    spill = np.clip(np.minimum(r, b) - np.maximum(g, 0) - 20, 0, None) * (a < 0.999)
    out = im.copy()
    out[..., 0] -= spill * 0.8
    out[..., 2] -= spill * 0.8
    rgba = np.dstack([np.clip(out, 0, 255), a * 255]).astype(np.uint8)
    res = Image.fromarray(rgba, 'RGBA')
    res = res.crop(res.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    dst = Path(dst) if dst else Path(src).with_suffix('.png')
    res.save(dst)
    print(dst, res.size)


if __name__ == '__main__':
    detourer(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
