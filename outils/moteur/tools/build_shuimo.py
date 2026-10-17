"""Banque shuimo : découpe les planches Nano Banana (assets/shuimo/planches/NN_famille_x.jpg) en éléments détourés
→ assets/shuimo/elements/<famille>_<planche>_<n>.png (RGBA) + index.json, et génère le papier xuan (paper.jpg).

Détourage « encre sur papier » : le blanc du fond est estimé localement (certaines planches ont des bandes grises),
l'opacité vient de l'écart au fond sur le canal le plus sombre, et la couleur est retrouvée en retirant le fond
(le vermillon du soleil reste rouge). Les éléments sont séparés par composantes connexes après dilatation.
python3 tools/build_shuimo.py [--sheet]   (--sheet : out/preview/shuimo_elements.png, planche de contrôle)"""
import glob, json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC = 'assets/shuimo/planches'
OUT = 'assets/shuimo/elements'
UP = 2  # agrandissement (les planches font 896 × 1200)
FAMILY = {'01': 'lointain', '02': 'pic', '03': 'premier', '04': 'premier', '05': 'vie', '06': 'ciel', '07': 'brume', '08': 'massif'}


def cutout(path):
    im = Image.open(path).convert('RGB')
    im = im.resize((im.width * UP, im.height * UP), Image.LANCZOS)
    p = np.asarray(im).astype(np.float32) / 255
    # fond local : maximum sur un large voisinage (le papier est ce qu'il y a de plus clair), lissé
    lum = p.max(-1)
    bg = ndimage.maximum_filter(lum, size=41 * UP)
    bg = ndimage.gaussian_filter(bg, 20 * UP)
    bg = np.maximum(bg, lum)[..., None]
    a = ((bg - p) / np.maximum(bg, 1e-3)).max(-1)
    a = np.clip((a - 0.025) / 0.975, 0, 1)  # le grain du fond reste transparent
    col = np.clip(bg - (bg - p) / np.maximum(a, 1e-3)[..., None], 0, 1)
    col[a < 1e-3] = 0
    return np.dstack([col, a])


def split(rgba, family):
    a = rgba[..., 3]
    m = ndimage.gaussian_filter(a, 2) > (0.02 if family == 'brume' else 0.04)
    grow = 22 * UP if family in ('vie', 'brume') else 14 * UP  # les oiseaux d'une volée restent ensemble
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=grow))
    out = []
    H, W = a.shape
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        region = (lab[sl] == i) & m[sl]
        if region.sum() < 400 * UP * UP: continue
        ys, xs = np.nonzero(region)
        y0, y1, x0, x1 = ys.min() + sl[0].start, ys.max() + sl[0].start, xs.min() + sl[1].start, xs.max() + sl[1].start
        pad = 12 * UP
        y0, x0, y1, x1 = max(0, y0 - pad), max(0, x0 - pad), min(H, y1 + pad), min(W, x1 + pad)
        crop = rgba[y0:y1, x0:x1].copy()
        crop[..., 3] *= ndimage.binary_dilation(lab[y0:y1, x0:x1] == i, iterations=pad)  # rien d'un voisin
        # touche-t-il un bord de la planche ? (bambou qui entre par le haut, falaise coupée…)
        edges = ''.join(s for s, c in (('t', y0 == 0), ('b', y1 == H), ('l', x0 == 0), ('r', x1 == W)) if c)
        # massif ou chaîne coupés par le bord de la planche : le côté coupé s'efface dans la brume — long fondu
        # irrégulier (la limite ondule d'une rangée à l'autre), pour qu'aucune tranche ne se voie dans le cadre
        if family in ('massif', 'lointain') and ('l' in edges or 'r' in edges):
            hh, ww = crop.shape[:2]
            L = ww * (0.4 if family == 'massif' else 0.18)
            wob = ndimage.gaussian_filter1d(np.random.default_rng(i).standard_normal(hh), 30)
            wob = (wob / (np.abs(wob).max() + 1e-6))[:, None] * 0.3 * L
            xs = np.arange(ww, dtype=np.float32)[None, :]
            sm = lambda u: u * u * (3 - 2 * u)
            if 'l' in edges: crop[..., 3] *= sm(np.clip((xs - wob) / L, 0, 1))
            if 'r' in edges: crop[..., 3] *= sm(np.clip((ww - 1 - xs - wob) / L, 0, 1))
        out.append((crop, (x0, y0), edges))
    # ordre de lecture : rangées puis colonnes
    rows = sorted(out, key=lambda e: e[1][1])
    return sorted(out, key=lambda e: (round(e[1][1] / (150 * UP)), e[1][0]))


def paper(w=2400, h=1350, seed=7):
    """Papier xuan clair : blanc chaud, nuages de fibres, quelques fibres longues, bords à peine plus chauds."""
    r = np.random.default_rng(seed)
    base = np.array([250, 247, 240], np.float32)
    n = sum(ndimage.gaussian_filter(r.standard_normal((h, w)), s) * k for s, k in ((60, 9), (14, 5), (3, 2.2), (0.8, 1.4)))
    img = base[None, None, :] + n[..., None] * np.array([1.0, 1.0, 1.15])
    fib = Image.new('L', (w, h), 0); d = ImageDraw.Draw(fib)
    for _ in range(900):
        x, y, L, ang = r.uniform(0, w), r.uniform(0, h), r.uniform(20, 120), r.uniform(0, np.pi)
        pts = [(x + np.cos(ang + 0.3 * np.sin(t)) * t, y + np.sin(ang + 0.3 * np.sin(t)) * t) for t in np.linspace(0, L, 8)]
        d.line(pts, fill=int(r.uniform(20, 60)), width=1)
    fib = np.asarray(fib.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    img -= fib[..., None] * np.array([10, 11, 14])
    yy, xx = np.mgrid[0:h, 0:w]
    v = ((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) ** 0.5
    img -= (np.clip(v - 0.35, 0, 1) * 22)[..., None] * np.array([0.6, 0.8, 1.3])
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save('assets/shuimo/paper.jpg', quality=92)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(f'{OUT}/*.png'): os.remove(f)
    index = []
    for path in sorted(glob.glob(f'{SRC}/*.jpg')):
        name = os.path.splitext(os.path.basename(path))[0]
        num, sheet = name[:2], name[-1]
        fam = FAMILY[num]
        parts = split(cutout(path), fam)
        for k, (crop, (x, y), edges) in enumerate(parts):
            sub = re.sub(r'^\d\d_|_[a-z]$', '', name)
            fn = f'{fam}_{sub}_{sheet}{k + 1}.png' if fam == 'premier' else f'{fam}_{sheet}{k + 1}.png'
            Image.fromarray((crop * 255).round().astype(np.uint8), 'RGBA').save(f'{OUT}/{fn}', optimize=True)
            index.append({'file': fn, 'family': fam, 'sheet': name, 'w': crop.shape[1], 'h': crop.shape[0], 'edges': edges})
        print(f'{name:28s} {len(parts)} éléments')
    json.dump(index, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1)
    paper()
    print(len(index), 'éléments ; papier → assets/shuimo/paper.jpg')
    if '--sheet' in sys.argv:
        th = 220
        cols = 10
        rows = (len(index) + cols - 1) // cols
        sheet = Image.open('assets/shuimo/paper.jpg').resize((cols * th, rows * (th + 18)))
        d = ImageDraw.Draw(sheet)
        for i, e in enumerate(index):
            im = Image.open(f'{OUT}/{e["file"]}'); im.thumbnail((th - 10, th - 10))
            x, y = (i % cols) * th, (i // cols) * (th + 18)
            sheet.paste(im, (x + 5, y + 5), im)
            d.text((x + 4, y + th), f'{e["file"][:-4]} {e["edges"]}', fill=(120, 40, 30))
        sheet.save('out/preview/shuimo_elements.png')


if __name__ == '__main__':
    main()
