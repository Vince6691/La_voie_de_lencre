"""Voix de la version shuimo v2 : assets/voice_sx/bNN.mp3 → silences rognés, −18 LUFS → bNN.wav ;
détecte les pauses (> 0,22 s) pour caler l'image sur les phrases → assets/voice_sx/segments.json
({clip: {duration, starts: [début de chaque segment parlé]}})."""
import glob, json, os, subprocess, wave
import numpy as np
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
D = os.path.join(os.path.dirname(__file__), '..', 'assets', 'voice_sx')
out = {}
for mp3 in sorted(glob.glob(os.path.join(D, 'b*.mp3'))):
    n = os.path.basename(mp3)[:-4]
    wav = os.path.join(D, n + '.wav')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', mp3, '-af',
                    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2:LRA=11',
                    '-ar', '44100', '-ac', '1', wav], check=True)
    w = wave.open(wav); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    hop = int(sr * 0.02)
    db = np.array([20 * np.log10(np.sqrt(np.mean(a[j:j + hop] ** 2)) + 1e-9) for j in range(0, len(a) - hop, hop)])
    voiced = db > -38
    starts, k, sil = [0.0], 0, 0
    for i, v in enumerate(voiced):
        if not v: sil += 1; continue
        if sil * 0.02 > 0.22 and i * 0.02 - starts[-1] > 0.3: starts.append(round(i * 0.02, 2))
        sil = 0
    out[n] = {'duration': round(len(a) / sr, 2), 'starts': starts}
json.dump(out, open(os.path.join(D, 'segments.json'), 'w'), indent=1)
for k, v in out.items(): print(k, v['duration'], v['starts'])
