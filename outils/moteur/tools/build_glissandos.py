"""Trois variantes du glissando de guzheng des rouleaux du temps → assets/rouleau/variantes/ :
  glissando_1.wav  « vague »     montée pentatonique en ré, courte redescente, dernière note tenue et vibrée (揉弦)
  glissando_2.wav  « cascade »   descente rapide de l'aigu au grave, en accélérant, posée sur un harmonique (泛音)
  glissando_3.wav  « harpe »     montée lente et douce en sol (mode gong), octaves doublées, grande réverbération
et, pour les écouter en situation, rouleau_1.wav … rouleau_3.wav : le son complet du rouleau 2D (5 s : souffle, glissando,
silence, impact) avec chaque variante, comme assets/rouleau/rouleau.wav (tools/build_sfx.py, glissando actuel).
python3 tools/build_glissandos.py"""
import os
import wave
import numpy as np
from scipy import signal

SR = 48000
OUT = 'assets/rouleau/variantes'
os.makedirs(OUT, exist_ok=True)


def save(path, x, peak=0.8):
    x = x / (np.abs(x).max() + 1e-9) * peak
    st = np.stack([x, np.roll(x, 37)], 1)
    with wave.open(path, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


# corde pincée : Karplus-Strong (attaque de plectre), résonance de caisse, décroissance réglable
def pluck(rng, f, dur=1.8, decay=0.9, bright=0.5):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(SR * dur))
    for k in range(len(out)):
        out[k] = buf[k % N]; buf[k % N] = 0.997 * (bright * buf[k % N] + (1 - bright) * buf[(k + 1) % N])
    out *= np.exp(-np.arange(len(out)) / SR / decay)
    body = signal.lfilter(*signal.butter(2, [180 / (SR / 2), 2600 / (SR / 2)], 'band'), out)  # caisse de résonance
    return out + 0.6 * body


# note tenue et vibrée (揉弦) : partiels de corde, vibrato qui s'élargit, légère montée de hauteur (pression de la main gauche)
def held(f, dur=2.2, bend=1.0):
    t = np.arange(int(SR * dur)) / SR
    vib = 0.006 * np.minimum(1, t / 0.6) * np.sin(2 * np.pi * 5.2 * t)
    fi = f * (1 + vib) * (1 + (bend - 1) * np.minimum(1, t / 0.25))
    ph = 2 * np.pi * np.cumsum(fi) / SR
    x = sum(a * np.sin(k * ph) * np.exp(-t / (1.6 / k)) for k, a in ((1, 1), (2, 0.5), (3, 0.28), (4, 0.15), (5, 0.08)))
    return x * (1 - np.exp(-t / 0.004))


# harmonique (泛音) : son de cloche cristallin, partiels presque purs
def harmonic(f, dur=2.6):
    t = np.arange(int(SR * dur)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4)) * np.exp(-t / 1.1) * (1 - np.exp(-t / 0.003))


def reverb(x, rng, length=1.4, tone=4000, wet=0.35):
    ir = rng.standard_normal(int(length * SR)) * np.exp(-np.arange(int(length * SR)) / SR / (length / 3.5))
    ir = signal.lfilter(*signal.butter(2, tone / (SR / 2)), ir)
    w = signal.fftconvolve(x, ir)[:len(x)]
    return x + wet * w / (np.abs(w).max() + 1e-9) * np.abs(x).max()


def put(out, x, at, g=1.0):
    i = int(at * SR); n = min(len(x), len(out) - i)
    if n > 0: out[i:i + n] += g * x[:n]


def spread(n, t0, d, k=0.86):  # instants de plus en plus serrés (accélération)
    return t0 + d * (1 - k ** np.arange(n)) / (1 - k ** n)


RE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.5, 1480]  # ré pentatonique
SOL = [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99]  # sol pentatonique


def vague(at, length, n):
    rng = np.random.default_rng(11); x = np.zeros(n)
    up = RE[:12]; ts = spread(len(up), at, 0.78 * length)
    for f, t in zip(up, ts): put(x, pluck(rng, f, decay=0.8), t, 0.55)
    back = [1174.66, 987.77, 880]  # courte redescente
    for i, f in enumerate(back): put(x, pluck(rng, f, decay=0.6), ts[-1] + 0.07 * (i + 1), 0.4)
    put(x, held(987.77, bend=1.012), ts[-1] + 0.3, 0.5)  # dernière note tenue, pressée et vibrée
    return reverb(signal.lfilter(*signal.butter(2, 6000 / (SR / 2)), x), rng, wet=0.3)


def cascade(at, length, n):
    rng = np.random.default_rng(12); x = np.zeros(n)
    down = RE[::-1]; ts = spread(len(down), at, 0.85 * length, k=0.8)
    for i, f in enumerate(down): put(x, pluck(rng, f, decay=0.7 + 0.04 * i, bright=0.45), ts[i], 0.5 + 0.02 * i)
    put(x, harmonic(587.33), ts[-1] + 0.12, 0.45)  # harmonique sur l'arrivée
    return reverb(signal.lfilter(*signal.butter(2, 6500 / (SR / 2)), x), rng, wet=0.32)


def harpe(at, length, n):
    rng = np.random.default_rng(13); x = np.zeros(n)
    ts = spread(len(SOL), at, length, k=0.93)  # plus régulier, plus lent
    for f, t in zip(SOL, ts):
        put(x, pluck(rng, f, dur=2.4, decay=1.4, bright=0.4), t, 0.45)
        put(x, pluck(rng, 2 * f, dur=1.6, decay=0.9, bright=0.4), t + 0.012, 0.18)  # octave doublée
    x = signal.lfilter(*signal.butter(2, 4800 / (SR / 2)), x)
    return reverb(x, rng, length=2.4, tone=3200, wet=0.55)


# ── son complet du rouleau 2D (même construction que tools/build_sfx.py : souffle qui suit la vitesse, silence, impact)
DUR = 5.0


def travel_m(u):
    if u <= 0.12: return 0.0
    if u < 0.72:
        e = (u - 0.12) / 0.6
        return 0.96 * (16 * e ** 5 if e < 0.5 else 1 - (-2 * e + 2) ** 5 / 2)
    if u < 0.8: return 0.96 + 0.04 * (1 - (1 - (u - 0.72) / 0.08) ** 3)
    return 1.0


def base_rouleau(DUR=DUR):  # DUR : durée du son (l'impact tombe à 0,8 de la durée)
    rng = np.random.default_rng(4)
    n = int(SR * DUR); t = np.arange(n) / SR; u = t / DUR
    m = np.array([travel_m(x) for x in u[::64]]); m = np.interp(np.arange(n), np.arange(0, n, 64), m)
    v = np.gradient(m) * SR; v = v / v.max()
    pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400], rng.standard_normal(n))
    wh = np.zeros(n); hop = 2048
    for i in range(0, n, hop):
        f = 250 + 2200 * v[min(i + hop // 2, n - 1)]
        b, a = signal.butter(2, [f * 0.55 / (SR / 2), min(0.95, f * 1.7 / (SR / 2))], 'band')
        sg = signal.lfilter(b, a, pink[max(0, i - 4096):i + hop])[-min(hop, n - i):]
        wh[i:i + len(sg)] = sg
    duck = 1 - np.clip((u - 0.74) / 0.03, 0, 1) * (u < 0.8)
    wh *= (0.08 + v) ** 0.8 * duck * (u < 0.8); wh /= np.abs(wh).max() + 1e-9
    imp = np.zeros(n); i0 = int(0.8 * DUR * SR); ti = np.arange(n - i0) / SR
    boom = np.sin(2 * np.pi * (42 + 16 * np.exp(-ti / 0.15)) * ti) * np.exp(-ti / 0.7)
    thump = signal.lfilter(*signal.butter(2, 300 / (SR / 2)), rng.standard_normal(len(ti))) * np.exp(-ti / 0.06) * 4
    wood = 0.9 * np.sin(2 * np.pi * 820 * ti) * np.exp(-ti / 0.045) + 0.45 * np.sin(2 * np.pi * 1340 * ti) * np.exp(-ti / 0.025)
    imp[i0:] = boom + 0.5 * thump + 0.35 * wood
    return n, u, duck, wh, imp / (np.abs(imp).max() + 1e-9)


n, u, duck, wh, imp = base_rouleau()
for k, fn in ((1, vague), (2, cascade), (3, harpe)):
    save(f'{OUT}/glissando_{k}.wav', fn(0.1, 1.8, int(SR * 4.0)))  # seul, pour l'écouter
    gl = fn(0.7, 1.8, n) * (1 - np.clip((u - 0.72) / 0.05, 0, 1))  # sous le souffle, éteint avant le silence de l'impact
    save(f'{OUT}/rouleau_{k}.wav', 0.55 * wh + 0.38 * gl / (np.abs(gl).max() + 1e-9) + 0.9 * imp)
print(f'variantes -> {OUT}/glissando_1..3.wav, rouleau_1..3.wav')
