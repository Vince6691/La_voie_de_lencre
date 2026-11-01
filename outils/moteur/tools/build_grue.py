"""Grue en pièces détachées (marionnette articulée du fond shuimo, Grue.tsx) : détoure la planche Nano Banana sur fond
vert (assets/shuimo/planches/09_grue_*.jpg) → assets/shuimo/elements/grue_corps.png et grue_aile.png (RGBA).

Le corps de la grue est blanc : la planche est sur fond vert uni, détouré à la couleur (excès de vert sur le rouge et
le bleu), avec suppression du vert qui déborde sur les bords. L'aile retenue est celle de gauche (anatomie juste :
bout de l'aile blanc, rémiges secondaires noires) ; elle est retournée pour avoir la racine à gauche, la pointe à
droite, le bord d'attaque en haut. Écrit aussi grue.json : taille des pièces, point d'épaule sur le corps, racine de
l'aile. python tools/build_grue.py   (depuis outils/moteur/)"""
import glob, json
from PIL import Image, ImageChops

SRC = sorted(glob.glob('assets/shuimo/planches/09_grue_*.*'))[-1]
OUT = 'assets/shuimo/elements'

im = Image.open(SRC).convert('RGB')
R, G, B = im.split()
# excès de vert : ~0 sur la grue (blanc, noir, gris, vermillon), fort sur le fond
spill = ImageChops.subtract(G, ImageChops.lighter(R, B))
LO, HI = 18, 70
alpha = spill.point(lambda v: 255 if v <= LO else 0 if v >= HI else round(255 * (HI - v) / (HI - LO)))
# suppression du vert sur les bords : G ramené au plus fort de R et B
G2 = ImageChops.darker(G, ImageChops.lighter(R, B))
rgba = Image.merge('RGBA', (R, G2, B, alpha))

def piece(box, flip=False):
    p = rgba.crop(box)
    p = p.crop(p.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
    return p.transpose(Image.FLIP_LEFT_RIGHT) if flip else p

W, H = im.size
# zones de la planche (1376 × 768) : corps en haut à droite, aile anatomique en bas à gauche
corps_box = (int(W * 0.48), 0, W, int(H * 0.52))
aile_box = (0, int(H * 0.52), int(W * 0.5), H)
corps = piece(corps_box)
aile = piece(aile_box, flip=True)
corps.save(f'{OUT}/grue_corps.png')
aile.save(f'{OUT}/grue_aile.png')

# épaule : centre de la zone claire du dos (la planche la montre là où les ailes s'attachent), en fraction du corps
cb = rgba.crop(corps_box).getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
epaule_sheet = (960, 186)
ex = (epaule_sheet[0] - corps_box[0] - cb[0]) / corps.width
ey = (epaule_sheet[1] - corps_box[1] - cb[1]) / corps.height
# racine de l'aile (après retournement : bord gauche) : du haut (bord d'attaque) au bas de la coupe
a = aile.getchannel('A')
col = [a.getpixel((2, y)) for y in range(aile.height)]
ys = [y for y, v in enumerate(col) if v > 128]
json.dump({
    'corps': {'w': corps.width, 'h': corps.height, 'epaule': [round(ex, 4), round(ey, 4)]},
    'aile': {'w': aile.width, 'h': aile.height, 'racine': [round(ys[0] / aile.height, 4), round(ys[-1] / aile.height, 4)]},
}, open(f'{OUT}/grue.json', 'w'), indent=1)
print(SRC, 'corps', corps.size, 'aile', aile.size, 'épaule', round(ex, 3), round(ey, 3), 'racine', ys[0], ys[-1])
