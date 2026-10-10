"""Repères image ↔ voix (version shuimo v2) : position d'un mot-clé estimée au prorata des caractères du texte
(shuimo_v2/VOIX.md), recalée sur le début de segment parlé le plus proche (assets/voice_sx/segments.json).
Écrit assets/voice_sx/cues_sx.json (copié dans remotion/src/data par sync.mjs) : {clip: {duration, cues: {nom: t}}}."""
import json, os, re
X = os.path.join(os.path.dirname(__file__), '..')
seg = json.load(open(f'{X}/assets/voice_sx/segments.json'))
txt = dict(re.findall(r'^(b\d\d): (.*)$', open(f'{X}/shuimo_v2/VOIX.md').read(), re.M))
CUES = {
  'b01': {'mains': 'deux mains', 'ou': 'Où sont'},
  'b02': {'huit': 'huit traits', 'seize': 'Il en fallait', 'retrouver': 'Pour les retrouver'},
  'b03': {'devins': 'Les devins', 'signe': "C'est là", 'yao': 'Au centre', 'toit': 'Dessous', 'mains': 'Et de chaque', 'manque': 'Pourtant'},
  'b04': {'bronze': 'Leurs inscriptions', 'enfant': 'Et sous le toit', 'dit': 'Cette fois', 'vase': "Sur l'un"},
  'b05': {'royaumes': 'Jusque-là', 'ministre': 'Son ministre', 'symetrie': 'Les courbes', 'mains': 'Les deux mains'},
  'b06': {'lettre': 'Il s\'appelle', 'livre': 'Son livre', 'definition': 'Notre signe', 'toit': 'Et le toit'},
  'b07': {'aplatit': 'Le pinceau aplatit', 'figent': 'Les deux mains se figent', 'reguliere': "L'écriture régulière", 'copies': 'Au fil des copies', 'reponse': "Les mains n'ont pas"},
  'b08': {'huit': 'Huit traits', 'pinceau': 'Alors le pinceau', 'baguettes': 'des baguettes', 'toit': 'un toit pour', 'mains': 'deux mains pour', 'enfant': 'un enfant pour', 'nait': 'Ainsi naît', 'ecole': 'On le lit', 'mots': 'Il ouvre', 'reconnaitre': 'Pour le reconnaître'},
  'b09': {'geste': 'Pas du geste', 'depuis': 'Depuis trois', 'autre': 'Ces baguettes', 'baton': 'Mais cette fois'},
}
out = {}
for clip, cues in CUES.items():
    T, s = txt[clip], seg[clip]
    res = {}
    for name, key in cues.items():
        i = T.index(key)
        est = s['duration'] * i / len(T)
        near = min(s['starts'], key=lambda v: abs(v - est))
        t = near if abs(near - est) < 1.2 and near not in res.values() else round(est, 2)
        res[name] = t
    out[clip] = {'duration': s['duration'], 'cues': res}
json.dump(out, open(f'{X}/assets/voice_sx/cues_sx.json', 'w'), indent=1)
for k, v in out.items(): print(k, v)
