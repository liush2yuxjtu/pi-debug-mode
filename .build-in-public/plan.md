# Distribution plan for 0.1.8

## Canonical artifact and version

- Artifact: Pi extension and npm package `pi-debug-mode`
- Current release candidate: `0.1.8`
- Previous verified release: `0.1.7`, tag `v0.1.7`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT

## Release change

Version 0.1.8 adds an Autopilot choice inside the existing `debug_reproduction` tool. Autopilot changes prompt guidance only. It does not add a slash command, start a background runner, simulate clicks, or bypass approval.

Machine-checkable work stays with Pi. Visual, click, touch, and aesthetic judgments keep a human checkpoint. The first Autopilot result is a mode handoff. Machine paths use no second checkpoint. Human paths use one additional checkpoint with `humanReason`.

## Evidence and media

- The existing Guided UI demo video remains unchanged as a historical compatibility recording.
- `artifacts/demo/pi-debug-mode-demo.mp4` and its poster remain deterministic Guided simulation evidence.
- The real TUI recordings remain unchanged and continue to document the earlier live-machine workflow.
- A new video render was not produced because the Mac mini gate reported less than 10 GiB free space. No local MacBook rendering was used.
- The 20-case Autopilot prompt evaluation passed 20/20 with `openai-codex/gpt-5.6-luna` and minimal thinking.

## Direct channels

### GitHub and README

Publish the source, `CHANGELOG.md`, Autopilot behavior documentation, and existing demo artifacts from the canonical repository.

### npm and Pi Package Gallery

Publish `pi-debug-mode@0.1.8` with `pi.image` pinned to the `v0.1.8` real-TUI GIF. Keep `pi.video` omitted so the animated image remains the primary no-click preview.

### GitHub Pages

Publish the updated English and Chinese pages. Keep the old Guided interactive demo labeled as a historical simulation. Do not claim that its video demonstrates Autopilot.

## Release gates

- `npm test`
- `npm run typecheck`
- `npm run verify:release -- --mode local`
- `npm pack --dry-run`
- 20-case prompt evaluation and `evals/benchmark.json`
- no secrets, local runtime paths, or private browser state in the package
- old video and poster hashes preserved unless a future remote render is explicitly approved

## Authentication and publication gates

- GitHub push, GitHub Release, npm publish, Pi Package Gallery refresh, and GitHub Pages publication are public mutations.
- Use official GitHub and npm flows only.
- Verify public status after every publication. Do not infer publication from a local commit or upload response.
- If the Mac mini disk gate remains below 10 GiB, keep the existing video and report the render as `waiting-machine`.

## Rollback

Do not move the published `v0.1.7` tag. If `0.1.8` is published and a problem is found, publish a new patch release and update pinned URLs. Revert the feature branch before push if local gates fail.

## Resume-safe reporting

Record the branch, commit, tag, package checksum, public URLs, publication status, and verification command results in `.build-in-public/release-report.md` after the public release completes. Keep historical release evidence files unchanged.
