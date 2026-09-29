"""Détecte les silences (≥ 0,18 s) d'un clip de voix : liste de (début, fin), et la durée."""
import wave, numpy as np
def silences(path, thr=-40, minlen=0.18):
    w = wave.open(path); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    hop = int(sr * 0.02)
    db = np.array([20 * np.log10(np.sqrt(np.mean(a[j:j + hop] ** 2)) + 1e-9) for j in range(0, len(a) - hop, hop)])
    out, s = [], None
    for k, x in enumerate(db > thr):
        if not x and s is None: s = k
        if x and s is not None:
            if (k - s) * 0.02 >= minlen: out.append((round(s * 0.02, 2), round(k * 0.02, 2)))
            s = None
    return out, round(len(a) / sr, 3)
if __name__ == '__main__':
    import sys
    for p in sys.argv[1:]: print(p, *silences(p))
