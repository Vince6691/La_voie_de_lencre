"""Son du rouleau du temps en 3D (remotion/src/rouleau3d/Rouleau3D.tsx) → assets/rouleau/rouleau3d.wav (5,8 s, copié par sync.mjs).
Bruitages ElevenLabs (assets/rouleau3d/) : souffle du rouleau qui défile, coup sec du sceau de pierre, cloche bianzhong.
0,5 s souffle qui enfle et retombe ; 3,75 s silence ; 4,0 s impact (coup net + grave synthétique + court réverbéré) ;
5,8 s cloche quand le sceau s'envole vers le cartouche.
python3 tools/build_sfx_3d.py"""
import wave
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR, DUR = 48000, 7.6
GUZHENG = 0.22  # niveau du glissando (le souffle est à 0,55)
A = 'assets/rouleau3d/'
rng = np.random.default_rng(9)
def load(f):
    sr, x = wavfile.read(A + f); x = x.astype(float) / 32768
    return x if x.ndim == 1 else x.mean(1)
def put(out, x, at, g):
    i = int(at * SR); n = min(len(x), len(out) - i); out[i:i + n] += g * x[:n]
n = int(SR * DUR); t = np.arange(n) / SR
mix = np.zeros(n)

# souffle : enfle jusqu'à ≈ 2,2 s, retombe, coupé en douceur avant l'impact
wh = load('souffle.wav'); wh = wh / np.abs(wh).max()
put(mix, wh, 0.55, 0.55)
mix *= 1 - np.clip((t - 3.45) / 0.3, 0, 1) * (t < 4.0)

# glissando de guzheng (cordes pincées, Karplus-Strong) pendant l'accélération, discret sous le souffle
def pluck(f, dur=1.6):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(SR * dur))
    for k in range(len(out)):
        out[k] = buf[k % N]; buf[k % N] = 0.996 * 0.5 * (buf[k % N] + buf[(k + 1) % N])
    return out * np.exp(-np.arange(len(out)) / SR / 0.9)
notes = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.5, 1480]
times = 0.7 + 1.8 * (1 - 0.86 ** np.arange(len(notes))) / (1 - 0.86 ** len(notes))  # de plus en plus serré
gl = np.zeros(n)
for f, at in zip(notes, times):
    p = pluck(f); put(gl, p, at, 0.6)
gl = signal.lfilter(*signal.butter(2, 5500 / (SR / 2)), gl)  # adoucit l'attaque métallique
gl += 0.3 * signal.fftconvolve(gl, rng.standard_normal(int(0.6 * SR)) * np.exp(-np.arange(int(0.6 * SR)) / SR / 0.25))[:n] / 40
gl *= 1 - np.clip((t - 3.45) / 0.3, 0, 1) * (t < 4.0)
mix += GUZHENG * gl / (np.abs(gl).max() + 1e-9)

# impact : le premier coup du bruitage (1,97–2,32 s), un grave bref sous lui, une courte réverbération de pièce
imp = load('impact.wav'); i0 = int(1.975 * SR); hit = imp[i0:i0 + int(0.35 * SR)]
hit *= np.minimum(1, np.linspace(6, 0, len(hit))); hit /= np.abs(hit).max()
ti = np.arange(int(1.2 * SR)) / SR
boom = np.sin(2 * np.pi * (48 + 30 * np.exp(-ti / 0.05)) * ti) * np.exp(-ti / 0.22) * (1 - np.exp(-ti / 0.002))
ir = rng.standard_normal(int(0.9 * SR)) * np.exp(-np.arange(int(0.9 * SR)) / SR / 0.22)
ir = signal.lfilter(*signal.butter(2, 3500 / (SR / 2)), ir); ir /= np.abs(ir).sum() ** 0.5 * 30
dry = np.zeros(int(1.2 * SR)); dry[:len(hit)] += hit; dry += 0.55 * boom
wet = signal.fftconvolve(dry, ir)[:len(dry)]
put(mix, dry + 0.35 * wet / (np.abs(wet).max() + 1e-9), 4.0, 1.0)

# cloche quand le sceau s'envole
bell = load('cloche.wav'); bell /= np.abs(bell).max()
put(mix, bell, 5.8, 0.45)

mix = mix / np.abs(mix).max() * 0.9
st = np.stack([mix, np.roll(mix, 29)], 1)
with wave.open('assets/rouleau/rouleau3d.wav', 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('son → assets/rouleau/rouleau3d.wav')
