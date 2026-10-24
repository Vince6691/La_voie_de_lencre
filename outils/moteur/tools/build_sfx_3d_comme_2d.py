"""Sons du rouleau 3D faits comme ceux du rouleau 2D (validés) : souffle synthétisé qui suit la vitesse (0,38), un des trois
流水拂 (assets/rouleau3d/liushui_N.wav, sans réverbération, 0,42), silence, impact grave — recalés sur les temps du 3D (impact
3,5 s pour la version complète, 2,3 s pour la courte), puis la cloche bianzhong du 3D quand le sceau s'envole.
→ assets/rouleau/rouleau3d_liushui_N.wav, rouleau3d_court_liushui_N.wav     python3 tools/build_sfx_3d_comme_2d.py"""
import importlib.util, io, contextlib
import numpy as np
from scipy import signal
from scipy.io import wavfile

spec = importlib.util.spec_from_file_location('g', 'tools/build_glissandos.py'); g = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()): spec.loader.exec_module(g)
SR = g.SR


def lire(f):
    sr, x = wavfile.read(f); x = x.astype(float) / 32768
    return x.mean(1) if x.ndim > 1 else x


cloche = lire('assets/rouleau3d/cloche.wav'); cloche /= np.abs(cloche).max()
for nom, total, impact, t_cloche, shift in (('rouleau3d', 7.1, 3.5, 5.3, 1.0), ('rouleau3d_court', 5.0, 2.3, 3.15, 0.75)):
    d = impact / 0.8  # le son 2D est construit sur une durée dont l'impact tombe à 0,8
    n, u, duck, wh, imp = g.base_rouleau(d)
    bell = cloche if shift == 1.0 else signal.resample(cloche, int(len(cloche) / shift))
    for k in (1, 2, 3):
        x = lire(f'assets/rouleau3d/liushui_{k}.wav')
        gl = np.zeros(n); g.put(gl, x, 0.4 * d / 5); gl *= (1 - np.clip((u - 0.75) / 0.04, 0, 1)); gl /= np.abs(gl).max() + 1e-9
        mix = np.zeros(int(SR * total)); mix[:n] = 0.38 * wh + 0.42 * gl + 0.9 * imp
        g.put(mix, 0.45 * np.abs(mix).max() * bell, t_cloche)
        g.save(f'assets/rouleau/{nom}_liushui_{k}.wav', mix)
print('sons 3D refaits comme le 2D')
