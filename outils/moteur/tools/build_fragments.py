"""Éclats d'enduit pour l'effondrement d'une fresque (sortie « bas-relief qui se détache et tombe »).
python3 tools/build_fragments.py <image> <sortie.json> [nombre] [graine]

Cellules de Voronoï (germes plus serrés vers les bords : petits éclats autour, grandes plaques au centre), bornées au
cadre par la méthode des germes miroirs ; chaque arête partagée est rendue dentelée de façon déterministe (même
ligne brisée pour les deux voisins : les fissures se raccordent). Sortie en coordonnées normalisées 0–1 :
{"w", "h", "fragments": [{"poly": [[x, y]…], "c": [cx, cy], "area"}]}, lue par remotion/src/shuimo_wen/Effondrement.tsx."""
import json, sys
import numpy as np
from PIL import Image
from scipy.spatial import Voronoi

img, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 70
rng = np.random.default_rng(int(sys.argv[4]) if len(sys.argv) > 4 else 11)
W, H = Image.open(img).size
asp = W / H

# germes : tirage avec rejet (distance minimale), plus denses près des bords
pts = []
while len(pts) < n:
    p = rng.random(2)
    edge = min(p[0], 1 - p[0], p[1], 1 - p[1])
    dmin = 0.045 + 0.09 * min(1, edge / 0.3)
    q = np.array([p[0] * asp, p[1]])
    if all(np.hypot(*(q - np.array([a * asp, b]))) > dmin for a, b in pts):
        pts.append(p)
P = np.array(pts) * [asp, 1]
mir = np.vstack([P, P * [-1, 1], P * [1, -1], [2 * asp, 0] + P * [-1, 1], [0, 2] + P * [1, -1]])
vor = Voronoi(mir)

def jag(a, b, k=7):
    """ligne brisée de a à b, dentelée de façon déterministe (indépendante du sens de parcours)"""
    key = tuple(sorted([tuple(np.round(a, 5)), tuple(np.round(b, 5))]))
    r = np.random.default_rng(abs(hash(key)) % (2 ** 32))
    a0, b0 = np.array(key[0]), np.array(key[1])
    L = np.hypot(*(b0 - a0))
    on_border = any(abs(v) < 1e-6 for v in (a0[0], b0[0], a0[1], b0[1])) and (
        (abs(a0[0] - b0[0]) < 1e-6 and abs(a0[0]) < 1e-6) or (abs(a0[1] - b0[1]) < 1e-6 and abs(a0[1]) < 1e-6))
    on_border = on_border or (abs(a0[0] - asp) < 1e-6 and abs(b0[0] - asp) < 1e-6) or (abs(a0[1] - 1) < 1e-6 and abs(b0[1] - 1) < 1e-6)
    m = max(2, int(L / 0.02))
    t = np.linspace(0, 1, m + 1)[1:-1]
    nrm = np.array([-(b0 - a0)[1], (b0 - a0)[0]]) / (L + 1e-9)
    off = 0 if on_border else (r.standard_normal(len(t)) * 0.006 * np.sin(np.pi * t))
    mid = a0 + np.outer(t, b0 - a0) + np.outer(off, nrm)
    pts = [a0, *mid, b0]
    return pts if tuple(np.round(a, 5)) == key[0] else pts[::-1]

frags = []
for i in range(len(P)):
    reg = vor.regions[vor.point_region[i]]
    if -1 in reg or not reg:
        continue
    v = np.clip(vor.vertices[reg], [0, 0], [asp, 1])
    poly = []
    for j in range(len(v)):
        seg = jag(v[j], v[(j + 1) % len(v)])
        poly.extend(seg[:-1])
    poly = np.array(poly)
    x, y = poly[:, 0], poly[:, 1]
    area = 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
    frags.append({'poly': np.round(poly / [asp, 1], 5).tolist(), 'c': np.round(poly.mean(0) / [asp, 1], 4).tolist(),
                  'area': round(float(area / asp), 5)})
json.dump({'w': W, 'h': H, 'fragments': frags}, open(out, 'w'))
print(len(frags), 'éclats →', out)
