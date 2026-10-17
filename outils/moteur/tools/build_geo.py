"""Prépare les données cartographiques → src/geodata.js
Sources : Natural Earth (domaine public, via GitHub nvkelso/natural-earth-vector) pour les terres,
fleuves, lacs et reliefs ; aourednik/historical-basemaps (GPL-3.0) pour les frontières historiques."""
import json, math

BOX = (60, -5, 160, 60)  # lon min, lat min, lon max, lat max


def simplify(pts, tol):
    # Douglas–Peucker
    if len(pts) < 3: return pts
    def d(p, a, b):
        if a == b: return math.dist(p, a)
        (x, y), (x1, y1), (x2, y2) = p, a, b
        return abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / math.dist(a, b)
    stack, keep = [(0, len(pts) - 1)], {0, len(pts) - 1}
    while stack:
        i, j = stack.pop()
        m, k = 0, None
        for q in range(i + 1, j):
            dd = d(pts[q], pts[i], pts[j])
            if dd > m: m, k = dd, q
        if k is not None and m > tol:
            keep.add(k); stack += [(i, k), (k, j)]
    return [pts[i] for i in sorted(keep)]


def inbox(ring, pad=0):
    return any(BOX[0] - pad <= x <= BOX[2] + pad and BOX[1] - pad <= y <= BOX[3] + pad for x, y in (p[:2] for p in ring))


def rings(geom):
    if not geom: return []
    t, c = geom['type'], geom['coordinates']
    if t == 'Polygon': return [c[0]]
    if t == 'MultiPolygon': return [p[0] for p in c]
    if t == 'LineString': return [c]
    if t == 'MultiLineString': return c
    return []


def r2(ring, tol):
    return [[round(x, 3), round(y, 3)] for x, y in simplify([tuple(p[:2]) for p in ring], tol)]


def load(f): return json.load(open(f'assets/geo/{f}'))


out = {'land': [], 'lakes': [], 'rivers': {}, 'relief': [], 'hist': {}}
for f in load('ne_50m_land.geojson')['features']:
    for r in rings(f['geometry']):
        if inbox(r) and len(r) > 4: out['land'].append(r2(r, 0.02))
for f in load('ne_50m_lakes.geojson')['features']:
    for r in rings(f['geometry']):
        if inbox(r): out['lakes'].append(r2(r, 0.02))
RIV = {'Huang': 'huang', 'Chang Jiang': 'yangzi', 'Yangtze': 'yangzi', 'Jinsha': 'yangzi', 'Huai': 'huai', 'Han': 'han',
       'Wei': 'wei', 'Luo': 'luo', 'Fen': 'fen', 'Liao': 'liao', 'Xi': 'xi', 'Gan': 'gan', 'Xiang': 'xiang', 'Jialing': 'jialing', 'Min': 'min'}
for f in load('ne_10m_rivers_lake_centerlines.geojson')['features']:
    n = f['properties'].get('name')
    if n not in RIV: continue
    for r in rings(f['geometry']):
        if r and 95 < r[0][0] < 125 and 20 < r[0][1] < 45:
            out['rivers'].setdefault(RIV[n], []).append(r2(r, 0.01))
for f in load('ne_10m_geography_regions_polys.geojson')['features']:
    p = f['properties']
    if p.get('FEATURECLA') not in ('Range/mtn', 'Plateau', 'Desert'): continue
    for r in rings(f['geometry']):
        if inbox(r, -5):
            out['relief'].append({'k': p['FEATURECLA'], 'n': p.get('NAME_FR') or p.get('NAME'), 'r': r2(r, 0.05)})
H = {'zhou': ('hist_bc1000.geojson', 'Zhoa'), 'zhou_states': ('hist_bc500.geojson', 'Zhou states'), 'han': ('hist_bc200.geojson', 'Han Empire')}
for k, (fn, name) in H.items():
    for f in load(fn)['features']:
        if f['properties'].get('NAME') == name:
            out['hist'][k] = [r2(r, 0.03) for r in rings(f['geometry'])]
open('src/geodata.js', 'w').write('// Généré par tools/build_geo.py — Natural Earth (domaine public) ; historical-basemaps (GPL-3.0)\nwindow.GEODATA = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print({k: (len(v) if not isinstance(v, dict) else {kk: len(vv) for kk, vv in v.items()}) for k, v in out.items()})
