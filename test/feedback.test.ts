import assert from "node:assert/strict";
import test from "node:test";
import {
	collectReferencedChildSessions,
	redactSessionText,
	redactString,
} from "../src/feedback.ts";

function summary() {
	return {
		secret_replacements: 0,
		images_removed: 0,
		paths_redacted: 0,
		emails_redacted: 0,
	};
}

test("feedback redaction removes literal secrets, emails, home paths, image bytes, and sensitive keys", () => {
	const s = summary();
	const secret = "super-secret-token-value";
	const source =
		JSON.stringify({
			type: "message",
			email: "person@example.com",
			path: `${process.env.HOME}/projects/private`,
			token: secret,
			content: [
				{ type: "image", data: "base64-image-data" },
				`Bearer ${secret}`,
			],
		}) + "\n";
	const redacted = redactSessionText(source, s, [secret]);
	assert.doesNotMatch(redacted, /super-secret-token-value/);
	assert.doesNotMatch(redacted, /person@example\.com/);
	assert.doesNotMatch(redacted, /base64-image-data/);
	assert.ok(s.secret_replacements >= 2);
	assert.equal(s.images_removed, 1);
});

test("feedback text redaction catches common inline credentials", () => {
	const s = summary();
	const text = redactString(
		"mail me a@b.com token ghp_123456789012345678901234",
		s,
		[],
	);
	assert.doesNotMatch(text, /ghp_/);
	assert.doesNotMatch(text, /a@b\.com/);
});

test("only child session paths beside the main session are collected", () => {
	const main = "/tmp/pi-sessions/main.jsonl";
	const allowed = "/tmp/pi-sessions/child.jsonl";
	const outside = "/tmp/other/private.jsonl";
	const text = [
		JSON.stringify({ message: { details: { childSessionFile: allowed } } }),
		JSON.stringify({ message: { details: { childSessionFile: outside } } }),
	].join("\n");
	assert.deepEqual(collectReferencedChildSessions(main, text), [allowed]);
});

test("real TruffleHog accepts a redacted main + subtask bundle", async (t) => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { prepareBundle } = await import("../src/feedback.ts");
  const run = promisify(execFile);
  try {
    await run("trufflehog", ["--version"]);
  } catch {
    t.skip("trufflehog not installed");
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "pi-debug-feedback-test-"));
  try {
    const main = join(dir, "main.jsonl");
    const child = join(dir, "child.jsonl");
    const fakeToken = "ghp_123456789012345678901234567890";
    await writeFile(child, JSON.stringify({
      type: "message",
      message: { role: "assistant", content: [{ type: "text", text: `child ${fakeToken}` }] },
    }) + "\n");
    await writeFile(main, [
      JSON.stringify({
        type: "message",
        message: {
          role: "user",
          content: [
            { type: "text", text: `debug person@example.com ${fakeToken}` },
            { type: "image", data: "base64-private-image" },
          ],
        },
      }),
      JSON.stringify({ type: "custom", customType: "subtask", details: { childSessionFile: child } }),
    ].join("\n") + "\n");

    const pi = {
      exec: async (command: string, args: string[]) => {
        try {
          const result = await run(command, args, { maxBuffer: 8 * 1024 * 1024 });
          return { stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? ""), code: 0, killed: false };
        } catch (error: any) {
          return {
            stdout: String(error?.stdout ?? ""),
            stderr: String(error?.stderr ?? error?.message ?? ""),
            code: Number(error?.code ?? 1),
            killed: Boolean(error?.killed),
          };
        }
      },
    } as any;

    const bundle = await prepareBundle(pi, main);
    assert.equal(bundle.files.length, 2);
    assert.equal(bundle.redaction.scanner, "trufflehog");
    assert.ok(bundle.redaction.secret_replacements >= 2);
    assert.ok(bundle.redaction.emails_redacted >= 1);
    assert.ok(bundle.redaction.images_removed >= 1);
    assert.ok(bundle.gzipBytes > 0);
    assert.ok(bundle.files.every((file) => file.content_gzip_base64.length > 0));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
