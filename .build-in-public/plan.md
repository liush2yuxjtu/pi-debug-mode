# Distribution plan for 0.1.5

## Canonical artifact and version

- Artifact: Pi extension and npm package `pi-debug-mode`
- Current verified release: `0.1.4`, tag `v0.1.4`
- Target patch: `0.1.5`, tag `v0.1.5`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT
- Runtime source: `src/index.ts` and `src/protocol.ts`

## Direct channels

### GitHub

- Public repository, immutable tags, and GitHub Releases
- Install: `pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.5`
- Media: attach four MP4 files and four PNG posters to the release
- Metrics: stars, forks, issues, and per-asset release downloads
- Validation: tests, typecheck, release verifier, clean tagged install
- Rollback: deprecate affected release and publish another patch; never move tags

### npm and Pi Package Gallery

- npm package: `pi-debug-mode@0.1.5`
- Install: `pi install npm:pi-debug-mode@0.1.5`
- Gallery discovery: `pi-package` keyword
- Gallery preview: version-pinned MP4 and PNG from jsDelivr's GitHub CDN
- Authentication: npm Trusted Publisher through GitHub Actions OIDC
- Validation: registry metadata, tarball integrity, clean install, Gallery page, and browser media playback
- Rollback: npm deprecation plus patch release; no routine unpublish

### GitHub Pages

- English product page, Chinese product page, and two interactive demos
- Metrics: none configured; no analytics added
- Validation: four HTTPS routes, metadata, responsive browser QA, and media links
- Rollback: revert `main/docs`; Pages remains sourced from `/docs`

## Wrapper channels

None. A wrapper would add no native install value.

## Rejected channels and reasons

No skills.sh, ClawHub, LobeHub, MCP, IDE, container, Homebrew, or language-registry wrappers. This artifact is a native Pi extension distributed through npm, GitHub, and Pi Package Gallery.

## Authentication, review, signing, and fees

- GitHub and Pages: authenticated `gh`; no fee or manual review
- npm: OIDC Trusted Publisher; no npm token in Git or GitHub Secrets
- Pi Package Gallery: automatic npm discovery; update latency outside repository control

## Release waves and rollback

1. Replace Raw GitHub media URLs with immutable jsDelivr GitHub-tag URLs so MP4 responses use `video/mp4` and tolerate GFW-network routing better.
2. Run `npm test`, `npm run typecheck`, `npm run verify:release -- --mode local`, and package checks.
3. Merge to `main`, confirm Pages deployment, create and push immutable `v0.1.5`.
4. Run tagged checks against all media and Pages routes.
5. Create a GitHub Release with media assets; GitHub Actions publishes npm through OIDC.
6. Run published checks until npm and Pi Gallery expose `0.1.5`; verify actual browser playback.
7. Append evidence and update release manifest/report.

## Resume-safe reporting plan

Report GitHub Release assets, npm downloads, and Gallery visibility separately. Never sum them or call them users. Record cache lag and automation blocks as limits, not failures of public availability.
