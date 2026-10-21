"""Temps d'ancre (scène k, vt) → temps global et numéro d'image (30 i/s) : python3 tools/at.py 2 5.0 6.6 …"""
import json, sys
TL = json.loads(open('src/timeline.js').read().split('=', 1)[1].strip().rstrip(';'))
WARP = {int(k): v for k, v in json.load(open('tools/warp.json')).items()}
def pw(p, x):
    for i in range(len(p) - 1):
        if x <= p[i + 1][0] or i == len(p) - 2:
            return p[i][1] + (x - p[i][0]) * (p[i + 1][1] - p[i][1]) / ((p[i + 1][0] - p[i][0]) or 1)
k = int(sys.argv[1])
for a in sys.argv[2:]:
    t = TL['voice'][k - 1]['start'] + pw(WARP[k], float(a))
    print(a, round(t, 2), round(t * 30))
