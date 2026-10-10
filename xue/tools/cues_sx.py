"""Repères image ↔ voix (version shuimo v2) : début exact du premier mot de chaque expression-clé, d'après le minutage
mot à mot de la transcription ElevenLabs Scribe (assets/voice_sx/mots/bNN.json), moins le silence de tête retiré
par prep_voice_sx.py. Écrit assets/voice_sx/cues_sx.json (copié dans remotion/src/data par sync.mjs) :
{clip: {duration, cues: {nom: t}}}."""
import json, os, re, subprocess
import imageio_ffmpeg
X = os.path.join(os.path.dirname(__file__), '..')
D = f'{X}/assets/voice_sx'
seg = json.load(open(f'{D}/segments.json'))
CUES = {
  'b01': {'mains': 'deux mains', 'ou': 'Où sont'},
  'b02': {'huit': 'huit traits', 'seize': 'Il en fallait', 'retrouver': 'Pour les retrouver'},
  'b03': {'devins': 'Les devins', 'signe': "C'est là", 'yao': 'Au centre', 'toit': 'Dessous', 'mains': 'Et de chaque', 'manque': 'Pourtant'},
  'b04': {'bronze': 'Leurs inscriptions', 'enfant': 'Et sous le toit', 'dit': 'Cette fois', 'vase': "Sur l'un"},
  'b05': {'royaumes': 'Jusque-là', 'ministre': 'Son ministre', 'symetrie': 'Les courbes', 'mains': 'Les deux mains'},
  'b06': {'lettre': "Il s'appelle", 'livre': 'Son livre', 'definition': 'Notre signe', 'toit': 'Et le toit'},
  'b07': {'aplatit': 'Le pinceau aplatit', 'figent': 'Les deux mains se figent', 'reguliere': "L'écriture régulière", 'copies': 'Au fil des copies', 'reponse': "Les mains n'ont pas"},
  'b08': {'huit': 'Huit traits', 'pinceau': 'Alors le pinceau', 'baguettes': 'des baguettes', 'toit': 'un toit pour', 'mains': 'deux mains pour', 'enfant': 'un enfant pour', 'nait': 'Ainsi naît', 'ecole': 'On le lit', 'mots': 'Il ouvre', 'reconnaitre': 'Pour le reconnaître'},
  'b09': {'geste': 'Pas du geste', 'depuis': 'Depuis trois', 'autre': 'Ces baguettes', 'baton': 'Mais cette fois'},
}
norm = lambda w: re.sub(r"[^\w']", '', w.lower())
FF = imageio_ffmpeg.get_ffmpeg_exe()

def lead(mp3):  # silence de tête retiré par prep_voice_sx.py (seuil −45 dB)
    out = subprocess.run([FF, '-hide_banner', '-i', mp3, '-af', 'silencedetect=noise=-45dB:d=0.02', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'silence_start: 0(?:\.0+)?\n.*?silence_end: ([\d.]+)', out, re.S)
    return float(m.group(1)) if m else 0.0

out = {}
for clip, cues in CUES.items():
    words = [w for w in json.load(open(f'{D}/mots/{clip}.json'))['words'] if w['type'] == 'word' and norm(w['text'])]
    toks = [norm(w['text']) for w in words]
    off = lead(f'{D}/{clip}.mp3')
    res, k0 = {}, 0
    for name, key in cues.items():
        kt = [norm(k) for k in key.split()]
        for i in range(k0, len(toks)):
            if i + len(kt) <= len(toks) and all(toks[i + j].startswith(k) for j, k in enumerate(kt)):
                res[name] = round(max(0, words[i]['start'] - off), 2); k0 = i + 1; break
        else:
            raise SystemExit(f'{clip} : « {key} » introuvable')
    out[clip] = {'duration': seg[clip]['duration'], 'cues': res}
json.dump(out, open(f'{D}/cues_sx.json', 'w'), indent=1)
for k, v in out.items(): print(k, v['cues'])
