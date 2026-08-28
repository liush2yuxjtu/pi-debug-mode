import assert from "node:assert/strict";
import test from "node:test";
import { outcomeMessage } from "../src/protocol.ts";

test("maps every reproduction outcome to next agent action", () => {
	assert.match(
		outcomeMessage({ kind: "fixed" }),
		/Remove all temporary debug instrumentation/,
	);
	assert.match(
		outcomeMessage({ kind: "reproduced" }),
		/Read the captured runtime evidence/,
	);
	assert.equal(
		outcomeMessage({ kind: "prompt", text: "Only fails after refresh" }),
		"User provided additional debug context: Only fails after refresh",
	);
	assert.match(outcomeMessage({ kind: "cancelled" }), /Pause debug-mode work/);
	assert.match(
		outcomeMessage({ kind: "unavailable" }),
		/Interactive UI is unavailable/,
	);
});
