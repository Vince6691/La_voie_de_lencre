"""Sons du rouleau du temps → assets/shuimo_xue/ : rouleau.wav (souffle de papier qui glisse, 4,6 s, enfle avec la
vitesse de la caméra) et gong.wav (gong de bronze discret, au tampon du sceau de la nouvelle époque).
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


# souffle : bruit rose filtré en bande dont le centre monte puis redescend avec la vitesse du défilement
dur = 4.6; n = int(SR * dur); t = np.arange(n) / SR
white = rng.standard_normal(n)
pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400], white)
speed = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6  # comme la caméra : lent, rapide, lent
out = np.zeros(n); hop = 2048
for i in range(0, n, hop):
    f = 300 + 1700 * speed[min(i + hop // 2, n - 1)]
    b, a = signal.butter(2, [f * 0.6 / (SR / 2), min(0.95, f * 1.6 / (SR / 2))], 'band')
    seg = signal.lfilter(b, a, pink[max(0, i - 4096):i + hop])[-min(hop, n - i):]
    out[i:i + len(seg)] = seg
out *= speed * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t))  # le papier frémit
save('assets/shuimo_xue/rouleau.wav', out)

# gong : partiels inharmoniques, attaque douce, longue décroissance
dur = 4.0; t = np.arange(int(SR * dur)) / SR
g = np.zeros_like(t)
for f, a, d in ((110, 1.0, 2.8), (178, 0.55, 2.2), (247, 0.35, 1.6), (330, 0.22, 1.1), (521, 0.12, 0.7)):
    g += a * np.sin(2 * np.pi * f * t * (1 + 0.002 * np.exp(-t))) * np.exp(-t / d)
g *= 1 - np.exp(-t / 0.012)
save('assets/shuimo_xue/gong.wav', g)
print('sons → assets/shuimo_xue/rouleau.wav, gong.wav')
