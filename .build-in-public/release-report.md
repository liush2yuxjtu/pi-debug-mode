# Release report: pi-debug-mode 0.1.5

## Published and verified

- GitHub repository: https://github.com/liush2yuxjtu/pi-debug-mode
- GitHub Release: https://github.com/liush2yuxjtu/pi-debug-mode/releases/tag/v0.1.5
- npm: https://www.npmjs.com/package/pi-debug-mode
- npm registry record: https://registry.npmjs.org/pi-debug-mode/0.1.5
- Pi Package Gallery: https://pi.dev/packages/pi-debug-mode
- English site: https://liush2yuxjtu.github.io/pi-debug-mode/
- Chinese site: https://liush2yuxjtu.github.io/pi-debug-mode/zh/
- Release workflow: https://github.com/liush2yuxjtu/pi-debug-mode/actions/runs/34080128914

GitHub Actions published npm through Trusted Publisher OIDC. No npm token is stored in Git or GitHub Secrets.

## Media fix

Version 0.1.3 used relative README paths. Pi Gallery rewrote them to npm CDN URLs, but the lean npm tarball intentionally excluded demo media, so the README poster and links returned 404.

Version 0.1.4 replaced those paths with absolute tag-backed URLs. Version 0.1.5 moved all public preview URLs to jsDelivr's immutable GitHub-tag route. Each MP4 now returns `video/mp4`, supports byte ranges, and remains outside the npm tarball.

GitHub Release `v0.1.5` also exposes four MP4 files and four PNG posters as visible release assets.

## Browser verification

- Seven public pages returned HTTP 200: repository, release, English site, Chinese site, two demos, and Pi Gallery.
- No broken images, page errors, console errors, or horizontal overflow remained.
- Pi Gallery showed exact version `0.1.5` and current CDN media URLs.
- Pi Gallery's fullscreen video advanced its playhead, reported no media error, and decoded at 1280×720 for 80.92 seconds.
- All four public MP4 files decoded and played in Chromium.
- Full remote CDN and GitHub Release downloads matched local SHA-256 values.

Release verifier result: **36 passed, 0 failed, 1 upstream warning**.

## Media

| Asset | Duration | Format | SHA-256 |
| --- | ---: | --- | --- |
| `pi-debug-mode-real-tui.mp4` | 80.92 s | H.264 MP4, 1280×720 | `31d106caafde58e3783344f048135ac260bb3a40b870b15c2e6d144ce7ee062f` |
| `pi-debug-mode-real-tui-zh.mp4` | 57 s | H.264 MP4, 1280×720 | `b8fe70c29bd25f1caecae18d0de027540638bfb441cbbbea5e80c12a4b75c1fc` |
| `pi-debug-mode-demo.mp4` | 12.48 s | H.264 MP4, 1280×720 | `047e6ccf607f357d4297e507c87f8210e11d56e1692cdefcac2849c1c4a07f1e` |
| `pi-debug-mode-demo-zh.mp4` | 12.48 s | H.264 MP4, 1280×720 | `cb968136a73a17a3ac539ca4ee00788d1227266f35caad782d0ea81025b64652` |

No GIF is published. Pi documents MP4 as the Gallery video format; PNG supplies the static poster.

## Install commands

```bash
pi install npm:pi-debug-mode@0.1.5
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.5
```

An isolated `PI_CODING_AGENT_DIR` install loaded `pi-debug-mode@0.1.5` and `./src/index.ts` successfully.

## Public metadata

GitHub now has the Pages homepage, a specific repository description, and topics for Pi, debugging, TypeScript, developer tools, and runtime instrumentation.

Pi Gallery's site-wide Open Graph description remains generic. This upstream limitation is tracked at https://github.com/earendil-works/pi/issues/6699 and does not affect package version, preview media, README, or installation.

The npm website returns a Cloudflare anti-bot page to headless requests. Official registry metadata, package integrity, provenance, tarball contents, and clean installation all passed.

## Current evidence snapshot

- GitHub stars: 0
- GitHub forks: 0
- GitHub Release asset counters: verification downloads only; not adoption evidence
- npm download API window ended before publication; no adoption count claimed
- Pi Gallery downloads: not available

## Resume-safe claim

Published and verified `pi-debug-mode@0.1.5` on GitHub, npm, Pi Package Gallery, and GitHub Pages. Four H.264 MP4 demos and four PNG posters are public; every CDN MP4 returns `video/mp4`, matches its release hash, and plays in Chromium.
