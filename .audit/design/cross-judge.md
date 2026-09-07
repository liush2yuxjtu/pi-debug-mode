# Review

## QODER

1. URL owner + pre/post: **2** — raw asset URLs own to git tag, Pages owns to `main` deployment. `prepare` maps future tag URLs back to tracked local files (hash), no false positive. `tagged` verifies real bytes after tag, `published` verifies public. Unambiguous.
2. npm lean + README: **2** — `files` allowlist `src`/`README.md`/`LICENSE`, tarball check in `prepare`. README uses absolute raw URLs, survives Pi Gallery jsDelivr rewrite.
3. Site SEO/a11y: **2** — required markers cover canonical, hreflang, OG, SoftwareApplication + FAQPage JSON-LD, sitemap, robots, release-version marker, no `file://` or `/Users/` leakage; a11y in `prepare`.
4. Version SSoT + drift: **2** — `release:sync` derives README raw URLs, site version markers, JSON-LD version from `package.json.version`; workflow fails loudly on mismatch, rerunnable.
5. Future tag URLs: **2** — explicit prepare-stage shape check mapped to local files. Correct handling.
6. ≤3 files: **2** — `package.json`, `scripts/release-contract.mjs`, `.github/workflows/release.yml` cover all flow logic.
7. No fabricated fields/wrong URLs: **1.5** — does not invent Pi fields; flags `<owner>/<repo>` and `v` prefix as open questions. But hardcodes `owner/pi-debug-mode`; real repo is `pi-debug-mode-seo-launch` (cwd). Parameterized and verified at `tagged`, but the placeholder is still a risk. Raw URL shape itself is correct.
8. OIDC narrow + Pages uncoupled: **2** — Pages serves from `main/docs` independently; workflow keeps OIDC npm publish plus `published` verification only.

Total: **15.5**

Factual issues: repo name placeholder (`pi-debug-mode` vs `pi-debug-mode-seo-launch`). Needs env/derived default, not hand-edited. Minor.
Unnecessary machinery: none material. Three-phase split is justified; report upload is cheap.

## CODEX

1. URL owner + pre/post: **1** — versioned `v/<version>/` Pages routes are workflow-generated copies; owner ambiguous (who commits that tree?). Pre mode accepts 404 as "not yet deployed", which is exactly the false positive the task forbids. Post-check is the only real guard.
2. npm lean + README: **2** — absolute Pages URLs in README survive rewrite; tarball excludes `docs`/`artifacts`.
3. Site SEO/a11y: **1.5** — covers canonical/hreflang/OG/JSON-LD/sitemap/robots/no-local-paths, but a11y checks absent from the verify list.
4. Version SSoT + drift: **1.5** — version is SSoT and `checkVersionDrift` exists, but no pre-release step syncs the README versioned URL; drift surfaces only after publish.
5. Future tag URLs: **1** — README links point to Pages `v/<version>/` routes, not tag URLs; pre verification cannot prove correctness, retry window left undefined ("需要明确阈值" open). Shifts the future-URL problem, does not solve it.
6. ≤3 files: **1** — nominally three files, but "自动生成/更新 `docs/v/${version}/` 路由副本" logic has no home: inline in YAML is unreadable, a separate script makes four files. Sitemap must also know versioned routes, adding a fourth touchpoint.
7. No fabricated fields/wrong URLs: **1** — proposes `pi.links` as a new manifest field without official confirmation, and floats `pi.category`/`pi.features`. Wrong owner domain guess hardcoded (`pi-debug-mode.github.io`) though flagged.
8. OIDC narrow + Pages uncoupled: **1** — Pages deploy sits inside the release workflow after npm publish, directly coupled; extra credentials-gated index-submission step.

Total: **10**

Factual errors / gaps:
- Per-version `docs/v/<version>/` snapshot reintroduces the canonical-split problem and adds generation machinery with no stated source/commit owner.
- `pi.links` is unsupported; adding it violates "do not invent manifest fields".
- README `v/0.1.4/...` links are unverifiable pre-release; pre check is a no-op for them.
Unnecessary machinery: snapshot-copy step, `pi.links`, index submission gate, demo redirect aliases (minor), undefined retry heuristic.

## Verdict

**Base: QODER.** Stronger on every criterion; correct future-tag-URL handling; no invented fields; Pages stays uncoupled.

Exact grafts from CODEX:

1. Keep CODEX's demo compatibility idea as minimal redirect stubs: `docs/demo.html` and `docs/zh/demo/index.html` with `location.replace` to canonical routes. Preserves legacy links, cost is 6 lines.
2. Adopt CODEX's report shape verbatim as `release-contract.mjs` output: `{ ok: boolean, failed: string[], warnings: string[] }`.
3. Adopt CODEX's per-URL `owner` attribution concept: each URL in the registry declares owner = `git-tag` | `pages-main` | `npm-registry`; checks assert one owner per URL. Makes criterion 1 machine-checkable.
4. Expose a `--mode=prepare|tagged|published` CLI flag on `release-contract.mjs` (CODEX's single-entry ergonomics) for manual reruns.

Do not graft: `pi.links`, `v/<version>/` snapshot routes, Pages-after-npm ordering, index-submission step, pre-404 tolerance.
