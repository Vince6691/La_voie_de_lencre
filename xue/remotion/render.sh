#!/bin/sh
# Rendu complet de la version Remotion → out/xue_remotion.mp4
set -e
cd "$(dirname "$0")"
node sync.mjs
# navigateur : celui de Remotion par défaut ; ici celui préinstallé s'il existe
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
[ -x "$HS" ] && BROWSER="--browser-executable=$HS" || BROWSER=""
npx remotion render Xue out/xue_remotion.mp4 --concurrency=4 --crf=18 --audio-codec=aac --audio-bitrate=256k $BROWSER "$@"
