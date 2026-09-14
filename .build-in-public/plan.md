# Distribution plan for 0.1.9

## Canonical artifact and version

- Artifact: Pi extension and npm package `pi-debug-mode`
- Current release candidate: `0.1.9`
- Previous npm release: `0.1.8`, which contains the usage funnel wrapper but not the Autopilot code merged in PR #11
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT

## Release change

Version 0.1.9 publishes the Autopilot behavior merged in PR #11. It adds an Autopilot choice inside the existing `debug_reproduction` tool. Autopilot changes prompt guidance only. It does not add a slash command, start a background runner, simulate clicks, or bypass approval.

Machine-checkable work stays with Pi. Visual, click, touch, and aesthetic judgments keep a human checkpoint. The first Autopilot result is a mode handoff. Machine paths use no second checkpoint. Human paths use one additional checkpoint with `humanReason`.

## Evidence and media

- The original Guided UI demo remains unchanged.
- `artifacts/demo/pi-debug-mode-demo-0.1.8.mp4` is a fresh 12.60-second replay of the old Guided UI flow. The release keeps its historical filename and links it from the 0.1.9 surfaces.
- The replay poster, contact sheet, and `markers-0.1.8.json` came from the same Mac mini render.
- The real TUI recordings remain unchanged and document the earlier live-machine workflow.
- The final public regression run passed 20/20 with `openai-codex/gpt-5.6-luna` and minimal thinking.

## Direct channels

### GitHub and README

Publish the source, `CHANGELOG.md`, Autopilot behavior documentation, and existing demo artifacts from the canonical repository.

### npm and Pi Package Gallery

Publish `pi-debug-mode@0.1.9` with `pi.image` pinned to the `v0.1.9` real-TUI GIF. Keep `pi.video` omitted so the animated image remains the primary no-click preview.

### GitHub Pages

Publish the updated English and Chinese pages. Keep the old Guided interactive demo labeled as a historical simulation. Do not claim that its video demonstrates Autopilot behavior.

## Release gates

- `npm test`
- `npm run typecheck`
- `npm run verify:release -- --mode local`
- `npm pack --dry-run`
- 20-case public regression evaluation
- no secrets, local runtime paths, or private browser state in the package
- old video hash preserved

## Authentication and publication gates

- GitHub Release publication and npm publication are public mutations.
- Use official GitHub and npm flows only.
- Verify public status after every publication. Do not infer publication from a local commit or upload response.
- Pi Package Gallery refresh remains upstream-controlled.

## Rollback

Do not move published tags. If `0.1.9` is published and a problem is found, publish a new patch release and update pinned URLs. Revert the release branch before push if local gates fail.

## Resume-safe reporting

Record the branch, commit, tag, package checksum, public URLs, publication status, and verification command results in `.build-in-public/release-report.md` after the public release completes. Keep historical release evidence files unchanged.
