"""Calcule la timeline à partir des durées des clips de voix (voice_fast/*.wav)."""
import json, wave
LEAD, TAIL = 0.7, 3.0
GAPS = json.load(open('tools/gaps.json'))  # silence après chaque clip (tools/build_warp.py)
voice, t = [], LEAD
for i in range(1, 11):
    w = wave.open(f'assets/voice_fast/s{i:02d}.wav'); d = w.getnframes() / w.getframerate()
    voice.append({'start': round(t, 3), 'dur': round(d, 3)}); t += d + GAPS.get(str(i), 1.0)
total = round(voice[-1]['start'] + voice[-1]['dur'] + TAIL, 3)
tl = {'voice': voice, 'total': total}
open('src/timeline.js', 'w').write('window.TIMELINE = ' + json.dumps(tl) + ';\n')
print(json.dumps(tl, indent=1))
