"""Bruitages propres au 語 → audio/sfx_*.wav (44,1 kHz stéréo), synthétisés (ElevenLabs ne sort que ≈ 1 s) :
  sfx_cloche.wav  cloche de carillon (bianzhong) frappée au maillet : bourdon grave, partiels inharmoniques, battements,
                  longue résonance de 7 s ; leitmotiv (entière au bloc 4, discrète ensuite)
  sfx_goutte.wav  goutte d'encre qui tombe sur le papier (petit « plop » montant + écrasement doux), 0,5 s
  sfx_allumage.wav  lampe à huile qu’on allume (ouverture « deux ombres ») ; sfx_souffle.wav  souffle doux (語 / 言 projetés)
Les autres (sceau, pinceau, gravure, gong, tonnerre, feuilles, ciseau, tambour) sont repris du 美.
python3 audio/sfx_src/fabriquer_yu.py (depuis episodes/yu/)"""
import wave
import numpy as np
from scipy import signal

SR = 44100
def save(f, x, width=23):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    st = np.stack([x, np.roll(x, width)], 1)
    with wave.open(f, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
    print('→', f)

rng = np.random.default_rng(5)
# cloche : bronze oval (deux tons), fondamentale grave ; chaque partiel = deux sinus proches (battement), décroissance propre
n = int(7.0 * SR); t = np.arange(n) / SR
f0 = 174.0
x = np.zeros(n)
for r, g, d, beat in [(0.5, 0.35, 5.5, 0.4), (1.0, 1.0, 4.5, 0.9), (1.19, 0.55, 3.2, 1.3), (1.51, 0.4, 2.4, 1.7),
                      (2.0, 0.45, 2.0, 2.1), (2.74, 0.28, 1.2, 2.9), (3.6, 0.2, 0.7, 3.4), (5.1, 0.14, 0.35, 4.0), (6.9, 0.1, 0.2, 5.0)]:
    f = f0 * r; ph = rng.uniform(0, 6.28, 2)
    x += g * np.exp(-t / d) * (np.sin(2 * np.pi * f * t + ph[0]) + 0.7 * np.sin(2 * np.pi * (f + beat) * t + ph[1]))
# attaque du maillet de bois : bruit bref filtré, et montée de 4 ms pour éviter le clic
mallet = signal.lfilter(*signal.butter(2, [300 / (SR / 2), 3000 / (SR / 2)], 'band'), rng.standard_normal(n)) * np.exp(-t / 0.03)
x = x * np.clip(t / 0.004, 0, 1) + 0.6 * mallet / np.abs(mallet).max() * np.abs(x).max() * 0.5
# salle de bois : petite réverbération
ir = rng.standard_normal(int(1.8 * SR)) * np.exp(-np.arange(int(1.8 * SR)) / SR / 0.6)
x = x + 0.25 * signal.fftconvolve(x, ir)[:n] / 40
x *= 1 - np.clip((t - 6.2) / 0.8, 0, 1)
save('audio/sfx_cloche.wav', x, 41)

# goutte : bulle dont la fréquence monte vite (500 → 1300 Hz) + petit écrasement grave
n = int(0.5 * SR); t = np.arange(n) / SR
fq = 500 + 800 * (1 - np.exp(-t / 0.025))
plop = np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-t / 0.045) * np.clip(t / 0.002, 0, 1)
thud = signal.lfilter(*signal.butter(2, 220 / (SR / 2)), rng.standard_normal(n)) * np.exp(-t / 0.03)
splat = signal.lfilter(*signal.butter(2, [1500 / (SR / 2), 6000 / (SR / 2)], 'band'), rng.standard_normal(n)) * np.exp(-np.clip(t - 0.01, 0, None) / 0.05) * (t > 0.01)
x = plop + 0.6 * thud / np.abs(thud).max() + 0.12 * splat / np.abs(splat).max()
save('audio/sfx_goutte.wav', x, 11)

# allumage de la lampe : craquement d'allumette (bruit aigu bref, grésillements) puis souffle de la flamme qui prend
n = int(1.4 * SR); t = np.arange(n) / SR
strike = signal.lfilter(*signal.butter(2, [2500 / (SR / 2), 9000 / (SR / 2)], 'band'), rng.standard_normal(n)) * np.exp(-t / 0.05)
crk = np.zeros(n)
for i in range(18):
    k = int((0.02 + 0.25 * rng.random()) * SR); crk[k:k + 60] += rng.standard_normal(60) * np.exp(-np.arange(60) / 12) * (0.3 + 0.7 * rng.random())
whoosh = signal.lfilter(*signal.butter(2, [120 / (SR / 2), 900 / (SR / 2)], 'band'), rng.standard_normal(n)) * np.clip((t - 0.08) / 0.15, 0, 1) * np.exp(-np.clip(t - 0.23, 0, None) / 0.35)
x = 0.8 * strike / np.abs(strike).max() + 0.35 * crk / (np.abs(crk).max() + 1e-9) + 0.9 * whoosh / np.abs(whoosh).max()
save('audio/sfx_allumage.wav', x, 17)

# souffle : bruit doux filtré qui enfle et retombe (une ombre « prononce » son caractère)
n = int(1.3 * SR); t = np.arange(n) / SR
x = signal.lfilter(*signal.butter(2, [250 / (SR / 2), 1600 / (SR / 2)], 'band'), rng.standard_normal(n)) * np.sin(np.pi * np.clip(t / 1.2, 0, 1)) ** 2
save('audio/sfx_souffle.wav', x, 29)
