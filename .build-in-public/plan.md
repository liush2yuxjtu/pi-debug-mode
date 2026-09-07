# Distribution plan for 0.1.7

## Canonical artifact and version

- Artifact: Pi extension and npm package `pi-debug-mode`
- Current verified release: `0.1.7`, tag `v0.1.7`
- Previous release: `0.1.6`, tag `v0.1.6`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT

## Problem and replacement

Version 0.1.6 used concept-demo GIFs as primary previews. Version 0.1.7 replaces both English and Chinese primary GIFs with 12-second segments from the real-machine Pi TUI recordings, seconds 10–22.

## Completed release waves

1. Replaced primary GIF bytes with real-TUI 10–22s segments; encoding ran on Mac mini only.
2. Bumped package and public surfaces to 0.1.7.
3. Passed tests, typecheck, package dry-run, local verifier, GIF metadata checks, and local browser QA.
4. Merged to `main`, deployed Pages, and created immutable `v0.1.7`.
5. Published ten GitHub Release assets and npm through OIDC.
6. Verified exact Pi Gallery version, current real-TUI GIF URL, zero `<video>` elements, and zero-click frame changes.
7. Recorded release evidence and metrics.

## Direct channels

### GitHub and README

English and Chinese GIF previews embed actual Pi TUI output without link wrappers. Complete real-machine MP4 recordings remain explicit secondary links.

### npm and Pi Package Gallery

`pi-debug-mode@0.1.7` uses only `pi.image`, pointed at the real-TUI English GIF. `pi.video` remains omitted so Gallery shows image animation instead of modal video behavior.

### GitHub Pages

English and Chinese pages embed real-TUI GIF segments. Reduced-motion users receive static PNG posters. Full MP4 recordings remain secondary links.

## Rollback

Patch-only releases. Never move a published tag. If media source needs another change, publish a new patch and update all pinned URLs.

## Known boundaries

- Pi Gallery refresh delay remains upstream-controlled.
- Pi Gallery social metadata remains generic under https://github.com/earendil-works/pi/issues/6699.
- Full MP4 remains available for complete evidence; primary previews show real TUI motion.
