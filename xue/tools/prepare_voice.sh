#!/bin/sh
# Rogne les silences de début/fin et normalise le volume (−18 LUFS) : assets/voice_cn → out/voice_raw (puis tools/build_warp.py insère les pauses → assets/voice_fast)
cd "$(dirname "$0")/.."
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
mkdir -p out/voice_raw
for f in assets/voice_cn/s*.mp3; do
  n=$(basename "$f" .mp3)
  "$FF" -y -loglevel error -i "$f" -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2:LRA=11" -ar 44100 -ac 1 "out/voice_raw/$n.wav"
done
