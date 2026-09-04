#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
LOCALE="${1:-en}"
if [[ "$LOCALE" == "zh" ]]; then
  export DEMO_LOCALE=zh
  SUFFIX="-zh"
  PLAYER="player-zh.html"
  POSTER_AT=20
else
  SUFFIX=""
  PLAYER="player.html"
  POSTER_AT=8
fi
python3 tools/real-tui-video/compact_cast.py "$LOCALE"
npm install --prefix tools/real-tui-video --ignore-scripts --no-audit --no-fund
SESSION="pi-debug-real-video-$$"
cleanup() { tmux kill-session -t "$SESSION" 2>/dev/null || true; }
trap cleanup EXIT
tmux new-session -d -s "$SESSION" "cd '$PWD' && python3 -m http.server 41732 --bind 127.0.0.1"
for _ in {1..40}; do curl -fsS "http://127.0.0.1:41732/tools/real-tui-video/$PLAYER" >/dev/null && break; sleep .25; done
node tools/real-tui-video/record.mjs
ffmpeg -y -i "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}.webm" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}.mp4"
ffmpeg -y -ss "$POSTER_AT" -i "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}.mp4" -frames:v 1 -update 1 "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}-poster.png"
ffmpeg -y -i "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}.mp4" -vf "fps=1/8,scale=320:-1,tile=4x3" -frames:v 1 -update 1 "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}-contact-sheet.png"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,pix_fmt -of json "artifacts/demo/pi-debug-mode-real-tui${SUFFIX}.mp4"
