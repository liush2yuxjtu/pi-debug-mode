<!-- verify-shift-left:start -->
## Pre-PR verification

Use /verify skill every time BEFORE we make a PR

- Canonical skill source: `liush2yuxjtu/claude-runtime-verification-skills@0d585c02bbeaa756e45865dd0a36f84d1b08f589`.
- Run relevant existing tests locally through `/verify` before PR creation.
- Keep test files in the repository; shift their execution left instead of deleting coverage.
- Preserve remote CI only for checks that genuinely require remote, production, deployment, secret, runner, or environment-specific execution.
- Do not open a PR on `FAIL` or `BLOCKED`. `SKIP` is only valid when the skill says no executable runtime behavior applies.

<!-- verify-shift-left:end -->
