#!/bin/sh
# Rendu 720p par morceaux (une tâche de fond est coupée au bout de 2 h ; une correction ne refait que son morceau).
#   ./rendu_morceaux.sh <Composition> <pinyin> bundle             → sync + bundle (une fois, après chaque modification)
#   ./rendu_morceaux.sh <Composition> <pinyin> morceau <début> <fin> → images [début, fin] sans son (≈ 45 min / 3000 images)
#   ./rendu_morceaux.sh <Composition> <pinyin> assembler           → bande son (bande_son.py : voix + bruitages + musique)
#                                                                   + concaténation → episodes/<pinyin>/apercus/<pinyin>_720.mp4
# Morceaux : xue/out/preview/morceaux/<composition>/m_<début>.mp4 (assemblés dans l'ordre des débuts).
set -e
C=$1; P=$2; MODE=$3
R="$(cd "$(dirname "$0")/../.." && pwd)"; NAME=$(echo "$C" | tr 'A-Z' 'a-z')
O=$R/xue/out/preview/morceaux/$NAME; B=$R/xue/out/preview/morceaux/bundle_$NAME; mkdir -p $O
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
[ -x "$HS" ] && BROWSER="--browser-executable=$HS" || BROWSER=""
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
cd $R/xue/remotion
case $MODE in
  bundle) node sync.mjs >/dev/null; rm -rf $B; npx remotion bundle src/index.ts --out-dir=$B ;;
  morceau) npx remotion render $B "$C" $O/m_$(printf %06d $4).mp4 --frames=$4-$5 --scale=0.6666666666666666 --crf=30 --concurrency=$(nproc) --muted $BROWSER ;;
  assembler) python3 $R/outils/video_shuimo/bande_son.py $R/episodes/$P/episode.json $O/son.wav
    ls $O/m_*.mp4 | sort | sed "s/^/file '/; s/$/'/" > $O/liste.txt
    $FF -y -loglevel error -f concat -safe 0 -i $O/liste.txt -i $O/son.wav -map 0:v -map 1:a -c:v copy -ar 48000 -ac 2 -c:a aac -b:a 160k $R/episodes/$P/apercus/${P}_720.mp4
    echo $R/episodes/$P/apercus/${P}_720.mp4 ;;
  *) echo "mode inconnu : $MODE"; exit 1 ;;
esac
