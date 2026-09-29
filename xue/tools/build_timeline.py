"""Calcule la timeline à partir des durées des clips de voix (voice_fast/*.wav)."""
import json, wave
LEAD, GAP, TAIL = 0.7, 0.55, 2.2
voice, t = [], LEAD
for i in range(1, 11):
    w = wave.open(f'assets/voice_fast/s{i:02d}.wav'); d = w.getnframes() / w.getframerate()
    voice.append({'start': round(t, 3), 'dur': round(d, 3)}); t += d + GAP
total = round(voice[-1]['start'] + voice[-1]['dur'] + TAIL, 3)
tl = {'voice': voice, 'total': total}
open('src/timeline.js', 'w').write('window.TIMELINE = ' + json.dumps(tl) + ';\n')
print(json.dumps(tl, indent=1))
