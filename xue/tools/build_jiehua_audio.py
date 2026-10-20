"""Bande son de la séquence 界畫 « le canevas au crayon » (remotion/src/jiehua3d/JiehuaCanevas.tsx, 16 s) :
1. bruitages ElevenLabs (assets/jiehua/src/*_N.mp3, 4 variantes chacun) → une variante retenue par son, normalisée,
   fondue → assets/jiehua/<nom>.wav ; gong et sceau repris de l'épisode 教 ;
2. musique de synthèse, calée sur l'image : bourdon ré–la et guzheng épars pendant le dessin (0–6 s) ; taiko, cordes
   graves qui enflent et flûte xiao pendant l'assemblage (6,6–9,9 s) ; apogée quand le toit se pose (9,87 s) ;
   glissando de guzheng sur les filets d'or (10,6 s) ; grand accord tenu pendant la grue arrière ; note de guqin sur
   le sceau (14,6 s) → assets/jiehua/musique.wav.
python3 tools/build_jiehua_audio.py (depuis xue/), puis node sync.mjs dans remotion/"""
import glob, os, subprocess, wave
import numpy as np
from scipy.signal import butter, lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'jiehua')
SR = 48000
rng = np.random.default_rng(11)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def save(name, x, stereo=True):
    x = np.clip(x, -1, 1)
    st = np.stack([x, np.roll(x, 29)], 1) if stereo else x[:, None]
    with wave.open(os.path.join(OUT, name), 'w') as w:
        w.setnchannels(st.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


# ---- 1. bruitages : la variante la plus franche (attaque nette pour les impacts, présence régulière sinon) ----
def score(x, impact):
    env = np.convolve(np.abs(x), np.ones(480) / 480, 'same')
    if impact:   # pic tôt et fort, queue qui retombe vite
        p = int(np.argmax(env)); tail = env[min(len(env) - 1, p + SR // 3):].mean() + 1e-6
        return env[p] / tail - p / SR * 4
    act = env > 0.15 * env.max()   # son présent tout du long, sans trou
    return act.mean() + 0.2 * np.sqrt((x ** 2).mean())


SFX = {'crayon': False, 'souffle': False, 'bois': True, 'clic': True, 'toit': True, 'pinceau': False, 'or': False}
for name, impact in SFX.items():
    vs = sorted(glob.glob(os.path.join(OUT, 'src', f'{name}_*.mp3')))
    best = max(vs, key=lambda v: score(load(v), impact))
    x = load(best)
    x = x / (np.sqrt((x ** 2).mean()) + 1e-9) * (0.12 if impact else 0.08)   # niveau moyen commun
    x = x / max(1, np.abs(x).max() / 0.9)
    n = len(x); f = np.ones(n); k = int(0.03 * SR); f[:k] = np.linspace(0, 1, k); f[-4 * k:] = np.linspace(1, 0, 4 * k)
    save(f'{name}.wav', x * f)
    print(name, '←', os.path.basename(best))
for name in ['gong', 'sceau']:
    src = os.path.join(HERE, '..', '..', 'episodes', 'jiao', 'audio', f'sfx_{name}.wav')
    save(f'{name}.wav', load(src))

# ---- 2. musique ----
TOTAL = 16.0
N = int(TOTAL * SR); t = np.arange(N) / SR
f = lambda m: 440 * 2 ** ((m - 69) / 12)
seg = lambda a, b, fa=0.4, fb=0.6: np.clip(np.minimum((t - a) / fa, (b - t) / fb), 0, 1)   # rampe d'entrée et sortie


def lp(x, fc):
    b, a = butter(2, fc / (SR / 2)); return lfilter(b, a, x)


def pluck(freq, dur=3.0, decay=1.3, bright=0.996):
    n = int(dur * SR); P = max(2, int(SR / freq)); buf = rng.uniform(-1, 1, P); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % P]; buf[i % P] = bright * 0.5 * (buf[i % P] + buf[(i + 1) % P])
    return out * np.exp(-np.arange(n) / SR / decay)


def put(x, at, gain):
    i = int(at * SR); j = min(N, i + len(x))
    if i < N: mix[i:j] += gain * x[:j - i]


mix = np.zeros(N)
# bourdon ré–la, toujours là, qui s'ouvre avec l'assemblage
drone = sum(g * np.sin(2 * np.pi * f(m) * t + 0.3 * np.sin(2 * np.pi * 0.07 * t + m)) for m, g in [(38, 0.5), (45, 0.32), (50, 0.2)])
mix += 0.14 * drone * (0.6 + 0.4 * np.clip((t - 6) / 4, 0, 1)) * np.clip(t / 1.5, 0, 1)
# guzheng épars pendant le dessin (pentatonique de ré)
scale = [62, 64, 66, 69, 71, 74, 76, 78, 81]
for at, m in [(0.6, 69), (1.9, 74), (2.6, 71), (3.8, 76), (4.5, 74), (5.4, 78)]:
    put(pluck(f(m)), at, 0.1)
# cordes graves : accord ré–la–ré–fa# qui enfle de 6,4 s à l'apogée, puis grand accord tenu jusqu'à la fin
def pad(notes, env):
    s = np.zeros(N)
    for m in notes:
        for h in range(1, 7):
            s += np.sin(2 * np.pi * f(m) * h * t * (1 + 0.0015 * np.sin(2 * np.pi * 5.2 * t + h)) + h) / h ** 1.3
    return lp(s, 1800) * env
mix += 0.035 * pad([38, 45, 50, 54], np.clip((t - 6.4) / 3.4, 0, 1) ** 1.5 * seg(6.4, 10.3, 0.5, 0.6))
mix += 0.04 * pad([38, 45, 50, 57, 62], seg(9.85, 16.0, 0.08, 1.6) * (0.75 + 0.25 * np.exp(-(t - 9.85) / 1.5)))
# taiko : battue qui s'accélère pendant l'assemblage, trois grands coups sur le toit
def taiko(gain, low=55):
    n = int(1.2 * SR); u = np.arange(n) / SR
    body = np.sin(2 * np.pi * (low * u + 40 * (1 - np.exp(-u * 18)) / 18)) * np.exp(-u * 5.5)
    skin = lp(rng.standard_normal(n), 900) * np.exp(-u * 30) * 0.35
    return gain * (body + skin)
beats, tb = [], 6.6
while tb < 9.6:
    beats.append(tb); tb += 0.75 - 0.33 * (tb - 6.6) / 3.0
for k, b in enumerate(beats):
    put(taiko(0.2 + 0.35 * k / len(beats)), b, 1)
for k, b in enumerate([9.62, 9.87, 10.12]):
    put(taiko(0.75 if k == 1 else 0.5, 48), b, 1)
# flûte xiao : phrase pentatonique au-dessus de l'assemblage (sinus + souffle + vibrato)
def flute(m, dur, gain):
    n = int(dur * SR); u = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.0 * u) * np.clip(u / 0.4, 0, 1)
    ph = 2 * np.pi * np.cumsum(f(m) * vib) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + lp(rng.standard_normal(n), 2500) * 0.08
    env = np.clip(u / 0.12, 0, 1) * np.clip((dur - u) / 0.35, 0, 1)
    return gain * tone * env
for at, m, d in [(7.0, 69, 0.9), (7.9, 74, 0.6), (8.5, 76, 0.5), (9.0, 78, 0.5), (9.5, 81, 1.4), (11.0, 78, 0.8), (11.8, 74, 2.2)]:
    put(flute(m, d, 0.07), at, 1)
# glissando de guzheng sur les filets d'or
for k, m in enumerate(scale + [83, 86]):
    put(pluck(f(m), 2.2, 1.0), 10.6 + 0.055 * k, 0.07)
# note de guqin (grave, ronde) sur le sceau, puis l'accord s'éteint
put(pluck(f(43), 3.5, 2.0, 0.998), 14.6, 0.22)
mix *= np.clip((TOTAL - t) / 0.6, 0, 1)
mix = mix / np.abs(mix).max() * 0.6
save('musique.wav', mix)
print('musique.wav', TOTAL, 's')
