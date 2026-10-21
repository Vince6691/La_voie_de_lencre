"""Ordre et forme réels des traits de 學 et 学 → src/strokes.js
Source : hanzi-writer-data (Make Me a Hanzi), licence Arphic Public License (assets/strokes/ARPHICPL.TXT)."""
import json

# composante de chaque trait, dans l'ordre d'écriture
COMP = {
    'xue_trad': ['hand'] * 4 + ['yao'] * 4 + ['hand'] * 3 + ['roof'] * 2 + ['child'] * 3,  # 16 traits
    'xue_simp': ['fusion'] * 3 + ['roof'] * 2 + ['child'] * 3,  # 8 traits
}
out = {}
for k, comp in COMP.items():
    d = json.load(open(f'assets/strokes/{k}.json'))
    assert len(d['strokes']) == len(comp), k
    out[k] = {'strokes': d['strokes'], 'medians': d['medians'], 'comp': comp}
open('src/strokes.js', 'w').write(
    "// Ordre et forme réels des traits (Make Me a Hanzi / hanzi-writer-data, Arphic Public License —\n"
    "// voir assets/strokes/ARPHICPL.TXT). Repère d'origine : boîte 1024, y vers le haut, ligne de base 900.\n"
    "window.STROKES = " + json.dumps(out, separators=(',', ':')) + ";\n")
print({k: len(v['strokes']) for k, v in out.items()})
