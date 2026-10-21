"""Planche contact d'images fixes : python3 planche.py <dossier> <sortie.jpg> [colonnes]"""
import glob, os, sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted(glob.glob(os.path.join(d, '*.jpg')), key=lambda f: float(os.path.basename(f).rsplit('_', 1)[1][:-4]))
ims = [Image.open(f) for f in fs]; w, h = ims[0].size
S = Image.new('RGB', (cols * w, ((len(ims) + cols - 1) // cols) * (h + 22)), 'white'); dr = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 22); S.paste(im, (x, y)); dr.text((x + 4, y + h + 4), os.path.basename(f).rsplit('_', 1)[1][:-4] + ' s', fill='red')
S.save(out, quality=85)
