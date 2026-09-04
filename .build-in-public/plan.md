# Distribution plan

## Canonical artifact and version

- Artifact: Pi extension/package `pi-debug-mode`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- Current version: `0.1.2`, tag `v0.1.2`
- License: MIT
- Runtime source: `src/index.ts` and `src/protocol.ts`

## Direct channels

### GitHub

- Public repository and immutable GitHub Releases
- Install: `pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.2`
- Metrics: stars, forks, issues, release downloads
- Validation: clean clone, tests, typecheck, Pi load smoke test
- Rollback: deprecate affected release and publish a patch; never move tags

### npm and Pi Package Gallery

- npm package: `pi-debug-mode@0.1.2`
- Install: `pi install npm:pi-debug-mode@0.1.2`
- Gallery discovery: `pi-package` keyword
- Gallery preview: version-pinned MP4 and PNG under `pi.video` and `pi.image`
- Authentication: npm Trusted Publisher with GitHub Actions OIDC
- Workflow: `liush2yuxjtu/pi-debug-mode/.github/workflows/release.yml`
- No npm token stored in Git or GitHub Secrets
- Rollback: npm deprecation plus patch release; no routine unpublish

## Rejected channels

No wrappers. This project is a native Pi extension, not an Agent Skill, MCP server, IDE extension, container, standalone CLI, or language-specific library.

## Release flow

1. Update package version and version-pinned Gallery preview URLs.
2. Run tests, typecheck, package dry-run, and clean install.
3. Push the canonical commit.
4. Create an immutable GitHub Release.
5. GitHub-hosted Actions publishes through OIDC.
6. Verify npm metadata, tarball, Gallery listing, and install path.
7. Append dated evidence to `metrics.jsonl` and update `release-report.md`.

## Metrics boundary

Report GitHub stars, release downloads, npm downloads, and Gallery displays separately. Never sum them or label them as users.
