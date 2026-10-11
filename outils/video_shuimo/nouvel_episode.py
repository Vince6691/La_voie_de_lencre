"""Crée le dossier d'un nouvel épisode shuimo, toujours sur le même schéma (voir README) :
python3 nouvel_episode.py <pinyin> <caractère>   ex. : python3 nouvel_episode.py feng 風
→ episodes/<pinyin>/ avec PROPOSITION.md, VOIX.md, SOURCES.md, episode.json (copie du modèle) et les sous-dossiers."""
import json, os, sys

if len(sys.argv) != 3:
    raise SystemExit(__doc__)
pinyin, zi = sys.argv[1].lower(), sys.argv[2]
ICI = os.path.dirname(os.path.abspath(__file__))
E = os.path.join(ICI, '..', '..', 'episodes', pinyin)
if os.path.exists(E):
    raise SystemExit(f'existe déjà : {os.path.normpath(E)}')
for d in ['voix/mots', 'voix/prises', 'clips', 'images', 'audio', 'apercus']:
    os.makedirs(os.path.join(E, d))
    open(os.path.join(E, d, '.gitkeep'), 'w').close()
cfg = json.load(open(os.path.join(ICI, 'modele_episode.json'), encoding='utf-8'))
json.dump(cfg, open(os.path.join(E, 'episode.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
fichiers = {
    'PROPOSITION.md': f'# {zi} ({pinyin}) — proposition shuimo\n\n**Question :** \n**Réponse :** \n**Maxime :** \n\n## 1. Accroche — 0:00\n\n> plan : \n',
    'VOIX.md': f'# {zi} — textes envoyés au synthétiseur (ElevenLabs « Chinese narration », eleven_v4)\n'
               'Noms chinois en caractères (traditionnels si le simplifié existe aussi en japonais), nombres en lettres.\n\nb01: \n',
    'SOURCES.md': f'# {zi} — sources et points à vérifier\n\n- Shuowen jiezi : \n- 小學堂 (formes anciennes) : \n\n## Fait / hypothèse / légende\n',
}
for n, txt in fichiers.items():
    open(os.path.join(E, n), 'w', encoding='utf-8').write(txt)
print('créé :', os.path.normpath(E))
