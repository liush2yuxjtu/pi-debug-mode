# Review disposition

## Accepted

- Reworded README and homepage claims to describe injected instructions instead of hard enforcement.
- Added intrinsic image dimensions, lazy loading, asynchronous decoding, and Open Graph dimensions.
- Added `scope="col"` to comparison-table headers.
- Replaced the low-contrast lime-only focus ring with a dark outline and lime outer ring.
- Preserved keyboard focus during both interactive demos.
- Reduced the offset that could cross the tablet viewport edge.
- Made the verifier resolve the expected shared stylesheet path instead of accepting any `site.css` suffix.
- Preserved Markdown heading text during the first-60-word check.
- Narrowed the local-demo wording rule.
- Normalized visible FAQ text before comparing it with JSON-LD.
- Moved the release-version gate before dependency installation.
- Matched the Pi Gallery version with numeric boundaries instead of a plain substring.

## Dismissed

- Future `v0.1.4` public URLs remain unavailable before merge and tag. The `tagged` phase owns that gate. This is not a merge defect.
- Curly apostrophes conflict with the project writing rule. Public prose keeps straight apostrophes.
- Sentence-case headings follow the technical-writing rule.
- `touch-action`, tap-highlight overrides, balanced headings, and safe-area padding do not fix a demonstrated failure in this site.
- The public-prose ban on `0.1.0` remains broad by design. These product pages should not publish stale product versions.

## Trail review

- Dismissed the self-review flag. `.audit/design/cross-judge.md` contains the full rubric and scores, and Xunfei judged the QODER and CODEX candidates.
- Accepted the public-network and tag-order flags as release gates. The plan runs `tagged` before the GitHub Release and `published` after npm publication.
- Fixed the browser-evidence flag. `.audit/browser-qa.json` now records all viewport dimensions, both three-button demo sequences, final status, and final focus.
- Dismissed the missing-workflow-evidence flag. The tracked workflow and the verifier both enforce the recorded order, and the release run will provide exact-head evidence.

## Result

Local release verification and twelve browser route-and-viewport checks pass. Tagged and published checks remain intentionally pending until their public owners exist.
