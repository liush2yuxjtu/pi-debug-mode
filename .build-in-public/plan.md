# Distribution plan for 0.1.6

## Canonical artifact and version

- Artifact: Pi extension and npm package `pi-debug-mode`
- Current verified release: `0.1.5`, tag `v0.1.5`
- Target patch: `0.1.6`, tag `v0.1.6`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT

## Problem

Public MP4 links work, but GitHub README and Pi Gallery require a click or hover to expose motion. That does not satisfy an immediately visible product preview.

## Direct channels

### GitHub

- Embed English and Chinese animated GIF previews directly in README Markdown, without link wrappers.
- Keep four full MP4 files available through explicit links and GitHub Release assets.
- Attach two GIFs, four MP4 files, and four PNG posters to release `v0.1.6`.

### npm and Pi Package Gallery

- Publish `pi-debug-mode@0.1.6` through existing Trusted Publisher OIDC.
- Use only `pi.image`, pointed at the version-pinned English animated GIF.
- Omit `pi.video`; Pi gives video precedence and otherwise requires hover/click behavior.
- Keep GIF and other media outside the five-file npm tarball; use immutable jsDelivr GitHub-tag URLs.

### GitHub Pages

- Replace the linked static evidence poster with the animated GIF, without a link wrapper.
- Use the static PNG poster when `prefers-reduced-motion: reduce` is active.
- Keep a separate full real-TUI MP4 link and interactive demo.

## Wrapper channels

None.

## Rejected channels and reasons

No skills.sh, ClawHub, LobeHub, MCP, IDE, container, Homebrew, or unrelated registry wrappers. This remains a native Pi extension.

## Authentication, review, signing, and fees

- GitHub and Pages: authenticated `gh`; no fee
- npm: OIDC Trusted Publisher; no stored npm token
- Pi Gallery: automatic npm discovery; refresh delay outside repository control
- jsDelivr: public immutable GitHub-tag CDN; no account or fee

## Release waves and rollback

1. Render 800×450, 8 fps, 98-frame English and Chinese GIF loops on Mac mini only.
2. Verify GIF dimensions, frame count, loop behavior, size, and visual motion.
3. Update README, Pi metadata, Pages, release verifier, package version, and artifact documentation.
4. Run tests, typecheck, package dry-run, local release checks, and browser QA.
5. Merge, deploy Pages, create immutable `v0.1.6`, and run tagged checks.
6. Publish GitHub Release and npm, then wait for Pi Gallery exact-version refresh.
7. Prove no-click GIF animation on README, Pages, and Pi Gallery by comparing browser frames before and after time advances.
8. Record release evidence and metrics.

Rollback remains patch-only. Never move a published tag.

## Resume-safe reporting plan

Report GitHub Release downloads, npm downloads, and Pi Gallery visibility separately. Verification downloads are not adoption. State clearly that GIF is the inline preview and MP4 is the full recording.
