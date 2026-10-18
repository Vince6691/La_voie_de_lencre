"""Relief artistique d'une carte peinte (skill carte-peinte) : altitudes grossières (tuiles Terrarium, zoom 5, ~5 km),
recalées sur la vue de la carte, mer à zéro, fortement lissées et comprimées (racine) pour un relief doux. Écrit
assets/cartes/reliefs/<id>.png (gris 8 bits, 0 = mer/plaine, 255 = ~6000 m), 640 × 360.

    python3 tools/build_relief.py chine_centre_nord
"""
import io
import json
import math
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ICI = Path(__file__).resolve().parent.parent
CARTES = ICI / 'assets' / 'cartes'
Z, W, H = 5, 640, 360
URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
_cache = {}


def tuile(x, y):
    if (x, y) not in _cache:
        data = urllib.request.urlopen(URL.format(z=Z, x=x, y=y), timeout=30).read()
        a = np.asarray(Image.open(io.BytesIO(data)).convert('RGB')).astype(np.float32)
        _cache[(x, y)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    return _cache[(x, y)]


def altitude(lon, lat):
    n = 2 ** Z
    fx = (lon + 180) / 360 * n
    fy = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    tx, ty = int(fx), int(fy)
    return tuile(tx, ty)[min(255, int((fy - ty) * 256)), min(255, int((fx - tx) * 256))]


def relief(ident):
    cat = json.loads((CARTES / 'cartes.json').read_text())
    v = next(c for c in cat['cartes'] if c['id'] == ident)['vue']
    alt = np.zeros((H, W), np.float32)
    for j in range(H):
        for i in range(W):
            px, py = (i + 0.5) * 1920 / W, (j + 0.5) * 1080 / H
            lon = v['lon'] + (px - 960) / v['k']
            lat = v['lat'] - (py - 540) / (v['k'] * 1.18)
            alt[j, i] = altitude(lon, lat)
    alt = np.clip(alt, 0, 6000) / 6000                       # mer et dépressions à zéro
    img = Image.fromarray((np.sqrt(alt) * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(3))
    dst = CARTES / 'reliefs' / f'{ident}.png'
    img.save(dst)
    print(dst, img.size)


if __name__ == '__main__':
    relief(sys.argv[1])
