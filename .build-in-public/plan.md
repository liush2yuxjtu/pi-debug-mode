# Distribution plan for 0.1.4

## Status

Version 0.1.4 is planned and not published. Version 0.1.3 remains the current verified release until the release workflow finishes and public checks pass.

## Target identity

- Artifact: Pi extension and npm package `pi-debug-mode`
- Target version: `0.1.4`
- Planned tag: `v0.1.4`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- GitHub Pages source: `main/docs`
- GitHub Pages base: `https://liush2yuxjtu.github.io/pi-debug-mode/`
- License: MIT
- Runtime source: `src/index.ts` and `src/protocol.ts`

## Distribution channels

### GitHub

- Keep releases immutable.
- Install the target with `pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.4` after publication.
- Keep README media on version-pinned GitHub Raw URLs.
- Never move a published tag. Deprecate an affected release and publish a patch instead.

### npm and Pi Package Gallery

- Target npm package: `pi-debug-mode@0.1.4`
- Planned install command: `pi install npm:pi-debug-mode@0.1.4`
- Keep `src`, `README.md`, `LICENSE`, and npm-required metadata as the complete tarball.
- Keep `pi.video` and `pi.image` on `v0.1.4` GitHub Raw URLs.
- Let the existing GitHub Release workflow publish npm through Trusted Publisher OIDC.
- Keep Pages deployment separate from npm publication.

## Verification phases

1. `local` checks package metadata, README links, local media mapping, site files, SEO, public prose, and the npm tarball.
2. `tagged` repeats local checks, then requires every versioned Raw asset and every Pages route to return valid content.
3. `published` repeats tagged checks, verifies `pi-debug-mode@0.1.4` through `registry.npmjs.org`, and checks the Pi Gallery page.

## Release flow

1. Finish the 0.1.4 files and run `npm test`, `npm run typecheck`, and `npm run verify:release -- --mode local`.
2. Merge the approved commit to `main`. Let the separate Pages configuration publish `main/docs`.
3. Confirm the four Pages routes, then create the immutable `v0.1.4` tag.
4. Run `npm run verify:release -- --mode tagged` with bounded retries.
5. Publish the GitHub Release only after tagged checks pass.
6. Let `.github/workflows/release.yml` publish npm through OIDC.
7. Run `npm run verify:release -- --mode published`.
8. Update `release-manifest.json`, `release-report.md`, and `metrics.jsonl` only after real publication is verified.

## Rejected channels

Do not add wrappers. This project is a native Pi extension, not an Agent Skill, MCP server, IDE extension, container, standalone CLI, or language-specific library.

## Metrics boundary

Report GitHub stars, release downloads, npm downloads, and Gallery displays separately. Never sum them or label them as users.
