"""Repères de chapitres YouTube d'un épisode : début de chaque bloc de voix et de chaque rouleau du temps (voix/reperes.json,
_ligne), avec la première phrase dite à cet instant (rendu/<p>_fr.srt, voir sous_titres.py). Sert à écrire les chapitres
de la description (skill description-youtube) ; les titres restent à rédiger.
Usage : python chapitres.py episode.json"""
import json, os, re, sys
from episode import charger

cfg = charger(sys.argv[1])
L = json.load(open(cfg['reperes'], encoding='utf-8'))['_ligne']
p = os.path.basename(os.path.dirname(os.path.abspath(sys.argv[1])))
srt = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rendu', f'{p}_fr.srt')
rep = []  # (début en s, texte)
if os.path.exists(srt):
    for bloc in open(srt, encoding='utf-8').read().strip().split('\n\n'):
        l = bloc.split('\n')
        h, m, s = re.match(r'(\d+):(\d+):(\d+),', l[1]).groups()
        rep.append((int(h) * 3600 + int(m) * 60 + int(s), ' '.join(l[2:])))
phrase = lambda t: next((x for a, x in rep if a >= t - 1), '')
mmss = lambda t: f'{int(t // 60)}:{int(t % 60):02d}'
ev = [(c['debut'], f'voix {k}') for k, c in L['clips'].items()] + [(r['debut'], f"rouleau {r.get('modele', '2d')}") for r in L['rouleaux']]
ev.append((L['fin'], 'écran de fin'))
for t, quoi in sorted(ev):
    print(f'{mmss(t):>5}  {quoi:<20} {phrase(t)[:70]}')
print(f"durée totale {mmss(L['total'])} — YouTube : premier chapitre à 0:00, au moins 3 chapitres, chacun ≥ 10 s")
