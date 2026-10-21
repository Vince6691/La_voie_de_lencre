"""Prépare l'animation « le dessin au trait se construit » d'une image baimiao (traits noirs sur blanc).
python3 trace_baimiao.py image.jpg sortie.png n_germes ['[[x, y], …]' germes en plus, ex. le visage]
Chaque pixel d'encre reçoit un instant d'arrivée : distance le long des traits depuis n germes (répartis sur le dessin,
du haut vers le bas) ; les traits isolés partent du pixel le plus proche déjà atteint. Sortie PNG RGBA :
R = instant (0–250), A = encre. Affiche les germes (pixels de l'image) au format JSON."""
import heapq, json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32)
H, W = img.shape
ink = np.clip((235 - img) / 170, 0, 1)  # 0 = blanc, 1 = noir
mask = ndimage.binary_dilation(ink > 0.12, iterations=1)
lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
sizes = ndimage.sum(mask, lab, range(1, n + 1))
# germes : sur le plus grand morceau, répartis par tranches de hauteur, alternés gauche / droite
big = lab == (1 + int(np.argmax(sizes)))
ys, xs = np.nonzero(big)
ng = int(sys.argv[3]); seeds = []
order = np.argsort(ys)
for i in range(ng):
    sl = order[int(i / ng * len(order)): int((i + 1) / ng * len(order))]
    j = sl[np.argmin(xs[sl])] if i % 2 else sl[np.argmax(xs[sl])]
    if i == 0: j = sl[0]  # le premier germe : le sommet du dessin (la tête)
    seeds.append((int(ys[j]), int(xs[j])))
for x, y in (json.loads(sys.argv[4]) if len(sys.argv) > 4 else []):  # germes imposés : pixel d'encre le plus proche
    yy, xx = np.nonzero(mask[max(0, y - 40):y + 40, max(0, x - 40):x + 40]); k = int(np.argmin((yy + max(0, y - 40) - y) ** 2 + (xx + max(0, x - 40) - x) ** 2))
    seeds.append((int(yy[k] + max(0, y - 40)), int(xx[k] + max(0, x - 40))))
dist = np.full((H, W), np.inf, np.float32)
def dijkstra(sources):
    pq = [(d, y, x) for d, y, x in sources]
    for d, y, x in sources: dist[y, x] = d
    heapq.heapify(pq)
    while pq:
        d, y, x = heapq.heappop(pq)
        if d > dist[y, x]: continue
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if not dy and not dx: continue
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx]:
                    nd = d + (1.414 if dx and dy else 1.0)
                    if nd < dist[yy, xx]: dist[yy, xx] = nd; heapq.heappush(pq, (nd, yy, xx))
dijkstra([(0.0, y, x) for y, x in seeds])
# morceaux non atteints : chacun part de son pixel le plus proche d'un pixel déjà atteint
for _ in range(50):
    reached = np.isfinite(dist)
    todo = mask & ~reached
    if not todo.any(): break
    edt, (iy, ix) = ndimage.distance_transform_edt(~reached, return_indices=True)
    l2, m = ndimage.label(todo, structure=np.ones((3, 3)))
    src = []
    for k in range(1, m + 1):
        yy, xx = np.nonzero(l2 == k)
        j = int(np.argmin(edt[yy, xx]))
        src.append((float(dist[iy[yy[j], xx[j]], ix[yy[j], xx[j]]] + 0.5 * edt[yy[j], xx[j]]), int(yy[j]), int(xx[j])))
    dijkstra(src)
d = np.where(np.isfinite(dist), dist, 0)
t = np.clip(d / max(1.0, np.percentile(d[mask], 99.5)) * 250, 0, 250)
out = np.zeros((H, W, 4), np.uint8)
out[..., 0] = t.astype(np.uint8); out[..., 3] = (np.clip(ink, 0, 1) * 255 * mask).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(sys.argv[2])
print(json.dumps({'taille': [W, H], 'germes': [[x, y] for y, x in seeds]}))
