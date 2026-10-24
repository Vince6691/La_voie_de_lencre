"""Sous-titres français (.srt) d'un épisode pour YouTube, d'après le minutage mot à mot ElevenLabs Scribe
(voix/mots/bNN.json) recalé sur la ligne de temps du montage (voix/reperes.json, _ligne) : même calcul que reperes.py
(silence de tête rogné, tempo, pause insérée dans un clip). Une réplique ≤ 2 lignes de 42 caractères, ≤ 6 s, coupée
de préférence sur la ponctuation. Écrit episodes/<p>/rendu/<p>_fr.srt.
Usage : python sous_titres.py episode.json"""
import json, os, re, subprocess, sys
import imageio_ffmpeg
from episode import charger

cfg = charger(sys.argv[1])
D, TEMPO = cfg['voix'], cfg.get('tempo', 1)
L = json.load(open(cfg['reperes'], encoding='utf-8'))['_ligne']
FF = imageio_ffmpeg.get_ffmpeg_exe()
LIGNE, MAX_C, MAX_S = 42, 84, 6.0


def tete(mp3):  # silence de tête rogné par voix_prep.py (seuil −45 dB), comme reperes.py
    err = subprocess.run([FF, '-hide_banner', '-i', mp3, '-af', 'silencedetect=noise=-45dB:d=0.02', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'silence_start: 0(?:\.0+)?\n.*?silence_end: ([\d.]+)', err, re.S)
    return float(m.group(1)) if m else 0.0


mots = []  # (texte, début, fin) en temps absolu de la vidéo
for clip, c in L['clips'].items():
    off, p = tete(f'{D}/{clip}.mp3'), c.get('pause')
    for w in json.load(open(f'{D}/mots/{clip}.json', encoding='utf-8'))['words']:
        if w['type'] != 'word' or not w['text'].strip(): continue
        a, b = (w['start'] - off) / TEMPO, (w['end'] - off) / TEMPO
        dec = p['duree'] if p and a > p['coupe'] else 0
        mots.append((w['text'].strip(), c['debut'] + a + dec, c['debut'] + b + dec))

repliques, cur = [], []
for i, m in enumerate(mots):
    cur.append(m)
    txt = ' '.join(x[0] for x in cur)
    nxt = mots[i + 1] if i + 1 < len(mots) else None
    fin_phrase = re.search(r'[.!?…]$', m[0])
    virgule = re.search(r'[,;:]$', m[0])
    if (nxt is None or nxt[1] - m[2] > 0.6 or (fin_phrase and len(txt) >= 12) or (virgule and len(txt) >= 50)
            or m[2] - cur[0][1] >= MAX_S or len(txt + ' ' + nxt[0]) > MAX_C):
        repliques.append(cur); cur = []


def lignes(t):  # deux lignes équilibrées si trop long
    if len(t) <= LIGNE: return t
    sp = [k for k, ch in enumerate(t) if ch == ' ' and k <= LIGNE and len(t) - k - 1 <= LIGNE] or [k for k, ch in enumerate(t) if ch == ' ']
    ponct = [k for k in sp if t[k - 1] in ',;:.…' and abs(k - len(t) / 2) <= 14]  # après la ponctuation si possible
    k = min(ponct or sp, key=lambda k: abs(k - len(t) / 2))
    return t[:k] + '\n' + t[k + 1:]


hms = lambda s: f'{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round(s % 1 * 1000)) % 1000:03d}'
out = []
for k, r in enumerate(repliques):
    a, b = r[0][1], r[-1][2] + 0.3
    if k + 1 < len(repliques): b = min(b, repliques[k + 1][0][1] - 0.05)
    b = max(b, a + 1.0)
    out.append(f'{k + 1}\n{hms(a)} --> {hms(b)}\n{lignes(" ".join(x[0] for x in r))}\n')
p = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rendu')
os.makedirs(p, exist_ok=True)
f = os.path.join(p, f"{os.path.basename(os.path.dirname(os.path.abspath(sys.argv[1])))}_fr.srt")
open(f, 'w', encoding='utf-8').write('\n'.join(out))
print(f'{len(out)} répliques → {f}')
