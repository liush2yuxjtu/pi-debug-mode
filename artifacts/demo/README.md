# Demo artifacts

## Real TUI recording

- `pi-debug-mode-real-tui.cast`: raw asciinema capture from a live Pi session attached through tmux.
- `pi-debug-mode-real-tui.compact.cast`: same capture with long human-wait intervals compressed.
- `pi-debug-mode-real-tui.mp4`: browser playback recorded and encoded on the configured Mac mini.
- `pi-debug-mode-real-tui-poster.png`: README and Pi Gallery preview.
- `pi-debug-mode-real-tui-contact-sheet.png`: full-duration visual QA evidence.

Rebuild with `tools/real-tui-video/render.sh` through `video-render-macmini`.

## Concept demo

`pi-debug-mode-demo.mp4` is generated from `docs/demo.html` by `tools/demo-video/render.sh`. It is a deterministic simulation, not the real TUI capture.

All browser recording, video conversion, poster capture, and contact-sheet rendering runs on the configured Mac mini.
