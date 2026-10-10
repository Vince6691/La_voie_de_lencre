"""Fond musical de la version shuimo v2 (xue/remotion/src/shuimo_v2/XueV2.tsx) : bourdon ré–la qui respire, notes de
guzheng pentatoniques espacées (Karplus–Strong), souffle léger ; s'efface pendant les rouleaux du temps (qui ont leur
son) et pendant le silence avant la réponse ; coupé net à la fin (écran de fin : une seule note grave).
Même minutage que la composition (cues_sx.json). Écrit assets/audio/bed_sx.wav."""
import json, os, wave
import numpy as np
from scipy.signal import lfilter

X = os.path.join(os.path.dirname(__file__), '..')
c = json.load(open(f'{X}/remotion/src/data/cues_sx.json'))
d = lambda k: c[k]['duration']
A1 = 0.6; A2 = A1 + d('b01') + 0.9; A3 = A2 + d('b02') + 1.0; R1 = A3 + d('b03') + 0.7; A4 = R1 + 5.3
R2 = A4 + d('b04') + 0.8; A5 = R2 + 3.8; A6 = A5 + d('b05') + 1.0; A7 = A6 + d('b06') + 1.0
CUT = A7 + c['b07']['cues']['reponse'] - 0.12; R3 = A7 + d('b07') + 1.7 + 0.8; A8 = R3 + 6.4; A9 = A8 + d('b08') + 1.0
END = A9 + d('b09') + 0.5; TOTAL = END + 3.2
SR = 44100; N = int(TOTAL * SR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
f = lambda m: 440 * 2 ** ((m - 69) / 12)

def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], lfilter([1 - a], [1, -a], x))

# bourdon : ré2 + la2 + ré3, battements lents, respiration de 11 s
drone = sum(g * np.sin(2 * np.pi * f(m) * t + 0.3 * np.sin(2 * np.pi * 0.07 * t + m)) for m, g in [(38, 0.5), (45, 0.32), (50, 0.22), (57, 0.08)])
drone *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 11) ** 2
air = lp(rng.standard_normal(N), 900) * 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 17) ** 2)
bed = 0.16 * drone + 0.05 * air

# guzheng : Karplus–Strong, pentatonique de ré, une note toutes les 2,5–5 s, parfois une paire
def pluck(freq, dur=3.5):
    n = int(dur * SR); L = int(SR / freq); buf = rng.uniform(-1, 1, L); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % L]; buf[i % L] = 0.996 * 0.5 * (buf[i % L] + buf[(i + 1) % L])
    return out * np.exp(-np.arange(n) / SR / 1.4)
scale = [62, 64, 66, 69, 71, 74, 76, 78, 81]
tt = 2.0
while tt < END - 2:
    m = scale[rng.integers(0, len(scale))]
    for k, dm in enumerate([0] + ([scale[min(len(scale) - 1, scale.index(m) + 1)] - m] if rng.random() < 0.3 else [])):
        p = pluck(f(m + dm)); i = int((tt + 0.32 * k) * SR); j = min(N, i + len(p)); bed[i:j] += 0.09 * p[:j - i]
    tt += rng.uniform(2.5, 5.0)

# enveloppe : entrée douce, creux sous les rouleaux et le silence avant la réponse, coupure nette à END
env = np.clip(t / 3, 0, 1)
for a, b in [(R1, R1 + 5), (R2, R2 + 3.5), (R3, R3 + 6)]:
    env *= 1 - 0.85 * np.clip(np.minimum((t - a + 0.6) / 0.6, (b + 0.8 - t) / 0.8), 0, 1)
env *= 1 - 0.7 * np.clip(np.minimum((t - CUT) / 0.3, (CUT + 1.9 - t) / 0.5), 0, 1)
env[t >= END] = 0
bed *= env
# note grave sur l'écran de fin
i = int((END + 0.15) * SR); g = pluck(f(50), 3.0) * 0.18; bed[i:i + len(g)] += g[:N - i]
bed = bed / np.max(np.abs(bed)) * 0.5
w = wave.open(f'{X}/assets/audio/bed_sx.wav', 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((bed * 32767).astype(np.int16).tobytes()); w.close()
print('bed_sx.wav', round(TOTAL, 2), 's')
