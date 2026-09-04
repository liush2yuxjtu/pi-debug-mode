#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
LOCALE="${1:-en}"
if [[ "$LOCALE" == "zh" ]]; then
  export DEMO_LOCALE=zh
  SUFFIX="-zh"
  PAGE="demo-zh.html"
else
  SUFFIX=""
  PAGE="demo.html"
fi
mkdir -p artifacts/demo
npm install --prefix tools/demo-video --ignore-scripts --no-audit --no-fund
SESSION="pi-debug-video-$$"
cleanup() { tmux kill-session -t "$SESSION" 2>/dev/null || true; }
trap cleanup EXIT
tmux new-session -d -s "$SESSION" "cd '$PWD' && python3 -m http.server 41731 --bind 127.0.0.1"
for _ in {1..40}; do curl -fsS "http://127.0.0.1:41731/docs/$PAGE" >/dev/null && break; sleep .25; done
node tools/demo-video/record.mjs
ffmpeg -y -i "artifacts/demo/pi-debug-mode-demo${SUFFIX}.webm" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "artifacts/demo/pi-debug-mode-demo${SUFFIX}.mp4"
ffmpeg -y -i "artifacts/demo/pi-debug-mode-demo${SUFFIX}.mp4" -vf "fps=1,scale=320:-1,tile=4x3" -frames:v 1 -update 1 "artifacts/demo/contact-sheet${SUFFIX}.png"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,pix_fmt -of json "artifacts/demo/pi-debug-mode-demo${SUFFIX}.mp4"
