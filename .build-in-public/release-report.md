# Release report

## Published and verified

- GitHub Release: [`v0.1.3`](https://github.com/liush2yuxjtu/pi-debug-mode/releases/tag/v0.1.3)
- npm: [`pi-debug-mode@0.1.3`](https://www.npmjs.com/package/pi-debug-mode)
- Pi Package Gallery: [`pi-debug-mode`](https://pi.dev/packages/pi-debug-mode)
- GitHub Actions release run: [successful](https://github.com/liush2yuxjtu/pi-debug-mode/actions/runs/33855786137)
- Authentication: npm Trusted Publisher through GitHub Actions OIDC; no npm token stored in Git or GitHub Secrets

## Real TUI evidence

- Real machine, real Pi TUI, published extension source, and `openai-codex/gpt-5.6-sol`
- `/debug` invocation on an isolated checkout-rounding bug
- Three competing hypotheses before mutation
- Temporary `pi-debug` runtime probes
- Real `debug_reproduction` selection UI
- Reproduced result: actual 1083 versus expected 1084
- Evidence-backed `Math.floor` to `Math.round` fix
- Human Fixed selection, probe cleanup, and final passing test
- Raw and compressed asciinema casts retained
- Browser recording, H.264 conversion, poster, and contact sheet rendered on Mac mini

## Install commands

```bash
pi install npm:pi-debug-mode@0.1.3
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.3
```

## Verification

- Unit tests and TypeScript typecheck: pass
- npm package metadata, integrity, and clean install: pass
- GitHub OIDC release workflow: pass
- Pi Gallery listing: HTTP 200
- Version-pinned MP4 and PNG Gallery assets: HTTP 200
- MP4: H.264, `yuv420p`, 1280×720, 80.92 seconds
- Full-duration contact-sheet inspection: pass

## Resume-safe claim

Published and verified `pi-debug-mode@0.1.3` on GitHub, npm, and Pi Package Gallery with tokenless GitHub OIDC releases and a real-machine Pi TUI recording of the complete evidence-first debug loop.
