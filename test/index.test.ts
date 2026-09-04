import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import debugMode from "../src/index.ts";

test("waits for Pi to settle before starting /debug", async () => {
	let debugHandler:
		| ((args: string, ctx: any) => Promise<void>)
		| undefined;
	let beforeAgentStart:
		| ((event: { systemPrompt: string }, ctx: any) => any)
		| undefined;
	const persisted: unknown[] = [];
	const events: string[] = [];
	const sent: Array<{ content: unknown; options: unknown }> = [];

	const pi = {
		appendEntry: (_type: string, data: unknown) => persisted.push(data),
		registerCommand: (name: string, command: { handler: typeof debugHandler }) => {
			if (name === "debug") debugHandler = command.handler;
		},
		registerTool: () => undefined,
		on: (event: string, handler: typeof beforeAgentStart) => {
			if (event === "before_agent_start") beforeAgentStart = handler;
		},
		sendUserMessage: async (content: unknown, options: unknown) => {
			sent.push({ content, options });
		},
	} as unknown as ExtensionAPI;

	debugMode(pi);
	assert.ok(debugHandler);

	const bug = "queued debug task must wait for the active turn";
	await debugHandler(bug, {
		ui: {
			setStatus: () => undefined,
			theme: { fg: (_color: string, text: string) => text },
		},
		waitForIdle: async () => {
			events.push("idle");
		},
	} as any);

	assert.deepEqual(events, ["idle"]);
	assert.deepEqual(sent, [
		{
			content: `Debug this issue in Pi Debug Mode:\n\n${bug}`,
			options: undefined,
		},
	]);
	assert.deepEqual(persisted.at(-1), { version: 1, active: true, bug });
	assert.ok(beforeAgentStart);
	const nextTurn = beforeAgentStart({ systemPrompt: "base prompt" }, {});
	assert.match(nextTurn.systemPrompt, new RegExp(bug));
});
