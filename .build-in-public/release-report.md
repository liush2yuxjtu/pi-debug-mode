# Release report

## Published and verified

- GitHub Release: [`v0.1.2`](https://github.com/liush2yuxjtu/pi-debug-mode/releases/tag/v0.1.2)
- npm: [`pi-debug-mode@0.1.2`](https://www.npmjs.com/package/pi-debug-mode)
- Pi Package Gallery: [`pi-debug-mode`](https://pi.dev/packages/pi-debug-mode)
- GitHub Actions release run: [successful](https://github.com/liush2yuxjtu/pi-debug-mode/actions/runs/33845785088)
- Authentication: npm Trusted Publisher through GitHub Actions OIDC; no npm token stored in Git or GitHub Secrets

## Install commands

```bash
pi install npm:pi-debug-mode@0.1.2
pi install git:github.com/liush2yuxjtu/pi-debug-mode@v0.1.2
```

## Verification

- Unit tests: pass
- TypeScript typecheck: pass
- npm package metadata and tarball: verified from the public registry
- Clean npm install: pass
- Pi package manifest: extension, MP4 preview, and PNG preview present
- Pi Gallery listing: HTTP 200 after indexing
- Release workflow: pass; `v0.1.2` published through OIDC

## Notes

`v0.1.0` was the manual bootstrap publication. `v0.1.1` exposed two shell-quoting defects in the initial release workflow. `v0.1.2` fixed both defects, added Gallery preview metadata, and completed the trusted-publishing path successfully. Existing tags remain immutable.

## Resume-safe claim

Published and verified `pi-debug-mode@0.1.2` on GitHub, npm, and Pi Package Gallery with tokenless GitHub OIDC releases and a 13-second product demo.
