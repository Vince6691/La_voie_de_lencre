"""Détoure le personnage d'une image de clip (GrabCut), pour le changer en silhouette d'encre puis en caractère.
python3 detourer.py clip.mp4 t x y w h sortie.png [debug.jpg]
  t : instant (s) de l'image ; x y w h : rectangle qui contient le personnage (pixels du clip)
Sortie : PNG RGBA à la taille du clip — noir, alpha = silhouette (bord adouci) ; affiche la boîte englobante."""
import subprocess, sys
import cv2, imageio_ffmpeg, numpy as np

src, t = sys.argv[1], float(sys.argv[2])
x, y, w, h = map(int, sys.argv[3:7]); out = sys.argv[7]
ff = imageio_ffmpeg.get_ffmpeg_exe()
raw = subprocess.run([ff, '-loglevel', 'error', '-ss', str(t), '-i', src, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
# amorce : hors du rectangle = fond sûr ; dedans, les pixels saturés et sombres (peau, tissu teint, plumes rayées)
# sont « probablement personnage », le reste (ciel gris, lumière pâle, sol clair) « probablement fond »
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); S, V = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
mask = np.full(img.shape[:2], cv2.GC_BGD, np.uint8)
mask[y:y + h, x:x + w] = cv2.GC_PR_BGD
cand = ((S > 95) & (V < 140)) | (V < 55)
inside = np.zeros_like(cand); inside[y:y + h, x:x + w] = True
mask[cand & inside] = cv2.GC_PR_FGD
mask[(S > 150) & (V < 115) & inside] = cv2.GC_FGD
bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(img, mask, None, bg, fg, 8, cv2.GC_INIT_WITH_MASK)
m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
m = np.where(lab == k, 255, 0).astype(np.uint8)
# trous intérieurs bouchés (le personnage est une ombre pleine)
inv = cv2.bitwise_not(m); ff_mask = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
cv2.floodFill(inv, ff_mask, (0, 0), 0); m = cv2.bitwise_or(m, inv)
m = cv2.GaussianBlur(m, (3, 3), 0)
rgba = np.zeros((*m.shape, 4), np.uint8); rgba[..., 3] = m
cv2.imwrite(out, rgba)
ys, xs = np.nonzero(m > 128)
print('boîte', int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()), 'taille', m.shape[1], m.shape[0])
if len(sys.argv) > 8:
    dbg = img.copy(); dbg[m > 128] = (0.4 * dbg[m > 128] + 0.6 * np.array([40, 40, 220])).astype(np.uint8)
    cv2.imwrite(sys.argv[8], dbg)
