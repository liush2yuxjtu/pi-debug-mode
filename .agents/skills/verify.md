---
name: verify
description: Verify a code change before shipping by running the relevant existing tests locally, then running the real application or public surface and observing the affected behavior end to end. Use before every pull request, for PR verification, manual acceptance, confirming a fix, or validating local changes before shipping.
---

# Verify before shipping

The question is whether the changed behavior works for a real caller. Shift tests left by running them locally before the PR, then verify the running product surface. Tests, type checks, and static review are supporting evidence; they do not replace runtime evidence when a real user/programmatic surface exists.

## Scope

Identify the full change or named behavior being verified. Read the relevant diff and stated claim. If implementation and claim disagree, record that as a finding.

## Shift-left test gate

Run the smallest existing test suite that directly covers the change from the local/project environment before opening a PR. Reuse the repository's existing commands from package scripts, Makefiles, pyproject/tox/nox config, Cargo/Go tooling, or project docs. Expand to the broader suite when it is reasonably cheap or when the changed boundary makes narrow coverage insufficient.

Do not delete, weaken, skip, or rewrite tests merely to obtain a green result. Preserve the raw command, exit status, and relevant output. A relevant test failure is a **FAIL** until fixed or shown to be an invalid test with concrete evidence.

The test assets stay in the repository. Their execution belongs as early as possible in the local agent workflow; CI duplication can be removed only when the same required coverage is enforced by this pre-PR verification path and any required remote/environment-specific gates are preserved.

## Warning and prerequisite gate

Warnings and missing tools are verification inputs. Do not report them as harmless without checking their source and scope.

For every warning, preserve the raw line and classify it:

- **Repo-owned** — caused by package scripts, source, lockfile, configuration, or a dependency selected by the repository.
- **Environment-owned** — caused by the runner, shell environment, proxy variables, user npm config, or missing host binary.
- **External dependency** — emitted by a transitive or direct dependency. Record the package, version, and whether the repository can upgrade or replace it.

For npm warnings, run these checks when npm is used:

    npm config list --location=user
    npm ci --ignore-scripts --loglevel=warn

Run the repository prerequisite check after dependencies are installed:

    npm run verify:prerequisites

This check must report node, npm, pi, trufflehog, and the local tsc binary. Install missing required binaries to a stable PATH location such as /bin/<name>, then rerun the check. Do not downgrade a missing required binary to SKIP.

Capture every Unknown env config, proxy, deprecation, or lifecycle warning. Do not hide warnings with --silent, redirection, or a changed log level.

For a missing optional tool, run an explicit availability check such as:

    command -v <tool>
    <tool> --version

Then inspect the test output or project configuration to decide whether the tool is required. A missing tool is **BLOCKED** when it is required for the claimed behavior. It is **SKIP** only when the test explicitly declares the tool optional and the skipped behavior is outside the claim. A skipped test never becomes a pass by omission.

For a host runtime such as a CLI, TUI, browser, or desktop application, verify both:

    command -v <binary>
    <binary> --version

If the project has no run recipe, inspect package scripts and host peer dependencies. State why the real surface can or cannot be launched. Do not call a mocked harness a full application run.

A warning is non-blocking only when all of these are true:

1. The raw warning is captured.
2. Its owner is classified.
3. It does not change the claimed behavior.
4. A repeatable remediation or follow-up is recorded.
5. The same warning does not hide a test failure.

## Surface

Follow the changed code outward to the user/program boundary: rendered GUI, public CLI/TUI, listening server/API, exported package API, real agent invocation, or workflow run. An internal helper is not the final surface when a real caller exists.

For a docs-only change with no executable behavior, return **SKIP**. For a tests-only change, run the affected tests and report their result; runtime observation may be **SKIP** when no product behavior changed.

## Run and drive

Reuse the most specific project run-* recipe. Otherwise use the run workflow to get a live handle. Exercise the smallest end-to-end path that makes the changed code execute and capture evidence from the running surface: screenshot, pane/stdout, response, public SDK output, or agent/workflow result.

Then probe at least one nearby edge case suggested by the change while staying at the same public surface.

If the host surface cannot start, do not silently downgrade to a mock. Return **BLOCKED** unless the changed behavior is directly covered by a real exported API or an explicitly declared runtime harness. In that case, name the harness and state that the full host surface remains untested.

## Comment hygiene gate

For any code or configuration diff, run `/no-comments` against the same scope before the final verdict. Use the project skill at `.agents/skills/no-comments/SKILL.md`, which is based on Cursor's pstack `no-comments` skill.

Preserve the raw `/no-comments` report and classify each finding:

- **Accepted and fixed** — the smallest in-scope root-cause change is present, and the report was rerun.
- **Kept with proof** — the comment is required by an external constraint that the report documents.
- **Open** — the finding, required rerun, constraint encoding, or scope decision is unresolved.

An unresolved `MUST KILL`, an unrerun rejected report, an unjustified keep, or any other open `/no-comments` work is a **FAIL**. Do not delete comments only to make this gate green. For docs-only or tests-only changes, state why `/no-comments` is not applicable and preserve that scope decision in the verification report.

## Evidence and verdict

Preserve raw evidence before interpreting it. Use one verdict:

- **PASS** — required local tests passed, warnings and prerequisites were classified, the real surface was exercised when applicable, and the claimed behavior worked.
- **FAIL** — a required local test failed, an owned warning is unresolved, the real surface failed/regressed, or the observed behavior materially disagreed with the claim.
- **BLOCKED** — the required test, required tool, or required runtime surface could not be reached because the environment/launch path failed.
- **SKIP** — no executable behavior exists to observe, or runtime observation is not applicable to a tests-only/docs-only change.

No partial pass.

Report: claim, local test commands/results, warning and prerequisite checks, runtime method, each driven step with observation/evidence, one edge probe when runtime applies, findings, verdict, and cleanup status.

## Verification loop

When the verdict is **FAIL** or **BLOCKED**, fix the smallest repo-owned cause or record the exact environment blocker. Re-run the same checks after every fix.

Stop only at **PASS**, or report the blocker when it is outside the authorized environment. Do not turn a missing dependency, skipped security check, or unavailable host runtime into a green result by changing the assertion.

See references/cli.md and references/server-api.md for examples.
