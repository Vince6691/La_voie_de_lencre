"""Sommets 3D d'une carte peinte (skill carte-peinte) : repère les montagnes dessinées (traits gris-vert sur la soie,
hors mer — prise sur l'image-guide —, rivières et sceaux) et répartit des sommets sur ces zones, à la grille de ~22 px de la carte 1920 × 1080.
Écrit assets/cartes/sommets/<id>.json : [[x, y, taille 0..1], ...] en px de la carte. Contrôle : out/sommets_<id>.jpg.

    python3 tools/build_sommets.py chine_centre_nord
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ICI = Path(__file__).resolve().parent.parent
CARTES = ICI / 'assets' / 'cartes'
PAS = 22


def sommets(ident):
    cat = json.loads((CARTES / 'cartes.json').read_text())
    c = next(c for c in cat['cartes'] if c['id'] == ident)
    src = Image.open(CARTES / c['peinte']).convert('RGB').resize((1920, 1080))
    im = np.asarray(src).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = (r + g + b) / 3
    # mer : prise sur l'image-guide (même cadrage, mer bleu nuit), élargie pour écarter les côtes peintes
    gd = np.asarray(Image.open(CARTES / c['guide']).convert('RGB').resize((1920, 1080))).astype(int)
    eau = nd.binary_dilation((gd[..., 2] > gd[..., 0] + 15) & (gd.sum(-1) / 3 < 110), iterations=14)
    # montagnes : gris-vert (G ≥ R), pas bleu, plus sombre que la soie
    m = (g >= r - 8) & (b < g - 10) & (lum < 190) & ~eau
    m = nd.binary_opening(m, iterations=1)
    m[:, :70] = m[:, -70:] = False                          # sceaux de collection dans les coins
    m[:40, :] = m[-40:, :] = False
    zone = nd.binary_dilation(m, iterations=4)
    lab, n = nd.label(zone)
    garder = [i + 1 for i, s in enumerate(nd.sum(m, lab, range(1, n + 1))) if s >= 45]
    zone = np.isin(lab, garder)
    dens = nd.uniform_filter(m.astype(float), size=PAS)
    pts, rng = [], np.random.default_rng(7)
    for y in range(PAS // 2, 1080, PAS):
        for x in range(PAS // 2, 1920, PAS):
            jx, jy = x + rng.integers(-6, 7), y + rng.integers(-6, 7)
            if 0 <= jx < 1920 and 0 <= jy < 1080 and zone[jy, jx]:
                pts.append([int(jx), int(jy), round(float(min(1, dens[jy, jx] * 4)), 2)])
    (CARTES / 'sommets' / f'{ident}.json').write_text(json.dumps(pts))
    d = ImageDraw.Draw(src)
    for x, y, s in pts:
        d.ellipse([x - 3 - 4 * s, y - 3 - 4 * s, x + 3 + 4 * s, y + 3 + 4 * s], outline=(220, 30, 30), width=2)
    (ICI / 'out').mkdir(exist_ok=True)
    src.save(ICI / 'out' / f'sommets_{ident}.jpg')
    print(ident, len(pts), 'sommets')


if __name__ == '__main__':
    sommets(sys.argv[1])
