# Release report: pi-debug-mode 0.1.7

## Published and verified

- GitHub repository: https://github.com/liush2yuxjtu/pi-debug-mode
- GitHub Release: https://github.com/liush2yuxjtu/pi-debug-mode/releases/tag/v0.1.7
- npm: https://www.npmjs.com/package/pi-debug-mode
- npm registry: https://registry.npmjs.org/pi-debug-mode/0.1.7
- Pi Package Gallery: https://pi.dev/packages/pi-debug-mode
- English site: https://liush2yuxjtu.github.io/pi-debug-mode/
- Chinese site: https://liush2yuxjtu.github.io/pi-debug-mode/zh/
- Release workflow: https://github.com/liush2yuxjtu/pi-debug-mode/actions/runs/34093648620

## What changed

v0.1.6 primary GIFs showed deterministic concept UI. v0.1.7 replaces them with actual Pi TUI recordings captured on a real machine:

- English GIF: seconds 10–22 of `pi-debug-mode-real-tui.mp4`.
- Chinese GIF: seconds 10–22 of `pi-debug-mode-real-tui-zh.mp4`.
- README embeds both directly without click wrappers.
- Pi Gallery uses real English TUI GIF as `pi.image`; `pi.video` remains omitted.
- GitHub Pages embeds real English/Chinese TUI GIFs directly.
- Full real-TUI MP4 recordings remain available as secondary links.

## No-click browser proof

Fresh Chromium context. No clicks, hovers, keyboard input, or pointer actions.

- GitHub README English preview: frame changed.
- GitHub README Chinese preview: frame changed.
- English Pages preview: frame changed.
- Chinese Pages preview: frame changed.
- Pi Gallery thumbnail: frame changed.
- Pi Gallery README preview: frame changed.
- Direct English and Chinese GIFs: frame changed.
- Pi Gallery contained zero `<video>` elements.
- Seven public pages returned HTTP 200.
- No broken images, console errors, or horizontal overflow.
- Reduced-motion contexts selected static PNG posters.
- Four MP4 files decoded and played successfully.

Recorded interaction count: **0**.

Release verifier: **36 passed, 0 failed, 1 upstream warning**.

## Primary GIFs

| Asset | Source | Frames | Duration | SHA-256 |
| --- | --- | ---: | ---: | --- |
| `pi-debug-mode-preview.gif` | Real English TUI, 10–22s | 96 | 12s | `a6006f3b3e9ddddc5a649576bc3df4172dd38a98902e13701c564a6e32688a49` |
| `pi-debug-mode-preview-zh.gif` | Real Chinese TUI, 10–22s | 96 | 12s | `6cd7c33bd0150687e3d7dda29994f085c9762e46d659b9b6df8adad713c1c8f6` |

Both: 800×450, infinite loop, under 1 MiB, `image/gif`.

## Full recordings

- [English real TUI MP4](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.7/artifacts/demo/pi-debug-mode-real-tui.mp4)
- [Chinese real TUI MP4](https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.7/artifacts/demo/pi-debug-mode-real-tui-zh.mp4)

## Install

```bash
pi install npm:pi-debug-mode@0.1.7
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.7
```

Isolated Pi installation passed. npm tarball remains five files and excludes media payloads.

## External limits

- Pi Gallery social description remains generic because of upstream issue https://github.com/earendil-works/pi/issues/6699.
- npm website anti-bot page affects automated HTML requests; registry metadata, provenance, tarball, and clean install passed.
- Full MP4 and GIF asset downloads are not adoption metrics.

## Resume-safe claim

Published and verified `pi-debug-mode@0.1.7` with real Pi TUI GIF previews across GitHub README, Pi Package Gallery, and GitHub Pages. Primary previews now show actual TUI output without requiring a click.
