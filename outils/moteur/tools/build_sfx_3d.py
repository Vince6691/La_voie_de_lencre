"""Sons du rouleau du temps en 3D (remotion/src/rouleau3d/Rouleau3D.tsx) → assets/rouleau/ (copiés par sync.mjs) :
  rouleau3d.wav       version complète (5,3 s) : souffle 0,2 s, glissando 0,35–2 s, impact 3,5 s, cloche 5,3 s
  rouleau3d_court.wav version courte (3,6 s)   : souffle, glissando 0,05–1,55 s, impact 2,3 s, cloche une quarte plus bas 3,15 s
Bruitages ElevenLabs (assets/rouleau3d/) : souffle du rouleau qui défile, coup sec du sceau de pierre, cloche bianzhong ;
glissando de guzheng synthétisé (cordes pincées, Karplus-Strong), discret sous le souffle.
python3 tools/build_sfx_3d.py"""
import wave
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
GUZHENG = 0.22  # niveau du glissando (le souffle est à 0,55)
A = 'assets/rouleau3d/'
def load(f):
    sr, x = wavfile.read(A + f); x = x.astype(float) / 32768
    return x if x.ndim == 1 else x.mean(1)
def put(out, x, at, g):
    i = int(at * SR)
    if i < 0: x, i = x[-i:], 0
    n = min(len(x), len(out) - i); out[i:i + n] += g * x[:n]
def pluck(rng, f, dur=1.6):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(SR * dur))
    for k in range(len(out)):
        out[k] = buf[k % N]; buf[k % N] = 0.996 * 0.5 * (buf[k % N] + buf[(k + 1) % N])
    return out * np.exp(-np.arange(len(out)) / SR / 0.9)
NOTES = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.5, 1480]

def build(out, dur, souffle, gliss, impact, cloche, bell_shift=1.0):
    """souffle : début du bruitage ; gliss : (début, durée) ; impact : instant du coup ; cloche : instant de la cloche ;
    bell_shift : rapport de hauteur de la cloche (0,75 = une quarte plus bas)."""
    rng = np.random.default_rng(9)
    n = int(SR * dur); t = np.arange(n) / SR
    duck = 1 - np.clip((t - (impact - 0.55)) / 0.3, 0, 1) * (t < impact)  # silence juste avant l'impact
    mix = np.zeros(n)
    wh = load('souffle.wav'); put(mix, wh / np.abs(wh).max(), souffle, 0.55)
    mix *= duck
    g0, gd = gliss
    times = g0 + gd * (1 - 0.86 ** np.arange(len(NOTES))) / (1 - 0.86 ** len(NOTES))  # de plus en plus serré
    gl = np.zeros(n)
    for f, at in zip(NOTES, times): put(gl, pluck(rng, f), at, 0.6)
    gl = signal.lfilter(*signal.butter(2, 5500 / (SR / 2)), gl)  # adoucit l'attaque métallique
    gl += 0.3 * signal.fftconvolve(gl, rng.standard_normal(int(0.6 * SR)) * np.exp(-np.arange(int(0.6 * SR)) / SR / 0.25))[:n] / 40
    mix += GUZHENG * gl * duck / (np.abs(gl).max() + 1e-9)
    # impact : le premier coup du bruitage (1,97–2,32 s), un grave bref sous lui, une courte réverbération de pièce
    imp = load('impact.wav'); i0 = int(1.975 * SR); hit = imp[i0:i0 + int(0.35 * SR)].copy()
    hit *= np.minimum(1, np.linspace(6, 0, len(hit))); hit /= np.abs(hit).max()
    ti = np.arange(int(1.2 * SR)) / SR
    boom = np.sin(2 * np.pi * (48 + 30 * np.exp(-ti / 0.05)) * ti) * np.exp(-ti / 0.22) * (1 - np.exp(-ti / 0.002))
    ir = rng.standard_normal(int(0.9 * SR)) * np.exp(-np.arange(int(0.9 * SR)) / SR / 0.22)
    ir = signal.lfilter(*signal.butter(2, 3500 / (SR / 2)), ir); ir /= np.abs(ir).sum() ** 0.5 * 30
    dry = np.zeros(int(1.2 * SR)); dry[:len(hit)] += hit; dry += 0.55 * boom
    wet = signal.fftconvolve(dry, ir)[:len(dry)]
    put(mix, dry + 0.35 * wet / (np.abs(wet).max() + 1e-9), impact, 1.0)
    # cloche quand le sceau s'envole (rééchantillonnée pour changer de note)
    bell = load('cloche.wav')
    if bell_shift != 1.0: bell = signal.resample(bell, int(len(bell) / bell_shift))
    put(mix, bell / np.abs(bell).max(), cloche, 0.45)
    mix = mix / np.abs(mix).max() * 0.9
    st = np.stack([mix, np.roll(mix, 29)], 1)
    with wave.open(f'assets/rouleau/{out}', 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
    print(f'son → assets/rouleau/{out}')

build('rouleau3d.wav', 7.1, souffle=0.2, gliss=(0.35, 1.65), impact=3.5, cloche=5.3)
build('rouleau3d_court.wav', 5.0, souffle=-0.35, gliss=(0.05, 1.5), impact=2.3, cloche=3.15, bell_shift=0.75)
