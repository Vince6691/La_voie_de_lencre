#!/bin/sh
# Rendu 720p par morceaux (une tâche de fond est coupée au bout de 2 h ; une correction ne refait que son morceau).
#   ./rendu_morceaux.sh <Composition> <pinyin> bundle             → sync + bundle (une fois, après chaque modification)
#   ./rendu_morceaux.sh <Composition> <pinyin> morceau <début> <fin> → images [début, fin] sans son (≈ 45 min / 3000 images)
#   ./rendu_morceaux.sh <Composition> <pinyin> assembler           → bande son (bande_son.py : voix + bruitages + musique)
#                                                                   + concaténation → episodes/<pinyin>/apercus/<pinyin>_720.mp4
# Morceaux : xue/out/preview/morceaux/<composition>/m_<début>.mp4 (assemblés dans l'ordre des débuts, réencodés ensemble).
# Pour refaire la fin seulement : recouper le morceau précédent (ffmpeg -frames:v N) puis rendre la suite ; l'assemblage
# réencode tout, donc des morceaux aux réglages différents ne posent plus de problème.
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
    # morceaux décodés un à un puis réencodés ensemble (filtre concat) : un morceau recoupé ou réencodé à part
    # (autre format de pixel, autre base de temps) ne fige plus l'image comme avec une simple copie (-c:v copy)
    IN=""; N=0; for m in $(ls $O/m_*.mp4 | sort); do IN="$IN -i $m"; N=$((N+1)); done
    F=""; for i in $(seq 0 $((N-1))); do F="$F[$i:v]setpts=PTS-STARTPTS,format=yuv420p[v$i];"; done
    for i in $(seq 0 $((N-1))); do F="$F[v$i]"; done
    $FF -y -loglevel error $IN -i $O/son.wav -filter_complex "${F}concat=n=$N:v=1:a=0[v]" -map "[v]" -map $N:a \
      -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart -ar 48000 -ac 2 -c:a aac -b:a 160k $R/episodes/$P/apercus/${P}_720.mp4
    echo $R/episodes/$P/apercus/${P}_720.mp4 ;;
  *) echo "mode inconnu : $MODE"; exit 1 ;;
esac
