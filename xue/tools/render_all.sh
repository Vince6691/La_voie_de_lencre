#!/bin/sh
# Rendu parallèle en 4 segments puis assemblage avec la bande-son.
set -e
cd "$(dirname "$0")/.."
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
python3 tools/render.py cues > out/cues.json
python3 tools/audio.py
TOTAL=$(python3 -c "import json;print(json.load(open('out/cues.json'))['total'])")
python3 - "$TOTAL" > out/chunks.txt <<'PY'
import sys; T=float(sys.argv[1]); n=4; fps=30; F=round(T*fps); s=[round(F*i/n) for i in range(n+1)]
for i in range(n): print(s[i]/fps, s[i+1]/fps, i)
PY
while read a b i; do python3 tools/render.py video 30 $a $b out/part$i.mp4 > out/part$i.log 2>&1 & done < out/chunks.txt
wait
printf "file 'part0.mp4'\nfile 'part1.mp4'\nfile 'part2.mp4'\nfile 'part3.mp4'\n" > out/parts.txt
$FF -y -loglevel error -f concat -safe 0 -i out/parts.txt -c copy out/frames.mp4
$FF -y -loglevel error -i out/frames.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -shortest -movflags +faststart out/xue_evolution.mp4
echo done
