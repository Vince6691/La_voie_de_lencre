"""Bruitages synthétisés du 教 (gravure d'un signe dans l'os) → audio/sfx_grave_{a,b,c,d}.wav
python3 fabriquer_jiao.py   (depuis ce dossier)
Une pointe de bronze qui racle l'os : deux traits de bruit filtré (2–7 kHz, attaque 4 ms), un léger raclement grave de l'os,
un « tic » quand la pointe se relève. Quatre variantes pour ne pas mitrailler ; −20 LUFS, ≈ 0,3 s."""
import subprocess, os, wave
import numpy as np
from scipy import signal

SR = 44100
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..')


def env(n, a, d):  # attaque a (s), décroissance exponentielle d (s)
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def band(x, lo, hi):
    return signal.sosfilt(signal.butter(3, [lo, hi], 'band', fs=SR, output='sos'), x)


def variante(seed):
    r = np.random.default_rng(seed)
    n = int(SR * 0.34); y = np.zeros(n)
    def trait(t0, dur, amp, lo, hi):
        m = int(SR * dur); k = int(SR * t0)
        x = band(r.standard_normal(m), lo, hi) * env(m, 0.004, dur * 0.45)
        x *= 1 + 0.5 * np.sin(2 * np.pi * r.uniform(60, 110) * np.arange(m) / SR)  # raclement : modulation de l'archet de la pointe
        y[k:k + m] += amp * x
    trait(0.000, 0.085, 1.0, r.uniform(1800, 2600), r.uniform(6000, 7500))
    trait(r.uniform(0.09, 0.115), 0.07, r.uniform(0.55, 0.8), r.uniform(2200, 3000), r.uniform(6500, 8000))
    trait(0.0, 0.16, 0.25, 500, 1400)  # os qui répond, grave et mat
    k = int(SR * r.uniform(0.2, 0.23)); m = int(SR * 0.05)  # tic : la pointe se relève
    tt = np.arange(m) / SR
    y[k:k + m] += 0.35 * (np.sin(2 * np.pi * r.uniform(1500, 2100) * tt) * np.exp(-tt / 0.008) + 0.4 * band(r.standard_normal(m), 3000, 9000) * np.exp(-tt / 0.006))
    y /= np.abs(y).max()
    return y


for nom, seed in zip('abcd', (11, 23, 37, 51)):
    tmp = os.path.join(here, f'_{nom}.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((variante(seed) * 30000).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'loudnorm=I=-20:TP=-2,afade=t=out:st=0.28:d=0.06', '-ar', '44100', '-ac', '2', os.path.join(out, f'sfx_grave_{nom}.wav')], check=True)
    os.remove(tmp)
print('ok')
