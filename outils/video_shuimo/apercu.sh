#!/bin/sh
# Aperçus rapides d'un épisode shuimo, pour ajuster avant le vrai rendu 720p.
#   ./apercu.sh <Composition> brouillon            → toute la vidéo en 360p (≈ 2–3× plus rapide que le 720p)
#   ./apercu.sh <Composition> scene <début> <fin>  → un passage seulement (secondes), en 540p, quelques minutes
#   ./apercu.sh <Composition> final                → 720p, loudnorm −14 LUFS (le vrai aperçu téléphone)
# Sorties : outils/moteur/out/preview/<composition>_<mode>[_<début>-<fin>].mp4
set -e
C=$1; MODE=${2:-brouillon}
cd "$(dirname "$0")/../moteur/remotion"
node sync.mjs >/dev/null
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
[ -x "$HS" ] && BROWSER="--browser-executable=$HS" || BROWSER=""
N=$(nproc); OUT=../out/preview; mkdir -p $OUT
NAME=$(echo "$C" | tr 'A-Z' 'a-z')
case $MODE in
  brouillon) npx remotion render src/index.ts "$C" $OUT/${NAME}_brouillon.mp4 --scale=0.3333333333333333 --crf=34 --concurrency=$N --audio-codec=aac --audio-bitrate=96k $BROWSER ;;
  scene) F0=$(python3 -c "print(round($3*30))"); F1=$(python3 -c "print(round($4*30))")
    npx remotion render src/index.ts "$C" $OUT/${NAME}_scene_$3-$4.mp4 --frames=$F0-$F1 --scale=0.5 --crf=30 --concurrency=$N --timeout=200000 --audio-codec=aac $BROWSER ;;
  final) npx remotion render src/index.ts "$C" $OUT/${NAME}_raw.mp4 --scale=0.6666666666666666 --crf=30 --concurrency=$N --audio-codec=aac $BROWSER
    FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
    $FF -y -loglevel error -i $OUT/${NAME}_raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 160k $OUT/${NAME}_720.mp4 ;;
  *) echo "mode inconnu : $MODE"; exit 1 ;;
esac
