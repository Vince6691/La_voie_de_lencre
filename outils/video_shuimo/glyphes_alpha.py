"""Formes anciennes de plusieurs caractères (小學堂, CC0) en PNG à fond transparent, prêtes à être teintées dans le canvas.
python3 glyphes_alpha.py <dossier_sortie> <préfixe> <caractères> [écriture=甲骨文]
Pour chaque caractère : xiaoxue.py (dans <dossier_sortie>/src/<caractère>), première forme dont la police contient l'écriture
demandée, noir sur transparent ou sur blanc → alpha (l'encre devient l'opacité), recadrée, 256 px de haut → <dossier_sortie>/<préfixe>_<n>.png (n = rang
dans la liste) et <préfixe>.json (caractère, étiquette de la forme choisie).
Exemple (os d'exercice du 教) : python3 glyphes_alpha.py ../../episodes/jiao/images ganzhi 甲子乙丑丙寅丁卯戊辰己巳"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

out, pre, chars = sys.argv[1:4]
ecr = sys.argv[4] if len(sys.argv) > 4 else '甲骨文'
here = os.path.dirname(os.path.abspath(__file__))
res = []
for n, c in enumerate(chars):
    src = os.path.join(out, 'src', c)
    if not os.path.exists(os.path.join(src, 'index.json')):
        subprocess.run([sys.executable, os.path.join(here, 'xiaoxue.py'), c, src], check=True, capture_output=True)
    idx = json.load(open(os.path.join(src, 'index.json'), encoding='utf-8'))
    f = next((f for f in idx['forms'] if ecr in f['font']), None)
    if f is None:
        print(c, ': aucune forme', ecr); continue
    im0 = Image.open(os.path.join(src, f['file']))
    if im0.mode == 'RGBA' and np.asarray(im0)[..., 3].min() < 250:  # 小學堂 : encre noire sur fond transparent
        a = np.asarray(im0)[..., 3].astype(np.float32) / 255
    else:  # noir sur blanc → alpha
        a = np.clip((0.92 - np.asarray(im0.convert('L')).astype(np.float32) / 255) / 0.5, 0, 1)
    ys, xs = np.nonzero(a > 0.2)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    im = np.zeros(a.shape + (4,), np.uint8); im[..., 3] = (a * 255).astype(np.uint8)
    im = Image.fromarray(im, 'RGBA'); k = 256 / im.height
    im.resize((max(1, round(im.width * k)), 256), Image.LANCZOS).save(os.path.join(out, f'{pre}_{n}.png'))
    res.append({'caractere': c, 'rang': n, 'forme': f['label'], 'police': f['font']})
    print(c, f['label'])
json.dump(res, open(os.path.join(out, f'{pre}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
