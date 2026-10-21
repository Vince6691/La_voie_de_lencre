"""Estampages (拓片) pour la version tout shuimo → assets/shuimo_xue/ :
- plastron.png : estampage d'un plastron de tortue — encre tamponnée sombre et marbrée sur la surface en relief,
  sillons des écailles et creusets 鑽鑿 restés clairs (le tampon ne les atteint pas), bord irrégulier ;
- bronze.png : feuille d'estampage d'une inscription de bronze (marge plus claire de la paroi, bords frangés) ;
- noise.png : bruit fractal 1920 × 1080 pour les fondus « encre tamponnée / encre qui sèche ».
python3 tools/build_estampages.py"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

OUT = 'assets/shuimo_xue'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)


def fractal(h, w, scales, seed):
    r = np.random.default_rng(seed)
    n = sum(ndimage.gaussian_filter(r.standard_normal((h, w)), s) * s ** 0.8 for s in scales)
    return (n - n.min()) / (n.max() - n.min())


def ink_texture(h, w, seed):
    """Encre tamponnée : sombre, marbrée (passages du tampon), grain de papier et quelques fibres claires."""
    blot = fractal(h, w, (60, 22, 8), seed)
    grain = fractal(h, w, (1.2, 0.6), seed + 1)
    v = 0.10 + 0.20 * blot ** 1.4 + 0.07 * grain  # 0 = noir
    return v


def rgba(v, alpha):
    ink = np.array([24, 21, 19], np.float32); paper = np.array([238, 232, 220], np.float32)
    rgb = ink + (paper - ink) * np.clip(v, 0, 1)[..., None]
    return Image.fromarray(np.dstack([rgb, np.clip(alpha, 0, 1) * 255]).round().astype(np.uint8), 'RGBA')


def rough_mask(shape_img, seed, amount=7):
    """Bord d'estampage : flou puis seuil sur bruit — frange irrégulière, l'encre s'arrête en dentelle."""
    a = np.asarray(shape_img).astype(np.float32) / 255
    a = ndimage.gaussian_filter(a, amount)
    n = fractal(*a.shape, (10, 3), seed)
    return np.clip((a - 0.5 + (n - 0.5) * 0.45) * 6 + 0.5, 0, 1)


# ── plastron
W, H = 900, 1180
sh = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sh)
ys = np.linspace(0, 1, 120)
def half(y):
    # lobe avant arrondi, ponts larges avec deux échancrures douces, lobe arrière plus étroit
    w = 0.47 * np.sin(np.pi * np.clip(0.04 + y * 0.96, 0, 1)) ** 0.55
    w -= 0.035 * np.exp(-((y - 0.30) / 0.05) ** 2) + 0.045 * np.exp(-((y - 0.70) / 0.05) ** 2)
    return w * (1 - 0.08 * y)
pts = [(W / 2 + half(y) * W, 30 + y * (H - 60)) for y in ys]
pts = pts + [(W / 2 + 0.06 * W, H - 30), (W / 2, H - 95), (W / 2 - 0.06 * W, H - 30)] + [(W - x, y) for x, y in pts[::-1]]
d.polygon(pts, fill=255)
alpha = rough_mask(sh, 3)
v = 0.07 + 0.30 * fractal(H, W, (70, 25, 9), 5) ** 1.6 + 0.08 * fractal(H, W, (1.2, 0.6), 6)
# sillons des écailles, tremblés : ligne médiane et cinq sillons transverses
groove = Image.new('L', (W, H), 0); g = ImageDraw.Draw(groove)
wob = lambda k: rng.normal(0, 5)
g.line([(W / 2 + rng.normal(0, 3), 40 + t * (H - 150)) for t in np.linspace(0, 1, 30)], fill=255, width=6)
for k, y in enumerate((0.14, 0.31, 0.50, 0.69, 0.86)):
    yy = 30 + y * (H - 60); hw = half(y) * W - 30
    line = [(W / 2 + u * hw, yy + 18 * abs(u) ** 1.5 * (1 if k % 2 else -1) + rng.normal(0, 2.5)) for u in np.linspace(-1, 1, 40)]
    g.line(line, fill=255, width=5)
# creusets 鑽鑿 : une douzaine, irréguliers — un creux rond (鑽) accolé à un creux allongé (鑿)
for k in range(12):
    side = -1 if k % 2 else 1
    yy = 150 + (k // 2) * 160 + rng.normal(0, 25)
    cx = W / 2 + side * rng.uniform(70, 0.8 * half((yy - 30) / (H - 60)) * W)
    r1 = rng.uniform(11, 16)
    g.ellipse([cx - r1, yy - r1, cx + r1, yy + r1], fill=255)
    g.ellipse([cx + side * (r1 + 2) - 8, yy - 24, cx + side * (r1 + 2) + 8, yy + 24], fill=255)
gr = ndimage.gaussian_filter(np.asarray(groove).astype(np.float32) / 255, 1.8)
v = v + gr * (0.45 + 0.25 * fractal(H, W, (2,), 9))
rim = ndimage.gaussian_filter((alpha > 0.5).astype(np.float32), 9)
v = v - 0.06 * (1 - rim) * (alpha > 0.2)
rgba(v, alpha).save(f'{OUT}/plastron.png', optimize=True)

# ── feuille d'estampage de bronze (paroi intérieure du vase, inscription au centre)
W, H = 860, 1000
sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([40, 40, W - 40, H - 40], radius=70, fill=255)
alpha = rough_mask(sh, 21, amount=10)
v = 0.08 + 0.28 * fractal(H, W, (70, 25, 9), 31) ** 1.6 + 0.08 * fractal(H, W, (1.2, 0.6), 32)
yy, xx = np.mgrid[0:H, 0:W]
# marge plus claire (la paroi s'incurve, le tampon y passe moins) et deux fines lignes de coulée
edge = ndimage.distance_transform_edt(np.asarray(sh) > 0)
v = v + 0.10 * np.exp(-edge / 60)
for y0 in (210, 790):
    v = v + 0.10 * np.exp(-((yy - y0 - 8 * np.sin(xx / 90)) / 3.0) ** 2)
rgba(v, alpha).save(f'{OUT}/bronze.png', optimize=True)

# ── bruit des fondus
n = fractal(1080, 1920, (140, 55, 22, 7), 2)
Image.fromarray((n * 255).round().astype(np.uint8)).save(f'{OUT}/noise.png')
print('estampages → assets/shuimo_xue/')
