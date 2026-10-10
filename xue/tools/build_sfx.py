"""Sons du rouleau du temps (remotion/src/rouleau/TimeScroll.tsx) → assets/rouleau/ : rouleau.wav (5 s : souffle qui enfle avec la
vitesse, glissando de guzheng, silence, impact grave) et gong.wav (gong discret quand le sceau se pose).
python3 tools/build_sfx.py"""
import wave
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(4)


def save(path, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.8
    st = np.stack([x, np.roll(x, 37)], 1)  # léger élargissement stéréo
    with wave.open(path, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


# rouleau du temps (5 s), calé sur travelM (InkStage.tsx) : souffle qui enfle avec la vitesse, glissando de guzheng
# pendant l'accélération, silence juste avant l'impact, impact grave et sourd sur le sceau 周 (u = 0,80).
DUR = 5.0
def travel_m(u):
    if u <= 0.12: return 0.0
    if u < 0.72:
        e = (u - 0.12) / 0.6
        return 0.96 * (16 * e ** 5 if e < 0.5 else 1 - (-2 * e + 2) ** 5 / 2)
    if u < 0.8: return 0.96 + 0.04 * (1 - (1 - (u - 0.72) / 0.08) ** 3)
    return 1.0
n = int(SR * DUR); t = np.arange(n) / SR; u = t / DUR
m = np.array([travel_m(x) for x in u[::64]]); m = np.interp(np.arange(n), np.arange(0, n, 64), m)
v = np.gradient(m) * SR; v = v / v.max()  # vitesse normalisée
white = rng.standard_normal(n)
pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400], white)
wh = np.zeros(n); hop = 2048
for i in range(0, n, hop):
    f = 250 + 2200 * v[min(i + hop // 2, n - 1)]
    b, a = signal.butter(2, [f * 0.55 / (SR / 2), min(0.95, f * 1.7 / (SR / 2))], 'band')
    sg = signal.lfilter(b, a, pink[max(0, i - 4096):i + hop])[-min(hop, n - i):]
    wh[i:i + len(sg)] = sg
duck = 1 - np.clip((u - 0.74) / 0.03, 0, 1) * (u < 0.8)  # silence juste avant l'impact
wh *= (0.08 + v) ** 0.8 * duck * (u < 0.8)
wh /= np.abs(wh).max() + 1e-9

def pluck(f, dur=1.6):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(SR * dur))
    for k in range(len(out)):
        out[k] = buf[k % N]; buf[k % N] = 0.996 * 0.5 * (buf[k % N] + buf[(k + 1) % N])
    return out * np.exp(-np.arange(len(out)) / SR / 0.9)
notes = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.5, 1480]
gl = np.zeros(n)
times = 0.7 + 1.8 * (1 - 0.86 ** np.arange(len(notes))) / (1 - 0.86 ** len(notes))  # de plus en plus serré
for f, at in zip(notes, times):
    p = pluck(f); i0 = int(at * SR); gl[i0:i0 + len(p)] += p[:max(0, n - i0)] * 0.6

imp = np.zeros(n); i0 = int(0.8 * DUR * SR); ti = np.arange(n - i0) / SR
boom = np.sin(2 * np.pi * (42 + 16 * np.exp(-ti / 0.15)) * ti) * np.exp(-ti / 0.7)
thump = signal.lfilter(*signal.butter(2, 300 / (SR / 2)), rng.standard_normal(len(ti))) * np.exp(-ti / 0.06) * 4
wood = (0.9 * np.sin(2 * np.pi * 820 * ti) * np.exp(-ti / 0.045) + 0.45 * np.sin(2 * np.pi * 1340 * ti) * np.exp(-ti / 0.025))
imp[i0:] = 1.0 * boom + 0.5 * thump + 0.35 * wood
save('assets/rouleau/rouleau.wav', 0.55 * wh + 0.35 * gl / (np.abs(gl).max() + 1e-9) + 0.9 * imp / (np.abs(imp).max() + 1e-9))

# gong : partiels inharmoniques, attaque douce, longue décroissance
dur = 4.0; t = np.arange(int(SR * dur)) / SR
g = np.zeros_like(t)
for f, a, d in ((110, 1.0, 2.8), (178, 0.55, 2.2), (247, 0.35, 1.6), (330, 0.22, 1.1), (521, 0.12, 0.7)):
    g += a * np.sin(2 * np.pi * f * t * (1 + 0.002 * np.exp(-t))) * np.exp(-t / d)
g *= 1 - np.exp(-t / 0.012)
save('assets/rouleau/gong.wav', g)
print('sons → assets/rouleau/rouleau.wav, gong.wav')

