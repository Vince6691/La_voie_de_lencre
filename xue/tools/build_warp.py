"""Recale l'animation sur la prise de voix actuelle et y insère des respirations.

Entrées :
  tools/warp_cm.json   ancres de l'animation → prise « Chuck Miller » (calage validé)
  out/cm/sNN.wav       prise Chuck Miller (silences rognés), pour aligner phrase à phrase
  out/voice_raw/sNN.wav  nouvelle prise (silences rognés, −18 LUFS)
Sorties :
  assets/voice_fast/sNN.wav  nouvelle prise + pauses insérées (début de clip et entre phrases)
  src/warp.js, tools/warp.json  ancres → temps de la nouvelle prise
  tools/gaps.json            silence après chaque clip (lu par build_timeline.py)
"""
import json, wave
import numpy as np
import sys; sys.path.insert(0, "tools")
from silences import silences

OLD = {int(k): v for k, v in json.load(open('tools/warp_cm.json')).items()}

# silences Chuck Miller ↔ silences de la nouvelle prise : (indice CM, indice début, indice fin)
# (une phrase ajoutée tombe entre deux silences de la nouvelle prise)
ALIGN = {
    4: [(0, 0, 0), (1, 1, 3), (2, 4, 4), (3, 5, 5), (4, 6, 6), (5, 7, 7)],
    5: [(0, 0, 0), (1, 3, 3), (2, 5, 5), (3, 7, 7), (4, 8, 8)],
    6: [(0, 0, 0), (1, 1, 1), (2, 2, 2), (3, 3, 3)],
    8: [(1, 0, 0), (3, 1, 1), (4, 2, 2), (5, 3, 3), (7, 4, 4), (8, 5, 5)],
}
# respirations : LEAD = silence avant la voix (l'entrée de scène s'étire d'autant),
# PAUSE = {indice du silence : secondes ajoutées}, GAP = silence après le clip
LEAD = {1: 0, 2: 1.2, 3: 1.0, 4: 1.0, 5: 1.0, 6: 0.8, 7: 1.0, 8: 0.4, 9: 0.6, 10: 0.8}
PAUSE = {
    1: {1: 0.8},                       # « …que plus personne ne voit. »
    2: {3: 1.0, 5: 1.5},               # après la tortue ; « Là, naît le signe. »
    3: {3: 1.5, 6: 1.5, 10: 1.0},      # plongée dans le ding ; l'enfant ; avant les archers
    4: {3: 1.0},                       # « …chaque royaume écrivait à sa façon. »
    5: {4: 1.0},                       # après la définition du Shuowen
    6: {2: 0.8},                       # « Le pinceau aplatit les courbes. »
    7: {0: 0.6},
    8: {1: 1.5, 2: 0.8, 5: 0.8},       # ⺍ ; imprimés Song–Yuan ; avant « Huit traits »
    9: {3: 1.0},                       # « …sous le toit. »
    10: {},
}
GAP = {1: 1.2, 2: 2.0, 3: 1.8, 4: 1.5, 5: 1.5, 6: 1.6, 7: 1.0, 8: 1.8, 9: 2.0}


def pw(pairs, x):
    for i in range(len(pairs) - 1):
        (a0, b0), (a1, b1) = pairs[i], pairs[i + 1]
        if x <= a1 or i == len(pairs) - 2:
            return b0 + (x - a0) * (b1 - b0) / ((a1 - a0) or 1)
    return x


def inv(pairs):
    return [(b, a) for a, b in pairs]


out, gaps = {}, {}
for k in range(1, 11):
    cm_sil, cm_len = silences(f'out/cm/s{k:02d}.wav')
    nw_sil, nw_len = silences(f'out/voice_raw/s{k:02d}.wav')
    al = ALIGN.get(k)
    if al is None:
        assert len(cm_sil) == len(nw_sil), (k, len(cm_sil), len(nw_sil))
        al = [(i, i, i) for i in range(len(cm_sil))]
    # prise CM → nouvelle prise (sans pauses)
    m = [(0, 0)]
    for c, s0, s1 in al:
        m += [(cm_sil[c][0], nw_sil[s0][0]), (cm_sil[c][1], nw_sil[s1][1])]
    m.append((cm_len, nw_len))
    # nouvelle prise → nouvelle prise + pauses (le silence s'allonge : son début reste, sa fin recule)
    lead, extra = LEAD[k], PAUSE[k]
    p = [(0, 0)]
    shift = lead
    for i, (a, b) in enumerate(nw_sil):
        p.append((a, a + shift))
        shift += extra.get(i, 0)
        p.append((b, b + shift))
    p.append((nw_len, nw_len + shift))
    # composition : ancre → CM → nouvelle → avec pauses, évaluée sur toutes les cassures
    F = lambda a: pw(p, pw(m, pw(OLD[k], a)))
    brk = {x for x, _ in OLD[k]}
    brk |= {pw(inv(OLD[k]), x) for x, _ in m}
    brk |= {pw(inv(OLD[k]), pw(inv(m), x)) for x, _ in p}
    brk = sorted(b for b in brk if b >= 0)
    pairs = [[round(a, 3), round(F(a), 3)] for a in brk]
    end = pairs[-1]
    pairs.append([round(end[0] + 30, 3), round(end[1] + 30, 3)])  # au-delà : vitesse normale
    out[str(k)] = pairs
    gaps[str(k)] = GAP.get(k, 0)
    # fichier son avec pauses
    w = wave.open(f'out/voice_raw/s{k:02d}.wav'); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    parts, last = [np.zeros(int(lead * sr), np.int16)], 0
    for i, (s0, s1) in enumerate(nw_sil):
        if i in extra:
            cut = int((s0 + s1) / 2 * sr)
            parts += [a[last:cut], np.zeros(int(extra[i] * sr), np.int16)]
            last = cut
    parts.append(a[last:])
    y = np.concatenate(parts)
    o = wave.open(f'assets/voice_fast/s{k:02d}.wav', 'wb')
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes(y.tobytes()); o.close()
    print(k, f'{nw_len:.2f}s → {len(y) / sr:.2f}s')

json.dump(out, open('tools/warp.json', 'w'))
json.dump(gaps, open('tools/gaps.json', 'w'))
open('src/warp.js', 'w').write(
    '// Calage de la voix « Chinese narration » (eleven_v4), pauses comprises : paires [temps des ancres,\n'
    '// temps de la prise] par clip — généré par tools/build_warp.py.\n'
    'window.WARP = ' + json.dumps(out) + ';\n')
