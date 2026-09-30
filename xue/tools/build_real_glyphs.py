"""Formes historiques réelles de 學 → src/realglyphs.js (boîte 400 × 400).

Source : 小學堂字形演變資料庫 (Academia Sinica), images en CC0 — assets/glyphs/xiaoxue/ (index.json
donne la pièce d'origine de chaque image). Chaque pixel d'encre est attribué à une composante
(hand 𦥑, yao 爻, roof 冖, child 子 ; top / bottom pour la forme de Chu) par des polygones testés
dans l'ordre, puis chaque composante est vectorisée à part (potrace) : on obtient un tracé par
composante, ce qui permet les métamorphoses composante par composante (E.drawMorph)."""
import json
import numpy as np, potrace
from PIL import Image, ImageDraw

# key : (n° d'image, étiquette, époque, [(composante, polygone)], composante par défaut)
GLYPHS = {
    # os oraculaire (Shang) : 鐵雲藏龜 157.4 — deux mains, une croix 乂, le toit ; pas encore d'enfant
    'jiaguwen': (0, '甲骨文', 'Shang', [
        ('yao', [[180, 58], [252, 58], [252, 184], [163, 184], [182, 140]]),
        ('roof', [[80, 184], [340, 184], [340, 400], [80, 400]]),
    ], 'hand'),
    # bronze (Zhou occidentaux) : 大盂鼎 — deux croix, l'enfant sous le toit
    'jinwen': (4, '金文', 'Zhou', [
        ('child', [[128, 262], [255, 262], [255, 345], [170, 382], [128, 382]]),
        ('roof', [[88, 208], [330, 208], [330, 400], [88, 400]]),
        ('yao', [[163, 38], [246, 38], [246, 208], [163, 208]]),
    ], 'hand'),
    # Royaumes combattants (Chu) : bambous de Guodian, 郭店·老子乙 3 — haut abrégé, 子 dessous
    'zhanguo': (8, '戰國文字', 'Royaumes combattants', [
        ('bottom', [[60, 192], [340, 192], [340, 400], [60, 400]]),
    ], 'top'),
    # petit sceau : forme « 篆文 » du Shuowen
    'xiaozhuan': (11, '小篆', 'Qin', [
        ('child', [[130, 200], [270, 200], [270, 386], [130, 386]]),
        ('roof', [[88, 165], [322, 165], [322, 400], [88, 400]]),
        ('yao', [[153, 22], [250, 22], [250, 172], [153, 172]]),
    ], 'hand'),
    # écriture des clercs : stèle de Cao Quan 曹全碑 (Han orientaux, 185)
    'lishu': (16, '隸書', 'Han', [
        ('yao', [[172, 25], [262, 25], [262, 138], [172, 138]]),
        ('child', [[100, 174], [340, 174], [340, 392], [36, 392], [36, 318], [100, 318]]),
        ('roof', [[55, 143], [365, 143], [365, 200], [330, 200], [330, 172], [100, 172], [100, 235], [55, 235]]),
    ], 'hand'),
}
FORMS = json.load(open('assets/glyphs/xiaoxue/index.json'))['forms']
N = 1600  # résolution de travail (4 px par unité)


def ink_400(idx):
    """Encre de l'image n° idx, recadrée et centrée dans la boîte 400 (même cadrage que vectorize_xiaoxue)."""
    a = np.array(Image.open(f'assets/glyphs/xiaoxue/{idx:02d}.png').convert('RGBA'))
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


out = {}
for key, (idx, label, era, polys, default) in GLYPHS.items():
    ink = ink_400(idx)
    owner = np.full(ink.shape, '', dtype=object)
    for c, poly in polys:  # le premier polygone qui contient le pixel l'emporte
        m = Image.new('L', (N, N), 0)
        ImageDraw.Draw(m).polygon([(x * N / 400, y * N / 400) for x, y in poly], fill=255)
        owner[(np.array(m) > 0) & (owner == '')] = c
    owner[owner == ''] = default
    paths, centers = [], {}
    for c in [default] + [c for c, _ in polys]:
        mask = ink & (owner == c)
        if mask.sum() < 50: continue
        ys, xs = np.nonzero(mask)
        centers[c] = [round((xs.min() + xs.max()) / 2 * 400 / N, 1), round((ys.min() + ys.max()) / 2 * 400 / N, 1)]
        paths.append({'d': trace(mask), 'c': c, 'cut': []})
    out[key] = {'paths': paths, 'centers': centers, 'label': label, 'era': era, 'piece': FORMS[idx]['label']}

open('src/realglyphs.js', 'w').write(
    "// Formes historiques réelles de 學 — 小學堂字形演變資料庫 (Academia Sinica), CC0.\n"
    "// Généré par tools/build_real_glyphs.py — boîte 400 × 400, un tracé par composante.\n"
    "window.REALGLYPHS = " + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ";\n")
print({k: [p['c'] for p in v['paths']] for k, v in out.items()})
