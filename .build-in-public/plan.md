# Distribution plan for 0.1.7

## Canonical artifact and version

- Artifact: Pi extension and npm package `pi-debug-mode`
- Current verified release: `0.1.6`, tag `v0.1.6`
- Target patch: `0.1.7`, tag `v0.1.7`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT

## Problem and replacement

Version 0.1.6 used a concept-demo GIF as primary preview. It looped without a click but showed simulated UI rather than the real Pi TUI. Version 0.1.7 replaces both English and Chinese primary GIFs with 12-second segments from the real-machine Pi TUI recordings, seconds 10–22.

## Direct channels

### GitHub and README

- Embed real-TUI English and Chinese GIFs directly without link wrappers.
- Keep complete real-machine MP4 recordings as explicit secondary links and release assets.
- Attach two real-TUI GIFs, four MP4 files, and four PNG posters to release `v0.1.7`.

### npm and Pi Package Gallery

- Publish `pi-debug-mode@0.1.7` through existing Trusted Publisher OIDC.
- Use only `pi.image`, pointed at the real-TUI English GIF.
- Omit `pi.video` so the Gallery primary preview remains inline image animation.
- Keep media outside the five-file npm tarball through immutable jsDelivr GitHub-tag URLs.

### GitHub Pages

- Embed real-TUI English and Chinese GIF segments directly.
- Use static PNG posters for `prefers-reduced-motion: reduce`.
- Keep complete real-machine MP4 links and interactive simulations as secondary routes.

## Wrapper channels

None. Native Pi package channels only.

## Release waves

1. Replace primary GIF bytes with real-TUI 10–22s segments; do all GIF work on Mac mini.
2. Bump package and public docs to 0.1.7.
3. Run tests, typecheck, package dry-run, local verifier, GIF metadata checks, and local browser QA.
4. Merge, deploy Pages, create immutable `v0.1.7`, and run tagged verifier.
5. Publish GitHub Release and npm through OIDC.
6. Wait for Pi Gallery cache refresh; verify exact version, current GIF URL, zero `<video>` elements, and frame changes with zero interaction.
7. Record release evidence and metrics.

Rollback remains patch-only. Never move a published tag.

## Known boundaries

- Pi Gallery refresh delay remains upstream-controlled.
- Pi Gallery social metadata remains generic under upstream issue https://github.com/earendil-works/pi/issues/6699.
- Full MP4 remains available for users wanting complete evidence; primary previews now show real TUI motion.
