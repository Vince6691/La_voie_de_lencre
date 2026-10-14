"""Fond musical d'un épisode, calé sur sa ligne de temps (fichier « reperes » de reperes.py) : bourdon ré–la qui
respire, notes de guzheng pentatoniques espacées (Karplus–Strong), souffle léger ; creux sous les rouleaux du temps et
pendant les pauses ; coupé net à la fin, une note grave sur l'écran de fin. Usage : python3 musique.py episode.json"""
import json, os, sys, wave
import numpy as np
from scipy.signal import lfilter
from episode import charger

cfg = charger(sys.argv[1])
L = json.load(open(cfg['reperes'], encoding='utf-8'))['_ligne']
END, TOTAL = L['fin'], L['total']
SR = 44100; N = int(TOTAL * SR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
f = lambda m: 440 * 2 ** ((m - 69) / 12)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], lfilter([1 - a], [1, -a], x))


drone = sum(g * np.sin(2 * np.pi * f(m) * t + 0.3 * np.sin(2 * np.pi * 0.07 * t + m)) for m, g in [(38, 0.5), (45, 0.32), (50, 0.22), (57, 0.08)])
drone *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 11) ** 2
air = lp(rng.standard_normal(N), 900) * 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 17) ** 2)
bed = 0.16 * drone + 0.05 * air


def pluck(freq, dur=3.5):
    n = int(dur * SR); P = int(SR / freq); buf = rng.uniform(-1, 1, P); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % P]; buf[i % P] = 0.996 * 0.5 * (buf[i % P] + buf[(i + 1) % P])
    return out * np.exp(-np.arange(n) / SR / 1.4)


scale = [62, 64, 66, 69, 71, 74, 76, 78, 81]
tt = 2.0
while tt < END - 2:
    m = scale[rng.integers(0, len(scale))]
    for k, dm in enumerate([0] + ([scale[min(len(scale) - 1, scale.index(m) + 1)] - m] if rng.random() < 0.3 else [])):
        p = pluck(f(m + dm)); i = int((tt + 0.32 * k) * SR); j = min(N, i + len(p)); bed[i:j] += 0.09 * p[:j - i]
    tt += rng.uniform(2.5, 5.0)

env = np.clip(t / 3, 0, 1)
for r in L['rouleaux']:
    a, b = r['debut'], r['debut'] + r['duree']
    env *= 1 - 0.85 * np.clip(np.minimum((t - a + 0.6) / 0.6, (b + 0.8 - t) / 0.8), 0, 1)
for a, d in L['pauses']:
    env *= 1 - 0.7 * np.clip(np.minimum((t - a) / 0.3, (a + d + 0.2 - t) / 0.5), 0, 1)
# coupures nettes (episode.json « coupures » : [[bloc, repère|null, décalage, bloc, repère|null, décalage]…]) :
# la musique se coupe d'un coup (0,05 s) au premier point et revient doucement (1,5 s) au second — ex. le figé du 美
_rep = json.load(open(cfg['reperes'], encoding='utf-8'))
def _abs(b, r, d):
    c = _rep['_ligne']['clips'][b]; v = 0 if r is None else _rep[b]['cues'][r]
    return c['debut'] + v + d + (c['pause']['duree'] if c.get('pause') and v > c['pause']['coupe'] else 0)
for b1, r1, d1, b2, r2, d2 in cfg.get('coupures', []):
    a, b = _abs(b1, r1, d1), _abs(b2, r2, d2)
    env *= 1 - np.clip(np.minimum((t - a) / 0.05, (b + 1.5 - t) / 1.5), 0, 1)
env[t >= END] = 0
bed *= env
i = int((END + 0.15) * SR); g = pluck(f(50), 3.0) * 0.18; bed[i:i + len(g)] += g[:N - i]
bed = bed / np.max(np.abs(bed)) * 0.5
os.makedirs(os.path.dirname(cfg['musique']), exist_ok=True)
w = wave.open(cfg['musique'], 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((bed * 32767).astype(np.int16).tobytes()); w.close()
print(os.path.basename(cfg['musique']), round(TOTAL, 2), 's')
