"""Vectorise une forme de 小學堂 (PNG noir sur transparent) en tracés SVG, boîte 400 × 400.
Usage : python3 tools/vectorize_xiaoxue.py 16 lishu   → assets/glyphs/lishu.svg"""
import sys, json
import numpy as np, potrace
from PIL import Image

idx, name = int(sys.argv[1]), sys.argv[2]
im = Image.open(f'assets/glyphs/xiaoxue/{idx:02d}.png').convert('RGBA')
a = np.array(im)
ink = (a[..., 3] > 128) & (a[..., :3].mean(-1) < 128)
ys, xs = np.nonzero(ink)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
ink = ink[y0:y1 + 1, x0:x1 + 1]
# mise à l'échelle : le plus grand côté fait 340 dans une boîte 400, centré
s = 340 / max(ink.shape)
ox, oy = (400 - ink.shape[1] * s) / 2, (400 - ink.shape[0] * s) / 2
bm = potrace.Bitmap(~ink)  # potracer trace les pixels « faux »
plist = bm.trace(turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.2)
P = lambda p: f'{ox + p.x * s:.1f} {oy + p.y * s:.1f}'
# un seul tracé (règle evenodd) : les contre-formes restent évidées ; les composantes sont
# ensuite attribuées par polygones de découpe (tools/build_real_glyphs.py)
d = []
for curve in plist:
    d.append(f'M{P(curve.start_point)}')
    for seg in curve.segments:
        if seg.is_corner: d.append(f'L{P(seg.c)}L{P(seg.end_point)}')
        else: d.append(f'C{P(seg.c1)} {P(seg.c2)} {P(seg.end_point)}')
    d.append('Z')
paths = [''.join(d)]
src = json.load(open('assets/glyphs/xiaoxue/index.json'))['forms'][idx]['label']
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">\n<!-- 學 · {src} · 小學堂 (Academia Sinica), CC0 -->\n'
       + ''.join(f'<path fill="#000000" fill-rule="evenodd" d="{d}"/>\n' for d in paths) + '</svg>\n')
open(f'assets/glyphs/{name}.svg', 'w').write(svg)
print(name, len(paths), 'tracés')
