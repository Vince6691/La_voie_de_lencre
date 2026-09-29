"""Bande-son : musique procédurale (bourdon, cordes, guzheng, taiko), bruitages synchronisés
sur les repères de out/cues.json, voix off avec ducking. Écrit out/mix.wav."""
import json, wave
import numpy as np
from scipy.signal import lfilter, fftconvolve

SR = 44100
rng = np.random.default_rng(1)
cues = json.load(open('out/cues.json'))
TOTAL = cues['total']
TL = json.loads(open('src/timeline.js').read().split('=', 1)[1].strip().rstrip(';'))
N = int(TOTAL * SR) + SR


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, s, len(e[na:na + nd]))
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return _iir(_iir(x, a), a)


def _iir(x, a):
    return lfilter([1 - a], [1, -a], x)


def add(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i] * gain


def noise(n): return rng.standard_normal(n)


# ───────────── instruments
def taiko(vel=1.0, pitch=58):
    n = int(1.2 * SR); t = np.arange(n) / SR
    f = pitch * (1 + 1.2 * np.exp(-t * 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    skin = lowpass(noise(n), 900) * np.exp(-t * 25) * 0.9
    return (body * 1.1 + skin) * vel


def pluck(freq, dur=2.4, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for h in range(1, 9):
        s += np.sin(2 * np.pi * freq * h * t * (1 + 0.0007 * h)) * np.exp(-t * (1.6 + h * 1.3 / bright)) / h ** 1.1
    s *= 1 - np.exp(-t * 900)
    return s * 0.5


def pad(freqs, dur, fc=900):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0, 0.13):
            ph = rng.random() * 6.28
            ff = f * 2 ** (det / 12)
            s += 2 * ((ff * t + ph / 6.28) % 1) - 1  # dent de scie
    s = lowpass(s / (3 * len(freqs)), fc)
    return s


def bell(freq, dur=3.0):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * freq * r * t) * np.exp(-t * d) * a for r, d, a in [(1, 1.2, 1), (2.76, 2.2, .5), (5.4, 3.5, .3), (8.93, 5, .15)])
    return s * (1 - np.exp(-t * 400)) * 0.5


def gong(freq=110, dur=5.0):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * freq * r * t + 3 * np.sin(2 * np.pi * 2.1 * t)) * np.exp(-t * d) * a for r, d, a in [(1, .6, 1), (1.47, .9, .7), (2.09, 1.2, .5), (2.56, 1.6, .4), (3.9, 2.4, .25)])
    return s * (1 - np.exp(-t * 60)) * 0.4


def whoosh(dur=0.7, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    x = noise(n)
    # balayage : mélange de deux passe-bas
    lo, hi = lowpass(x, 300), lowpass(x, 4000)
    u = t / dur if up else 1 - t / dur
    s = lo * (1 - u) + hi * u
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return s * e * 0.6


def riser(dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 * 2 ** (3 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (whoosh(dur, True) + tone) * (t / dur) ** 2


def boom():
    n = int(3.0 * SR); t = np.arange(n) / SR
    f = 42 + 60 * np.exp(-t * 8)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    out = sub * 1.2 + lowpass(noise(n), 2000) * np.exp(-t * 6) * 0.3
    tk = taiko(1.0, 48); out[:len(tk)] += tk * 0.8
    return out


def crack():
    n = int(0.5 * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for k in range(6):
        i = int(rng.random() * 0.25 * SR); L = int(0.01 * SR)
        s[i:i + L] += noise(L) * np.exp(-np.arange(L) / (0.002 * SR)) * (0.5 + rng.random())
    return lowpass(s, 5000) * 1.5


def tick():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 60) * 0.4 + taiko(0.5, 90)[:n] * 0.6


def arrow():
    s = whoosh(0.35, False) * 0.7
    th = taiko(0.35, 140)
    out = np.zeros(int(0.9 * SR)); out[:len(s)] += s; add(out, th, 0.42)
    return out


def low():
    n = int(3.0 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 55 * t) * np.sin(np.pi * t / 3.0) * 0.6


# ───────────── musique
music = np.zeros(N)
BPM = 92; beat = 60 / BPM
V = [v['start'] for v in TL['voice']]

# section → (accord pentatonique ré mineur, intensité)
sections = [
    (0, V[1] - 0.35, [38, 45, 50], 0.9),        # accroche
    (V[1] - 0.35, V[2] - 0.35, [38, 45, 53], 0.6),  # Shang
    (V[2] - 0.35, V[3] - 0.35, [34, 41, 50], 0.75),  # Zhou (si♭)
    (V[3] - 0.35, V[4] - 0.35, [36, 43, 52], 1.0),   # Qin (do)
    (V[4] - 0.35, V[5] - 0.35, [41, 48, 57], 0.35),  # Shuowen (fa)
    (V[5] - 0.35, V[6] - 0.35, [38, 45, 50], 0.8),   # Han
    (V[6] - 0.35, V[7] - 0.35, [34, 41, 50], 0.7),   # Kai
    (V[7] - 0.35, V[8] - 0.35, [36, 43, 48], 0.85),  # simplification
    (V[8] - 0.35, V[9] - 0.35, [38, 45, 50, 57], 1.0),  # conclusion
    (V[9] - 0.35, TOTAL, [38, 45, 50], 0.5),       # fin
]
PENTA = [0, 3, 5, 7, 10]
for a, b, chord, inten in sections:
    dur = b - a + 1.5
    p = pad([midi(m) for m in chord], dur, fc=500 + 700 * inten)
    e = env_adsr(len(p), 0.6, 0.5, 1.0, 1.2)
    add(music, p * e * 0.22, a)
    # bourdon grave
    t = np.arange(int(dur * SR)) / SR
    dr = np.sin(2 * np.pi * midi(chord[0] - 12) * t) * 0.18 * e[:len(t)]
    add(music, dr, a)
    # taiko : pulsation à la noire, accent sur 1, remplissage croissant
    nb = int((b - a) / beat)
    root = chord[0]
    for i in range(nb):
        tt = a + i * beat
        if i % 4 == 0: add(music, taiko(0.9 * inten), tt)
        elif i % 4 == 2: add(music, taiko(0.55 * inten, 70), tt)
        if inten > 0.7 and i % 8 == 7: add(music, taiko(0.4 * inten, 90), tt + beat / 2)
        # guzheng : croches pentatoniques clairsemées
        for half in (0, 0.5):
            if rng.random() < 0.35 + 0.25 * inten:
                deg = PENTA[rng.integers(0, 5)] + 12 * rng.integers(1, 3)
                add(music, pluck(midi(root + 24 + deg - 12), 2.0, 0.8 + inten), tt + half * beat, 0.16)

# ───────────── bruitages
sfx = np.zeros(N)
FX = {
    'boom': lambda: boom() * 0.9, 'hit': lambda: taiko(1.0, 55) * 0.9, 'whoosh': lambda: whoosh(0.6) * 0.8,
    'tick': lambda: tick() * 0.6, 'riser': lambda: riser(1.3) * 0.7, 'crack': lambda: crack() * 0.7,
    'chime': lambda: bell(midi(81 + [0, 3, 5, 7, 10][rng.integers(0, 5)])) * 0.35, 'metal': lambda: gong(98) * 0.8,
    'arrow': lambda: arrow() * 0.6, 'low': lambda: low() * 0.7,
}
for kind, t in cues['cues']:
    add(sfx, FX[kind](), max(0, t - (0.3 if kind == 'whoosh' else 0.0)))

# ───────────── voix
voice = np.zeros(N)
for i, v in enumerate(TL['voice']):
    w = wave.open(f'assets/voice_fast/s{i + 1:02d}.wav')
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    add(voice, a, v['start'])

# ducking : enveloppe de la voix lissée
ve = np.abs(voice)
ve = _iir(ve, np.exp(-1 / (0.25 * SR)))
duck = 1 - 0.6 * np.clip(ve / (ve.max() * 0.25), 0, 1)

# réverbération simple (bruit à décroissance exponentielle)
irn = int(2.2 * SR); ir = noise(irn) * np.exp(-np.arange(irn) / SR * 3.2); ir /= np.sqrt((ir ** 2).sum())
def reverb(x, wet):
    L = len(x) + irn; nfft = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]
    return x + y * wet

music = reverb(music, 0.35)
sfx = reverb(sfx, 0.25)
vox = reverb(voice, 0.06)

mix = vox * 1.0 + music * duck * 0.2 + sfx * (0.5 + 0.5 * duck) * 0.24
# fondus
fade = np.ones(N); fo = int(1.5 * SR); end = int(TOTAL * SR)
fade[end - fo:end] = np.linspace(1, 0, fo); fade[end:] = 0
mix *= fade
mix = mix[:end]
mix /= np.abs(mix).max() / 0.95
st = np.stack([mix, mix], 1)
with wave.open('out/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print('ok', TOTAL)
_bed = (music * duck * 0.2 + sfx * (0.5 + 0.5 * duck) * 0.24)[:end]
_act = np.abs(voice[:end]) > 0.02
_r = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
print('voix', round(_r(vox[:end][_act]), 1), 'fond pendant voix', round(_r(_bed[_act]), 1), 'fond hors voix', round(_r(_bed[~_act]), 1))
