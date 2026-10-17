"""Bruitages ajoutés au récit de 美 (storytelling) → audio/sfx_*.wav (44,1 kHz stéréo) :
  sfx_tonnerre.wav  tonnerre lointain synthétisé (claquement étouffé puis roulement grave, 5 s) : « Il y a plus de trois mille ans »
  sfx_tambour.wav   tambour rituel grave (ElevenLabs, tambour_1.mp3), pour la danse et les révélations
  sfx_feuilles.wav  pages du dictionnaire feuilletées vite (ElevenLabs, deux prises enchaînées, 1,5 s)
python3 audio/sfx_src/fabriquer_mei.py (depuis episodes/mei/)"""
import subprocess, wave
import imageio_ffmpeg
import numpy as np
from scipy import signal

SR = 44100
FF = imageio_ffmpeg.get_ffmpeg_exe()
def mp3(f):
    raw = subprocess.run([FF, '-v', 'quiet', '-i', f, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(float) / 32768
def save(f, x, width=23):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    st = np.stack([x, np.roll(x, width)], 1)
    with wave.open(f, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
    print('→', f)

rng = np.random.default_rng(12)
# tonnerre : bruit brun filtré très bas, roulement en bouffées irrégulières, claquement étouffé au début
n = int(5.0 * SR); t = np.arange(n) / SR
brown = np.cumsum(rng.standard_normal(n))
brown = signal.lfilter(*signal.butter(2, [25 / (SR / 2), 180 / (SR / 2)], 'band'), brown)
env = np.zeros(n)
for at, g, d in [(0.05, 1.0, 0.5), (0.6, 0.7, 0.9), (1.3, 0.85, 1.1), (2.2, 0.55, 1.3), (3.1, 0.35, 1.4)]:
    k = np.clip((t - at) / 0.12, 0, 1) * np.exp(-np.clip(t - at, 0, None) / d); env += g * k
env *= 1 - np.clip((t - 4.2) / 0.8, 0, 1)
crack = signal.lfilter(*signal.butter(2, [200 / (SR / 2), 1800 / (SR / 2)], 'band'), rng.standard_normal(n)) * np.exp(-t / 0.18) * (t > 0.02)
x = brown / np.abs(brown).max() * env + 0.25 * crack / np.abs(crack).max()
ir = rng.standard_normal(int(1.5 * SR)) * np.exp(-np.arange(int(1.5 * SR)) / SR / 0.5)
x = x + 0.4 * signal.fftconvolve(x, ir)[:n] / 60
save('audio/sfx_tonnerre.wav', x, 61)
save('audio/sfx_tambour.wav', mp3('audio/sfx_src/tambour_1.mp3'))
a, b = mp3('audio/sfx_src/feuilles_1.mp3'), mp3('audio/sfx_src/feuilles_2.mp3')
f = np.zeros(int(1.6 * SR)); f[:len(a)] += a; i = int(0.5 * SR); f[i:i + len(b)] += 0.9 * b[:len(f) - i]
save('audio/sfx_feuilles.wav', f)
