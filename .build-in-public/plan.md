# Distribution plan

## Canonical artifact and version

- Artifact: Pi extension/package `pi-debug-mode`
- Canonical source: `https://github.com/liush2yuxjtu/pi-debug-mode`
- Initial version: `0.1.0`, tag `v0.1.0`
- License: MIT
- Runtime source: `src/index.ts` and `src/protocol.ts`

## Direct channels

### GitHub

- Artifact: public source repository and GitHub Release `v0.1.0`
- Install: `pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.0`
- Listing: `https://github.com/liush2yuxjtu/pi-debug-mode`
- Metrics: stars, forks, issues, release asset downloads
- Update: push source, create signed/annotated release tag, publish release
- Validation: clean clone, `npm ci && npm test && npm run typecheck`, then Pi load smoke test
- Rollback: mark release deprecated and publish a patch; never move an existing tag
- Maintenance: low

### npm and Pi Package Gallery

- Artifact: npm package `pi-debug-mode@0.1.0`; Pi Gallery discovers `pi-package` keyword
- Install: `pi install npm:pi-debug-mode@0.1.0`
- Listings: `https://www.npmjs.com/package/pi-debug-mode` and `https://pi.dev/packages/pi-debug-mode`
- Metrics: npm downloads by period; Pi Gallery npm-derived weekly/monthly downloads
- Update: GitHub Release workflow with npm trusted publishing/OIDC
- Validation: `npm pack --dry-run`, clean npm install, Pi load smoke test, `/debug` TUI checkpoint test
- Rollback: `npm deprecate pi-debug-mode@0.1.0 "Use <fixed-version>"`; publish patch, never unpublish except within npm policy for emergencies
- Maintenance: low

## Wrapper channels

None. Project is already a native Pi package. Homebrew, IDE marketplaces, Skills registries, MCP registries, and containers add no natural install/use path.

## Rejected channels and reasons

- skills.sh, ClawHub, LobeHub: not an Agent Skill; packaging extension behavior as a skill would misrepresent capability.
- VS Code Marketplace, Open VSX, JetBrains: no IDE extension implementation.
- MCP registries: no MCP server.
- Homebrew, PyPI, crates.io, RubyGems, NuGet, Packagist, Docker Hub: no standalone CLI, matching language artifact, or service.

## Public metrics per channel

- GitHub: stars, forks, open issues, release downloads. Never label these as users.
- npm: downloads for explicit periods. Downloads include CI, caches, mirrors, and bots.
- Pi Gallery: npm-derived weekly/monthly downloads; disclose overlap with npm and never sum them.

## Authentication, review, signing, and fee gates

- GitHub CLI authenticated as `liush2yuxjtu`; repository does not yet exist.
- npm package name appears available, but npm authentication is absent.
- Before publishing: create public GitHub repository, make the first npm publish manually because npm cannot attach OIDC trust before a package exists, then configure npm trusted publisher for `liush2yuxjtu/pi-debug-mode` workflow `release.yml` with `npm publish` permission.
- No expected fees or marketplace review.
- Public repository creation, namespace claim, first npm publish, and release publication require explicit approval.

## Release waves and rollback

1. Wave 1: create GitHub repository and push `main` without a release.
2. Wave 1: authenticate to npm and manually publish `pi-debug-mode@0.1.0`; verify clean install.
3. Wave 1: configure npm trusted publishing for future versions, then create immutable `v0.1.0` and GitHub Release. Workflow detects existing `0.1.0` and skips duplicate publication.
4. Verify Pi Package Gallery discovery after npm indexing.
5. No wrapper waves. On failure, stop only affected channel; preserve successful independent channel and publish accurate status.

## Resume-safe reporting plan

Append dated evidence to `metrics.jsonl`, preserve public API responses under `evidence/<date>/`, and update `release-manifest.json` plus `release-report.md`. Claims must separate GitHub stars, npm downloads, and Pi Gallery displays.
