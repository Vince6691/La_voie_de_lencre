"""Ombre d'un personnage d'après un clip Seedance (série 墨道) : le personnage, éclairé chaud sur un fond froid, est
découpé par sa couleur (rouge nettement > bleu) dans une bande verticale, nettoyé, adouci → vidéo « ombre »
(silhouette sombre sur blanc, à poser en multiplication sur le papier).
python3 ombre_clip.py entrée.mp4 sortie.mp4 [x0 x1]   (bande horizontale gardée, en fraction de largeur)"""
import sys, numpy as np, imageio_ffmpeg
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
x0, x1 = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (0.25, 0.68)
rd = imageio_ffmpeg.read_frames(src); meta = next(rd); W, H = meta['size']; fps = meta['fps']
wr = imageio_ffmpeg.write_frames(out, (W, H), fps=fps, pix_fmt_in='gray', quality=8, macro_block_size=8)
wr.send(None)
band = np.zeros((H, W), bool); band[:int(0.885 * H), int(x0 * W):int(x1 * W)] = True  # le sol éclairé (bas de l'image) est exclu
band[int(0.84 * H):, int(0.6 * W):] = False
for raw in rd:
    f = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.int16)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    m = (r - b > 45) & (r > 70) & (r + g + b < 690) & band
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    if n:  # garder la plus grande composante (le personnage) et ce qui la touche presque
        sizes = ndimage.sum(m, lab, range(1, n + 1)); keep = sizes >= 0.04 * sizes.max()
        m = keep[lab - 1] & (lab > 0)
    m = ndimage.binary_closing(m, iterations=3)
    a = ndimage.gaussian_filter(m.astype(np.float32), 2.0)
    wr.send((255 - 255 * np.clip(a * 1.3, 0, 1) * 0.92).astype(np.uint8).tobytes())
wr.close()
