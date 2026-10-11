"""Repères image ↔ voix d'un épisode : début exact du premier mot de chaque expression-clé (reperes_cles), d'après
le minutage mot à mot ElevenLabs Scribe (voix/mots/bNN.json), moins le silence de tête rogné par voix_prep.py ; puis
ligne de temps absolue (episode.ligne_de_temps). Écrit le fichier « reperes » :
{bNN: {duration, cues: {nom: t}}, …, "_ligne": {clips, rouleaux, pauses, fin, total}}.
Usage : python3 reperes.py episode.json"""
import json, os, re, subprocess, sys
import imageio_ffmpeg
from episode import charger, ligne_de_temps

cfg = charger(sys.argv[1])
D = cfg['voix']
seg = json.load(open(f'{D}/segments.json'))
FF = imageio_ffmpeg.get_ffmpeg_exe()
norm = lambda w: re.sub(r"[^\w']", '', w.lower())


def tete(mp3):  # silence de tête rogné par voix_prep.py (seuil −45 dB)
    err = subprocess.run([FF, '-hide_banner', '-i', mp3, '-af', 'silencedetect=noise=-45dB:d=0.02', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'silence_start: 0(?:\.0+)?\n.*?silence_end: ([\d.]+)', err, re.S)
    return float(m.group(1)) if m else 0.0


out = {}
for clip, cles in cfg['reperes_cles'].items():
    mots = [w for w in json.load(open(f'{D}/mots/{clip}.json', encoding='utf-8'))['words'] if w['type'] == 'word' and norm(w['text'])]
    toks, off, res, k0 = [norm(w['text']) for w in mots], tete(f'{D}/{clip}.mp3'), {}, 0
    for nom, expr in cles.items():
        kt = [norm(k) for k in expr.split()]
        for i in range(k0, len(toks)):
            if i + len(kt) <= len(toks) and all(toks[i + j].startswith(k) for j, k in enumerate(kt)):
                res[nom] = round(max(0, mots[i]['start'] - off), 2); k0 = i + 1; break
        else:
            raise SystemExit(f'{clip} : « {expr} » introuvable dans la transcription')
    out[clip] = {'duration': seg[clip]['duration'], 'cues': res}
out['_ligne'] = ligne_de_temps(cfg, {c: v['duration'] for c, v in out.items()}, {c: v['cues'] for c, v in out.items()})
os.makedirs(os.path.dirname(cfg['reperes']), exist_ok=True)
json.dump(out, open(cfg['reperes'], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
L = out['_ligne']
print('clips :', {c: v['debut'] for c, v in L['clips'].items()})
print('rouleaux :', L['rouleaux'], '· fin', L['fin'], '· total', L['total'])
