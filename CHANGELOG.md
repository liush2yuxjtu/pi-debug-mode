# Changelog

All notable changes to `pi-debug-mode` are recorded here.

## [0.1.8] 2026-09-11

### Added

- Added `Autopilot — Agent 自行验证` to the existing `debug_reproduction` checkpoint.
- Added `humanReason` for checkpoints that require visual, click, touch, or aesthetic judgment.
- Added persisted Autopilot state. Older session entries without `autopilot` remain Guided.
- Added 20 fixed behavior evals across train, validation, and heldout splits.
- Added a local Pi runner with anonymous A/B labels, synthetic read and Bash tools, targeted `--ids` reruns, bounded timeouts, and JSON evidence.

### Changed

- Autopilot now uses prompt guidance only. It does not add a slash command, start a background executor, simulate clicks, or create automatic retries.
- Machine paths stay inside the Agent. The Agent verifies commands, tests, APIs, logs, CLI/TUI behavior, UI logic, and artifacts with existing tools.
- Human paths remain available only for judgments that software cannot determine. The first Autopilot result is mode handoff, not a human conclusion. A human path uses at most one additional checkpoint with `humanReason`.
- Reused the existing Guided UI demo video and poster as the historical compatibility preview. The demo remains labeled as a Guided simulation instead of claiming to show Autopilot behavior.
- Updated the README, English and Chinese product pages, and release notes to describe the two Autopilot paths and their safety boundaries.

### Fixed

- Prevented machine-only flows from treating the Autopilot handoff as a finished verification.
- Prevented visual flows from replacing human judgment with file searches, logs, or unrelated commands.
- Fixed eval grading so `cannot claim fixed` is not treated as a successful fix claim.

### Verification

- `npm test` passed 9/9 tests.
- `npm run typecheck` passed.
- Final Pi A/B run used `openai-codex/gpt-5.6-luna` with minimal thinking.
- Final candidate passed 20/20 fixed behavior evals.
- Final heldout score was 5/5.
- The package remained limited to the existing `src/index.ts` extension entrypoint.

### Security and compatibility

- Guided mode keeps its three existing outcomes.
- Autopilot does not bypass login, consent, payment, permission, or destructive-action approval.
- The extension sends no telemetry and makes no network requests.
- Existing sessions restore Guided mode when they have no Autopilot state.

## [0.1.7] 2026-09-07

- Replaced primary GIF previews with real Pi TUI recording segments.
- Added English and Chinese real-machine recording evidence.
- Published the package through GitHub, npm, Pi Package Gallery, and GitHub Pages.

## [0.1.6] 2026-09-06

- Published animated inline GIF previews for the product pages and package listing.

## [0.1.5] 2026-09-05

- Added the initial public release surfaces, interactive demo, release verifier, and package metadata.
