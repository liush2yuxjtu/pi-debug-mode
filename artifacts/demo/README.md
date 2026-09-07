# Demo artifacts

## Real TUI recording

- `pi-debug-mode-real-tui.cast`: raw asciinema capture from a live Pi session attached through tmux.
- `pi-debug-mode-real-tui.compact.cast`: same capture with long human-wait intervals compressed.
- `pi-debug-mode-real-tui.mp4`: browser playback recorded and encoded on the configured Mac mini.
- `pi-debug-mode-real-tui-poster.png`: static poster for the full recording.
- `pi-debug-mode-real-tui-contact-sheet.png`: full-duration visual QA evidence.
- `pi-debug-mode-real-tui-zh.cast`: raw Chinese Pi TUI capture.
- `pi-debug-mode-real-tui-zh.compact.cast`: trimmed Chinese capture used for playback.
- `pi-debug-mode-real-tui-zh.mp4`: 57-second Chinese real-machine demo.
- `pi-debug-mode-real-tui-zh-poster.png`: Chinese README preview.
- `pi-debug-mode-real-tui-zh-contact-sheet.png`: Chinese full-duration QA evidence.

Rebuild English with `tools/real-tui-video/render.sh`; rebuild Chinese with `tools/real-tui-video/render.sh zh`. Both must run through `video-render-macmini`.

## Concept demo

`pi-debug-mode-demo.mp4` is generated from `docs/demo.html` by `tools/demo-video/render.sh`. `pi-debug-mode-demo-zh.mp4` is generated from `docs/demo-zh.html` by `tools/demo-video/render.sh zh`. Both are deterministic simulations, not real TUI captures.

- `pi-debug-mode-preview.gif`: 800×450, 8 fps, 98-frame English inline loop derived from the concept MP4.
- `pi-debug-mode-preview-zh.gif`: matching Chinese inline loop.

The README embeds both GIFs without link wrappers. `pi.image` uses the English GIF as the Pi Gallery primary preview; `pi.video` is intentionally omitted so motion appears without opening the video modal. Owned product pages embed the GIF directly and use the static PNG poster when `prefers-reduced-motion: reduce` is active.

All browser recording, video conversion, GIF creation, poster capture, and contact-sheet rendering runs on the configured Mac mini.
