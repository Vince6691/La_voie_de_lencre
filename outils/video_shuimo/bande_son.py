"""Bande son seule d'un épisode (voix calées sur la ligne de temps + musique) → <épisode>/apercus/bande_son.mp3
python3 bande_son.py ../../episodes/<pinyin>/episode.json — en quelques secondes, pour juger la voix sans rendu vidéo."""
import json, os, subprocess, sys
import imageio_ffmpeg
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from episode import charger

cfg = charger(sys.argv[1]); base = os.path.dirname(os.path.abspath(sys.argv[1]))
L = json.load(open(cfg['reperes'], encoding='utf-8'))['_ligne']
ff = imageio_ffmpeg.get_ffmpeg_exe()
ins, parts = [], []
for k, c in L['clips'].items():
    src = os.path.join(cfg['voix'], f'{k}.wav')
    p = c.get('pause')
    segs = [(0, None, c['debut'])] if not p else [(0, p['coupe'], c['debut']), (p['coupe'], None, c['debut'] + p['coupe'] + p['duree'])]
    for a, b, t in segs:
        i = len(ins) // 2; ins += ['-i', src]
        trim = f'atrim=start={a}' + (f':end={b}' if b else '') + ',asetpts=PTS-STARTPTS'
        parts.append(f'[{i}:a]{trim},adelay={int(t * 1000)}:all=1[v{i}]')
m = len(ins) // 2; ins += ['-i', cfg['musique']]
labels = ''.join(f'[v{j}]' for j in range(m))
graph = ';'.join(parts) + f';[{m}:a]volume=0.55[m];{labels}[m]amix=inputs={m + 1}:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5[o]'
out = os.path.join(base, 'apercus', 'bande_son.mp3'); os.makedirs(os.path.dirname(out), exist_ok=True)
subprocess.run([ff, '-y', '-loglevel', 'error', *ins, '-filter_complex', graph, '-map', '[o]', '-b:a', '160k', out], check=True)
print(out)
