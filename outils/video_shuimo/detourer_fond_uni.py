"""Détoure un objet photographié sur fond uni clair (os, tablette, objet posé) → PNG RGBA recadré au plus juste.
python3 detourer_fond_uni.py image.jpg sortie.png [hauteur_max=1100] [seuil=14]
Fond = médiane des bords ; masque = écart au fond > seuil, fermé, trous remplis, plus grande pièce, bord adouci ; ombre portée du
fond effacée (le canvas pose la sienne). Affiche la boîte englobante d'origine (x0 y0 x1 y1) et la taille de sortie."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
hmax = int(sys.argv[3]) if len(sys.argv) > 3 else 1100
seuil = float(sys.argv[4]) if len(sys.argv) > 4 else 14
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
bord = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
fond = np.median(bord, axis=0)
d = np.abs(a - fond).max(axis=2)
m = ndimage.binary_closing(d > seuil, np.ones((9, 9)))
m = ndimage.binary_fill_holes(m)
lab, n = ndimage.label(m)
m = lab == 1 + np.argmax(ndimage.sum(m, lab, range(1, n + 1)))
m = ndimage.binary_opening(m, np.ones((5, 5)))
alpha = np.clip(ndimage.gaussian_filter(m.astype(np.float32), 1.6) * 1.15 - 0.075, 0, 1)
ys, xs = np.nonzero(m)
x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
rgba = np.dstack([a, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
o = Image.fromarray(rgba, 'RGBA')
if o.height > hmax: o = o.resize((round(o.width * hmax / o.height), hmax), Image.LANCZOS)
o.save(out)
print('boite', x0, y0, x1, y1, 'sortie', o.size)
