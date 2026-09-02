# Release report

## Published and verified

None yet. Public mutation not started.

## Submitted or waiting for review

None.

## Prepared

- GitHub repository and release route for `v0.1.0`
- npm package `pi-debug-mode@0.1.0`
- Pi Package Gallery discovery through `pi-package` metadata
- OIDC trusted-publishing GitHub Actions workflow

## Skipped and why

All non-native registries skipped. This project is a Pi extension, not an Agent Skill, MCP server, IDE extension, container, or standalone language package.

## Install commands

```bash
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.0
pi install npm:pi-debug-mode@0.1.0
```

These commands become valid only after corresponding public release.

## Public metric links

- GitHub: `https://github.com/liush2yuxjtu/pi-debug-mode`
- npm: `https://www.npmjs.com/package/pi-debug-mode`
- Pi Package Gallery: `https://pi.dev/packages/pi-debug-mode`

## Current evidence snapshot

No public counters. Local gates pass; public install verification pending.

## Maintenance and next release actions

Keep one source tree, immutable release tags, synchronized semver, npm provenance, and patch releases for rollback.

## Resume-safe claim

Prepared `pi-debug-mode` for native GitHub, npm, and Pi Package Gallery distribution; no public release or adoption claim yet.
