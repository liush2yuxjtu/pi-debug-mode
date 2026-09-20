# Changelog

All notable changes to `pi-debug-mode` are recorded here.

## [0.1.11] 2026-09-20

### Changed

- Usage telemetry now goes to the shared `@nyn5255/telemetry` collector instead of the package-specific funnel. One schema, one collector, one consent model across the published packages.
- Usage telemetry is **on by default**. The first interactive session prints the full disclosure once: collector address, exact field list, never-sent list, 180-day retention, the hosting caveat, and `DO_NOT_TRACK=1`. A headless session does not consume that notice, so a human still sees it.
- `install` now fires on the first opted-in session, `activated` only when a debug session actually starts, and `first_success` when a reproduction ends in `Fixed`. Previously `install`, `activated`, and `active` all fired on session start, which made the activation rate meaningless.
- The network deadline is 1000 ms (the SDK maximum) because the 500 ms default is shorter than a serverless cold start over a long-haul link, which dropped events silently.

### Added

- `/debug-telemetry status | on | off`. Off is immediate and persists, and a stored off wins over the default.
- `README.md` and `src/TELEMETRY.md` state that telemetry is on by default, with the off switches next to it, before install.
- `PI_TELEMETRY_DEBUG=1` prints the exact JSON that would be sent on stderr, sends nothing, and writes no state, so the published field list can be checked instead of trusted.
- `PI_DEBUG_MODE_TELEMETRY=1|0` process override; the legacy `PI_USAGE_TELEMETRY` opt-in still counts as consent.

### Notes

- Nothing is obfuscated: the payload is plain schema-v1 JSON to a public endpoint whose source is readable. The collector stores no IP, user agent, or forwarding header, and its database schema has no column for them.
- Counts are lower bounds: at-most-once delivery with no retries, and npm downloads include CI and are not users.

## [0.1.9] 2026-09-14

### Added

- Added `Autopilot — Agent 自行验证` to the existing `debug_reproduction` checkpoint.
- Added `humanReason` for checkpoints that require visual, click, touch, or aesthetic judgment.
- Added persisted Autopilot state. Older session entries without `autopilot` remain Guided.
- Added 20 public regression evals across train, validation, and regression splits.
- Added a local Pi runner with a frozen baseline, anonymous A/B labels, case-specific tool authorization, targeted `--ids` reruns, bounded timeouts, and JSON evidence.
- Added `AUTOPILOT.md` with the behavior contract and release boundaries.

### Changed

- Autopilot now uses prompt guidance only. It does not add a slash command, start a background executor, simulate clicks, or create automatic retries.
- Machine paths stay inside the Agent. The Agent verifies commands, tests, APIs, logs, CLI/TUI behavior, UI logic, and artifacts with existing tools.
- Human paths remain available only for judgments that software cannot determine. The first Autopilot result is mode handoff, not a human conclusion. A human path uses at most one additional checkpoint with `humanReason`.
- A new `/debug` task starts in Guided mode instead of inheriting stale Autopilot state.
- Kept the original Guided UI demo video and poster as historical compatibility assets. The `pi-debug-mode-demo-0.1.8.mp4` replay remains labeled as a Guided simulation and does not claim to show Autopilot behavior.
- Updated the README, English and Chinese product pages, and release notes to describe the two Autopilot paths and their safety boundaries.

### Fixed

- Prevented machine-only flows from treating the Autopilot handoff as a finished verification.
- Prevented visual flows from replacing human judgment with file searches, logs, or unrelated commands.
- Fixed human checkpoints so an already enabled Autopilot option is not offered a second time.
- Fixed A/B reruns so baseline and candidate identities remain distinct even when prompt files match.
- Fixed targeted eval reruns so `--ids` selects requested cases across all splits.
- Fixed case grading so rejected Bash and read calls cannot hide behind a later valid result.
- Fixed eval grading so `cannot claim fixed` is not treated as a successful fix claim.
- Fixed the release verifier for the `src/usage-entry.ts` wrapper and its optional telemetry contract.

### Verification

- `npm test` passed 10/10 tests.
- `npm run typecheck` passed.
- `npm run verify:release -- --mode local` passed 23/23 checks.
- Final public regression run used `openai-codex/gpt-5.6-luna` with minimal thinking.
- Final candidate passed 20/20 public regression evals.
- The package uses `src/usage-entry.ts` as its extension entrypoint. That wrapper loads `src/index.ts` and keeps the optional telemetry boundary separate from Debug Mode.

### Security and compatibility

- Guided mode keeps its three existing outcomes.
- Autopilot does not bypass login, consent, payment, permission, or destructive-action approval.
- Usage telemetry is disabled by default. Explicit opt-in sends only the anonymous funnel events documented in `src/TELEMETRY.md`; it never sends prompts, code, paths, tokens, or model output.
- Existing sessions restore Guided mode when they have no Autopilot state.

## [0.1.8] 2026-09-11

- Added the opt-in, privacy-first usage funnel wrapper in `src/usage-entry.ts`.
- Added the telemetry contract in `src/TELEMETRY.md`.
- Published `pi-debug-mode@0.1.8` to npm through GitHub Actions OIDC.

## [0.1.7] 2026-09-07

- Replaced primary GIF previews with real Pi TUI recording segments.
- Added English and Chinese real-machine recording evidence.
- Published the package through GitHub, npm, Pi Package Gallery, and GitHub Pages.

## [0.1.6] 2026-09-06

- Published animated inline GIF previews for the product pages and package listing.

## [0.1.5] 2026-09-05

- Added the initial public release surfaces, interactive demo, release verifier, and package metadata.
