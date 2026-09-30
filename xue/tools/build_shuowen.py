"""Caractères des lattes du Shuowen (scène 5) → src/shuowen.js, boîte 400 × 400, un tracé par caractère.
- têtes d'article en petit sceau : 斆 (說文‧教部) et 學 (說文篆文), formes 10 et 11 du 小學堂
- explication en écriture des clercs : une forme 隸書 réelle par caractère (小學堂, CC0), quand elle existe ;
  les caractères sans forme retenue restent en kaishu (police) dans la scène
Source : 小學堂字形演變資料庫 (Academia Sinica), CC0 — assets/glyphs/xiaoxue/."""
import json
import numpy as np, potrace
from PIL import Image

SKIP = {'也'}  # forme douteuse (le site la décrit comme sigillaire) : laissée en kaishu


def trace_png(path):
    a = np.array(Image.open(path).convert('RGBA'))
    ink = (a[..., 3] > 128) & (a[..., :3].mean(-1) < 128)
    ys, xs = np.nonzero(ink)
    ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    s = 340 / max(ink.shape)
    ox, oy = (400 - ink.shape[1] * s) / 2, (400 - ink.shape[0] * s) / 2
    P = lambda p: f'{ox + p.x * s:.1f} {oy + p.y * s:.1f}'
    d = []
    for c in potrace.Bitmap(~ink).trace(turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.2):
        d.append(f'M{P(c.start_point)}')
        for sg in c.segments:
            d.append(f'L{P(sg.c)}L{P(sg.end_point)}' if sg.is_corner else f'C{P(sg.c1)} {P(sg.c2)} {P(sg.end_point)}')
        d.append('Z')
    return ''.join(d)


out = {'seal:斆': trace_png('assets/glyphs/xiaoxue/10.png'), 'seal:學': trace_png('assets/glyphs/xiaoxue/11.png')}
for ch, v in json.load(open('assets/glyphs/xiaoxue/lishu/index.json')).items():
    if ch not in SKIP: out[ch] = trace_png('assets/glyphs/xiaoxue/lishu/' + v['file'])
open('src/shuowen.js', 'w').write(
    "// Lattes du Shuowen : têtes d'article en petit sceau, explication en écriture des clercs (小學堂, CC0).\n"
    "// Généré par tools/build_shuowen.py — boîte 400 × 400.\n"
    "window.SHUOWEN = " + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ";\n")
print(sorted(out))
