"""Glyphes historiques réels (SVG zdic.net fournis dans assets/glyphs/, et lishu.svg vectorisé depuis
小學堂 par tools/vectorize_xiaoxue.py) → src/realglyphs.js

Chaque tracé sombre est rattaché à une composante (hand 𦥑, yao 爻, roof 冖, child 子) ; un tracé
qui en contient deux (ex. main gauche soudée au 爻 sur l'os) est découpé par un polygone `cut`.
Les filigranes (« ZDIC.NET », « 汉典 ») sont écartés : ce sont les tracés clairs.
Coordonnées : boîte 400 × 400 (viewBox d'origine)."""
import json, re
from svgpathtools import parse_path

GLYPHS = {
    # jiaguwen (os oraculaires, Shang) — une seule croix 乂 au centre, soudée à la main gauche
    'jiaguwen': {'src': 'jiaguwen.svg', 'comp': {8: 'roof', 9: 'hand', 10: 'hand'},
                 'cut': {9: [{'c': 'yao', 'poly': [[168, 50], [252, 50], [252, 182], [158, 182], [158, 150], [176, 136], [168, 90]]}]},
                 'label': '甲骨文', 'era': 'Shang'},
    # jinwen (bronzes, Zhou occidentaux) — 爻 à deux croix, l'enfant 子 sous le toit
    'jinwen': {'src': 'jinwen.svg', 'comp': {0: 'roof', 1: 'child', 2: 'hand', 3: 'hand', 4: 'yao', 5: 'yao'},
               'label': '金文', 'era': 'Zhou'},
    # zhanguo (Royaumes combattants) — forme régionale, haut et bas soudés
    'zhanguo': {'src': 'zhanguo.svg', 'comp': {2: 'top', 3: 'bottom'}, 'label': '戰國文字', 'era': 'Royaumes combattants'},
    # xiaozhuan (petit sceau, Qin)
    'xiaozhuan': {'src': 'xiaozhuan.svg', 'comp': {0: 'child', 1: 'roof', 2: 'yao', 3: 'hand', 4: 'hand'},
                  'label': '小篆', 'era': 'Qin'},
    # lishu (écriture des clercs) — stèle de Cao Quan 曹全碑, Han orientaux, 185 ; 小學堂 (Academia
    # Sinica), CC0 ; un seul tracé, composantes attribuées par polygones (reste : les deux mains)
    'lishu': {'src': 'lishu.svg', 'comp': {0: 'hand'},
              'cut': {0: [{'c': 'yao', 'poly': [[172, 25], [262, 25], [262, 138], [172, 138]]},
                          {'c': 'roof', 'poly': [[55, 143], [365, 143], [365, 200], [330, 200], [330, 172], [100, 172], [100, 235], [55, 235]]},
                          {'c': 'child', 'poly': [[100, 174], [340, 174], [340, 392], [36, 392], [36, 318], [100, 318]]}]},
              'label': '隸書', 'era': 'Han'},
}


def dark(fill):
    if not fill or not fill.startswith('#'): return True
    r, g, b = (int(fill[i:i + 2], 16) for i in (1, 3, 5))
    return r + g + b < 200


out = {}
for key, cfg in GLYPHS.items():
    s = open(f"assets/glyphs/{cfg['src']}").read()
    items = []
    for m in re.finditer(r'<g([^>]*)>(.*?)</g>|<path([^>]*)/>', s, re.S):
        if m.group(2) is not None:
            gf = re.search(r'fill="([^"]+)"', m.group(1))
            for pm in re.finditer(r'<path([^>]*)/>', m.group(2)):
                items.append((gf.group(1) if gf else None, pm.group(1)))
        else:
            items.append((None, m.group(3)))
    paths, boxes = [], {}
    for i, (gf, attrs) in enumerate(items):
        d = re.search(r'\bd="([^"]+)"', attrs).group(1)
        pf = re.search(r'fill="([^"]+)"', attrs)
        if not dark(pf.group(1) if pf else gf):
            continue  # filigrane
        c = cfg['comp'][i]
        x0, x1, y0, y1 = parse_path(d).bbox()
        boxes.setdefault(c, []).append((x0, y0, x1, y1))
        paths.append({'d': d, 'c': c, 'cut': cfg.get('cut', {}).get(i, [])})
    # centre approximatif de chaque composante (pour les étiquettes)
    centers = {}
    for c, bb in boxes.items():
        x0 = min(b[0] for b in bb); y0 = min(b[1] for b in bb); x1 = max(b[2] for b in bb); y1 = max(b[3] for b in bb)
        centers[c] = [round((x0 + x1) / 2, 1), round((y0 + y1) / 2, 1)]
    for p in paths:
        for cut in p['cut']:
            xs = [q[0] for q in cut['poly']]; ys = [q[1] for q in cut['poly']]
            centers[cut['c']] = [round((min(xs) + max(xs)) / 2, 1), round((min(ys) + max(ys)) / 2, 1)]
    out[key] = {'paths': paths, 'centers': centers, 'label': cfg['label'], 'era': cfg['era']}

open('src/realglyphs.js', 'w').write(
    "// Formes historiques réelles de 學 (images zdic.net vectorisées, fournies par l'auteur ; lishu : 小學堂, CC0).\n"
    "// Généré par tools/build_real_glyphs.py — boîte 400 × 400.\n"
    "window.REALGLYPHS = " + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ";\n")
print({k: [p['c'] for p in v['paths']] for k, v in out.items()})
