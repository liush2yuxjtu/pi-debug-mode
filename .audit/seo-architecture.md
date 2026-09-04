# SEO and release verification architecture

## Decision

Use immutable Git tag media for README and Pi metadata. Use `main/docs` for the current GitHub Pages site. Keep npm publication in the existing GitHub Release OIDC workflow. Verify each public channel with one check-only script.

This design fixes the original link failure without adding demo assets to the npm tarball. Pi Gallery can rewrite README links without breaking the media because every media URL is absolute.

## Candidate review

Two valid architecture candidates reached an Xunfei cross-judge. QODER scored 15.5 of 16. CODEX scored 10 of 16. The Xunfei judge selected QODER as the base because it kept npm lean, assigned one owner to each URL, used immutable tag media, and kept Pages separate from npm publication.

The final design keeps that ownership model and applies the approved contract from this task. It replaces the earlier write-capable release contract with `scripts/verify-release.mjs`, keeps the existing demo filenames, and uses `/demo-zh.html` as the Chinese demo route.

A failed Xunfei tool call produced no usable architecture output. It was not a candidate and did not receive a score.

Evidence sources:

- `.audit/design/cross-judge.md`
- `.audit/baseline.json`
- `.audit/final-local.json`
- `.audit/reviews/disposition.md`

## Data shapes

```text
ReleaseIdentity {
  packageName
  version
  tagName
  repository
  owner
  repo
  pagesBase
}

PublicSurface {
  id
  owner: git-tag | pages-main | npm-registry | pi-gallery
  url
  phases
  localPath?
  contentKind
}

VerificationResult {
  mode
  ok
  checks
  failures
  warnings
}
```

`ReleaseIdentity` comes from `package.json`. `PublicSurface` is the registry for versioned Raw media, four Pages routes, the exact npm registry version, and the Pi Gallery page. Checks use the registry instead of repeating URL ownership rules in each release phase.

`VerificationResult` is the complete stdout value in JSON mode. The verifier does not write reports or change source files.

## URL ownership

### Git tag

Git tag `v0.1.4` owns README media and `pi.image` or `pi.video`. Local checks map each Raw URL to a tracked file. Tagged checks require the real URL to return non-empty binary content with a suitable content type.

### Pages main branch

The `main/docs` tree owns these routes:

- `https://liush2yuxjtu.github.io/pi-debug-mode/`
- `https://liush2yuxjtu.github.io/pi-debug-mode/zh/`
- `https://liush2yuxjtu.github.io/pi-debug-mode/demo.html`
- `https://liush2yuxjtu.github.io/pi-debug-mode/demo-zh.html`

Pages is the current product site. It is not a permanent snapshot for every release.

### npm registry

`registry.npmjs.org` owns the package publication fact. Published mode requests the exact package and version endpoint. The Cloudflare-protected npm website is not a verification source.

### Pi Gallery

The Pi Gallery owns its listing page. Published mode requires HTTP 200 and references to both the package name and version. Generic description or Open Graph metadata stays a warning linked to `https://github.com/earendil-works/pi/issues/6699`.

## Release phases

### Local

Local mode checks package and lock versions, npm metadata, supported Pi fields, README media mapping, site files, canonical and hreflang links, social metadata, JSON-LD, visible FAQ text, page structure, sitemap, robots, public prose, and the exact npm pack file list.

The baseline runs this mode against the unchanged 0.1.3 checkout. The final evidence runs the same mode against the 0.1.4 worktree.

### Tagged

Tagged mode runs every local check first. It then checks every versioned Raw asset and every Pages route with bounded retries and a bounded request timeout. Missing Raw media or any missing Pages route is a hard failure.

### Published

Published mode runs tagged checks first. It then verifies the exact npm version through `registry.npmjs.org` and checks the Pi Gallery page. The phase cannot pass while npm or Gallery still describes 0.1.3.

## Rejected alternatives

- Keep relative README media. Pi Gallery can rewrite those links to files that are absent from the npm tarball.
- Add `docs` or `artifacts` to npm. That would make every install carry release media.
- Put README media on Pages. Old README versions would point to mutable files.
- Create versioned Pages copies. That adds generated directories and splits canonical URLs.
- Add Pages deployment to the npm release workflow. GitHub Release OIDC remains the single npm publication owner, while Pages stays separate.
- Add write or sync flags to the verifier. A release check must not change the artifact it audits.
- Scrape the npm website. The registry endpoint is the package source of truth.
- Add `pi.links`, `pi.category`, or other unsupported metadata. The package keeps only `extensions`, `video`, and `image`.

## Tradeoffs

The repository keeps the existing media files, while the npm tarball stays limited to five files. GitHub Pages can change with `main`, while release media stays immutable under a tag.

The verifier uses Node standard library code instead of an HTML or HTTP dependency. It checks known metadata and content contracts. A separate local parser check covers HTML syntax before commit.

Tagged and published checks depend on public network access. Retries, delay, and request timeouts are bounded. A future URL fails until the tag or Pages content exists. That failure is intentional and prevents a premature release claim.
