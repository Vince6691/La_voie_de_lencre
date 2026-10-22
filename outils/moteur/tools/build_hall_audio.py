"""Bande son du panel d'évolution « L'édifice qui change » (remotion/src/hall/HallEvolution.tsx), mixée d'après la chronologie exacte
de l'animation (assets/hall/events.json, exportée par remotion/exportHallEvents.mjs depuis src/hall/events.ts) :
- chaque pièce sonne à l'instant où elle se pose : bois grave pour les colonnes, clics secs pour les consoles, grondement du toit,
  impact lourd pour l'étage qui tombe ;
- chaque sceau d'époque est frappé (« tac » + cloche de bronze du rouleau 3D + reflet d'or) ; souffle sous chaque mouvement de caméra ;
- musique de synthèse : bourdon (ré), pincements de guzheng sur une gamme pentatonique (ré, mi, sol, la — une note par époque),
  accord final et flûte xiao ; gong à l'arrivée aux Qing.
Bruitages : assets/hall/src/<nom>_N.mp3 (ElevenLabs, repris du pavillon 界畫), assets/rouleau3d/{cloche,impact}.wav, assets/rouleau/gong.wav.
Usage (depuis outils/moteur/) : node remotion/exportHallEvents.mjs puis python3 tools/build_hall_audio.py → assets/hall/bande.wav ;
node sync.mjs dans remotion/."""
import json, os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '..', 'assets')
OUT = os.path.join(A, 'hall')
SR = 48000
rng = np.random.default_rng(23)
EV = json.load(open(os.path.join(OUT, 'events.json')))
TOTAL = EV['total']
N = int(TOTAL * SR)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))


def hp(x, fc):
    return x - lp(x, fc)


def norm(x, peak=0.9):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


def trim(x, sec, fade=0.04):
    y = x[: int(sec * SR)].copy()
    k = min(len(y), int(fade * SR))
    if k: y[-k:] *= np.linspace(1, 0, k)
    return y


def pitch(x, f):
    """changement de hauteur (et de durée) par rééchantillonnage : f > 1 plus aigu."""
    idx = np.arange(0, len(x) - 1, f)
    return np.interp(idx, np.arange(len(x)), x)


# ---- bruitages ----
def sfx(name):
    return norm(load(os.path.join(OUT, 'src', f'{name}.mp3')))


S = {
    'bois': [trim(sfx(f'bois_{i}'), 0.7) for i in (1, 2, 3, 4)],
    'clic': [trim(sfx(f'clic_{i}'), 0.3) for i in (1, 2, 3, 4)],
    'toit': [trim(sfx(f'toit_{i}'), 1.5, 0.3) for i in (1, 2, 3, 4)],
    'or': [trim(sfx(f'or_{i}'), 1.3, 0.3) for i in (1, 2, 3, 4)],
    'souffle': [trim(sfx(f'souffle_{i}'), 1.7, 0.5) for i in (1, 2, 3, 4)],
    'pinceau': [trim(sfx(f'pinceau_{i}'), 1.2, 0.3) for i in (1, 2, 3, 4)],
}
impact = norm(load(os.path.join(A, 'rouleau3d', 'impact.wav')))
cloche = norm(load(os.path.join(A, 'rouleau3d', 'cloche.wav')))
gong = norm(load(os.path.join(A, 'rouleau', 'gong.wav')))
S['impact'] = [trim(impact, 1.6, 0.4)]
S['cloche'] = [trim(cloche, 3.0, 0.8)]
S['gong'] = [trim(gong, 3.2, 0.9)]
S['tac'] = [trim(hp(impact, 500), 0.22, 0.08)]           # coup sec du sceau
GAIN = {'bois': 0.8, 'clic': 0.7, 'toit': 0.8, 'or': 0.55, 'souffle': 0.55, 'pinceau': 0.5, 'impact': 0.95, 'cloche': 0.55, 'gong': 0.6, 'tac': 0.9}

L = np.zeros(N + 4 * SR); R = np.zeros(N + 4 * SR)


def put(x, t, gain, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= len(L): return
    x = x[: len(L) - i]
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(x)] += x * gain * gl * 1.41
    R[i:i + len(x)] += x * gain * gr * 1.41


# ---- musique : pincement de guzheng (Karplus-Strong) et flûte ----
def pluck(freq, dur=2.6, decay=0.996):
    n = int(dur * SR); P = int(SR / freq)
    buf = rng.uniform(-1, 1, P) * np.hanning(P) ** 0.3
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % P]
        buf[i % P] = decay * 0.5 * (buf[i % P] + buf[(i + 1) % P])
    return norm(lp(out, 5200), 0.8) * np.exp(-np.arange(n) / SR / 1.6)


def xiao(freq, dur, vib=5.5):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.5)
    ph = 2 * np.pi * freq * t + 0.012 * np.sin(2 * np.pi * vib * t) * freq / 8
    return (np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * rng.standard_normal(len(t))) * env * 0.5


def drone():
    t = np.arange(N) / SR
    x = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in [(73.42, 1.0, 0.0), (110.0, 0.55, 1.3), (146.83, 0.35, 2.1), (73.9, 0.5, 0.7)])
    x *= 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + 0.4)
    env = np.minimum(1, t / 1.8) * (0.8 + 0.5 * np.clip((t - 8.6) / 0.6, 0, 1)) * np.minimum(1, (TOTAL - t) / 0.5)
    return lp(x * env * 0.07, 600)


# ---- placement des événements ----
count = {}
for e in EV['events']:
    k, t, v = e['k'], e['t'], e['v']
    if k == 'note':
        f = e['f']
        put(pluck(f), t, 0.5 * v, rng.uniform(-0.2, 0.2))
        put(pluck(f * 2, 1.8), t + 0.01, 0.16 * v, rng.uniform(-0.4, 0.4))
        if e.get('n') == 4:                                  # accord final : ré, la, ré aigu et flûte xiao
            for ff, g in [(f / 2, 0.45), (f / 2 * 1.5, 0.35), (f * 1.5, 0.2)]:
                put(pluck(ff, 3.0, 0.997), t + 0.03, g * v, rng.uniform(-0.3, 0.3))
            put(xiao(f * 2, 0.95), 9.1, 0.12 * v, 0.1)
        continue
    variants = S[k]
    c = count.get(k, 0); count[k] = c + 1
    x = variants[(c + int(t * 7)) % len(variants)]
    f = e.get('f') or rng.uniform(0.93, 1.07)
    x = pitch(x, f)
    put(x, t, GAIN[k] * v, rng.uniform(-0.35, 0.35))

M = drone()
for ch in (L, R):
    ch[:N] += M * 0.9

# ---- master ----
out = np.stack([L[:N], R[:N]], 1)
out = np.tanh(out * 0.9) / np.tanh(0.9)                        # compression douce
out *= 0.89 / max(np.abs(out).max(), 1e-6)
fi, fo = int(0.03 * SR), int(0.3 * SR)
out[:fi] *= np.linspace(0, 1, fi)[:, None]; out[-fo:] *= np.linspace(1, 0, fo)[:, None]
with wave.open(os.path.join(OUT, 'bande.wav'), 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('bande.wav', round(len(out) / SR, 2), 's', {k: count.get(k, 0) for k in count})
