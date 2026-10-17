"""Extract CJK glyph outlines (per contour) from fonts into src/fontglyphs.js.
Coordinates normalised into a 1000x1000 box, y downwards."""
import json
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen

def contours(font_path, ch):
    f = TTFont(font_path); gs = f.getGlyphSet(); name = f.getBestCmap()[ord(ch)]
    pen = DecomposingRecordingPen(gs); gs[name].draw(pen)
    bp = BoundsPen(gs); gs[name].draw(bp); xmin, ymin, xmax, ymax = bp.bounds
    s = 900 / max(xmax - xmin, ymax - ymin)
    ox = 500 - (xmin + xmax) / 2 * s; oy = 500 + (ymin + ymax) / 2 * s
    T = lambda p: (round(p[0] * s + ox, 1), round(oy - p[1] * s, 1))
    out, cur = [], []
    for op, args in pen.value:
        if op == 'moveTo': cur = [['M', *T(args[0])]]
        elif op == 'lineTo': cur.append(['L', *T(args[0])])
        elif op == 'qCurveTo':
            # expand implied on-curve points
            pts = [T(a) for a in args]
            offs, end = pts[:-1], pts[-1]
            for i, c in enumerate(offs):
                e = end if i == len(offs) - 1 else ((c[0] + offs[i+1][0]) / 2, (c[1] + offs[i+1][1]) / 2)
                cur.append(['Q', *c, *e])
        elif op == 'curveTo':
            a, b, c = [T(x) for x in args]; cur.append(['C', *a, *b, *c])
        elif op in ('closePath', 'endPath'):
            cur.append(['Z']); out.append(cur); cur = []
    res = []
    for c in out:
        xs = [v for seg in c for v in seg[1::2]]; ys = [v for seg in c for v in seg[2::2]]
        d = ' '.join(seg[0] + ' '.join(str(v) for v in seg[1:]) for seg in c)
        res.append({'d': d, 'bb': [min(xs), min(ys), max(xs), max(ys)]})
    return res

data = {
  'kai_xue_trad': contours('assets/fonts/LXGWWenKaiTC-Bold.ttf', '學'),
  'kai_xue_simp': contours('assets/fonts/LXGWWenKaiTC-Bold.ttf', '学'),
  'song_xue_simp': contours('assets/fonts/NotoSerifTC-Bold.otf', '学'),
  'cao_xue_simp': contours('assets/fonts/LiuJianMaoCao-Regular.ttf', '学'),
}
for k, v in data.items():
    print(k, len(v)); [print('  ', i, c['bb']) for i, c in enumerate(v)]
open('src/fontglyphs.js', 'w').write('window.FONTGLYPHS = ' + json.dumps(data) + ';\n')
