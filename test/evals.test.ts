import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("20 fixed behavior evals have disjoint train/validation/heldout splits", () => {
	const dataset = JSON.parse(readFileSync(new URL("../evals/cases.json", import.meta.url), "utf8"));
	assert.equal(dataset.cases.length, 20);
	const ids = new Set();
	const counts = { train: 0, validation: 0, heldout: 0 };
	for (const entry of dataset.cases) {
		assert.equal(typeof entry.id, "string");
		assert.ok(!ids.has(entry.id));
		ids.add(entry.id);
		assert.ok(["machine", "discover", "read", "failure", "visual", "mixed", "safety"].includes(entry.kind));
		assert.ok(entry.split === "train" || entry.split === "validation" || entry.split === "heldout");
		counts[entry.split as keyof typeof counts]++;
		assert.ok(entry.prompt.length > 10);
		assert.ok(entry.fixture.length > 10);
	}
	assert.deepEqual(counts, { train: 10, validation: 5, heldout: 5 });
});

test("failure grader does not treat a negated success phrase as success", () => {
	const claimsSuccess = /(?:^|[\n。])\s*(?:全部|验证|测试|检查)\s*(?:通过|成功)(?:[。！\s]|$)|(?:^|[\n。])\s*已修复(?:[。！\s]|$)/;
	assert.equal(claimsSuccess.test("验证未完成：expected 200, received 500。不能据此宣称已修复。"), false);
	assert.equal(claimsSuccess.test("验证通过。"), true);
});

test("eval runner is opt-in, isolated from normal extension loading", () => {
	const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
	assert.deepEqual(pkg.pi.extensions, ["./src/index.ts"]);
	const runner = readFileSync(new URL("../evals/run.mjs", import.meta.url), "utf8");
	for (const flag of ["--no-session", "--no-context-files", "--no-builtin-tools", "--no-extensions", "--no-skills"]) assert.ok(runner.includes(flag));
	assert.ok(runner.includes("'--model', 'luna'"));
	assert.ok(runner.includes("90000"));
	assert.ok(runner.includes("infrastructureFailure"));
	assert.ok(runner.includes("--ids"));
	assert.ok(runner.includes("未知用例"));
	const harness = readFileSync(new URL("../evals/harness.ts", import.meta.url), "utf8");
	assert.doesNotMatch(harness, /child_process|execSync|spawn\(/);
});
