# Release report: pi-debug-mode 0.1.6

## Published and verified

- GitHub repository: https://github.com/liush2yuxjtu/pi-debug-mode
- GitHub Release: https://github.com/liush2yuxjtu/pi-debug-mode/releases/tag/v0.1.6
- npm: https://www.npmjs.com/package/pi-debug-mode
- npm registry record: https://registry.npmjs.org/pi-debug-mode/0.1.6
- Pi Package Gallery: https://pi.dev/packages/pi-debug-mode
- English site: https://liush2yuxjtu.github.io/pi-debug-mode/
- Chinese site: https://liush2yuxjtu.github.io/pi-debug-mode/zh/
- Release workflow: https://github.com/liush2yuxjtu/pi-debug-mode/actions/runs/34083286393

GitHub Actions published npm through Trusted Publisher OIDC. No npm token is stored in Git or GitHub Secrets.

## No-click media fix

Version 0.1.5 made every MP4 valid and directly reachable, but motion still depended on a click or hover. Version 0.1.6 changes the primary preview format instead of adding more video-player UI:

- README embeds English and Chinese animated GIFs as plain Markdown images, without link wrappers.
- Pi metadata exposes only `pi.image`, pointed at the English animated GIF.
- `pi.video` is omitted because Pi gives it precedence and presents modal/hover video behavior.
- Pi Gallery shows the animated GIF immediately in its preview and again at full README width.
- English and Chinese product pages embed their GIF directly, without a link wrapper.
- Product pages switch to static PNG posters for `prefers-reduced-motion: reduce`.
- Full MP4 recordings remain available as explicit secondary links and GitHub Release assets.

## Browser proof

A fresh Chromium context completed these checks without any click, hover, key press, or pointer action:

- GitHub README English GIF: frame changed after time advanced.
- GitHub README Chinese GIF: frame changed after time advanced.
- English product page GIF: frame changed after time advanced.
- Chinese product page GIF: frame changed after time advanced.
- Direct CDN English and Chinese GIFs: frames changed after time advanced.
- Pi Gallery primary thumbnail GIF: frame changed after time advanced.
- Pi Gallery README GIF: frame changed after time advanced.
- Pi Gallery contained zero `<video>` elements and showed exact version `0.1.6`.
- Reduced-motion browser contexts selected static PNG posters.
- Four MP4 files still decoded and played at 1280×720.
- Seven public pages returned HTTP 200 with no broken images or browser errors.

Recorded interaction count: **0**.

Release verifier result: **36 passed, 0 failed, 1 upstream metadata warning**.

## Animated previews

| Asset | Frames | Duration | Size | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `pi-debug-mode-preview.gif` | 98 | 12.26 s | 1,492,988 bytes | `58971ab9a7b39aeef73b3c110d9fc3309ac9a1a8a79d07dbc71e14dbee4ee201` |
| `pi-debug-mode-preview-zh.gif` | 98 | 12.26 s | 1,322,585 bytes | `1b4401a6b1abae2f19e0e2e6c865c9d429e3a159915d9ff00987ec7b7ddc52cf` |

Both are GIF89a, 800×450, 8 fps, infinitely looping, under 2 MiB, and served as `image/gif`. Full CDN downloads and GitHub Release downloads match local SHA-256 values.

## Full recordings

- English real TUI: https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.6/artifacts/demo/pi-debug-mode-real-tui.mp4
- Chinese real TUI: https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.6/artifacts/demo/pi-debug-mode-real-tui-zh.mp4
- English concept MP4: https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.6/artifacts/demo/pi-debug-mode-demo.mp4
- Chinese concept MP4: https://cdn.jsdelivr.net/gh/liush2yuxjtu/pi-debug-mode@v0.1.6/artifacts/demo/pi-debug-mode-demo-zh.mp4

The two concept videos and GIFs were regenerated from the 0.1.6 interactive demos on the configured Mac mini. `tools/demo-video/render.sh` now reproduces the GIF during future renders.

## Install commands

```bash
pi install npm:pi-debug-mode@0.1.6
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.6
```

An isolated `PI_CODING_AGENT_DIR` installation loaded `pi-debug-mode@0.1.6`, the animated image metadata, and `./src/index.ts` successfully.

## Package boundary

The npm tarball remains five files: `LICENSE`, `README.md`, `package.json`, `src/index.ts`, and `src/protocol.ts`. Public media stays in the tagged GitHub repository and jsDelivr CDN rather than adding megabytes to every install.

## Known external limits

- Pi Gallery refreshed to 0.1.6 about 19 minutes after npm publication. Repository code cannot remove this cache delay.
- Pi Gallery's site-wide Open Graph description remains generic. Upstream issue: https://github.com/earendil-works/pi/issues/6699.
- The npm website serves a Cloudflare anti-bot page to headless requests. Registry metadata, provenance, tarball integrity, and clean installation passed.

## Current evidence snapshot

- GitHub stars: 1
- GitHub forks: 0
- GitHub Release asset downloads: 0 at capture time
- npm download API window ended before publication; no adoption count claimed
- Pi Gallery downloads: not available

## Resume-safe claim

Published and verified `pi-debug-mode@0.1.6` on GitHub, npm, Pi Package Gallery, and GitHub Pages. English and Chinese animated previews now move inline with zero user interaction; full MP4 recordings remain public and playable.
