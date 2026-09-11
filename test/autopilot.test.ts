import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI, ExtensionCommandContext, ToolDefinition } from "@earendil-works/pi-coding-agent";
import debugMode from "../src/index.ts";

function harness() {
	const commands = new Map<string, { handler: (args: string, ctx: ExtensionCommandContext) => Promise<void> }>();
	const handlers = new Map<string, (event: unknown, ctx: ExtensionCommandContext) => unknown>();
	const tools = new Map<string, ToolDefinition>();
	const entries: { type: string; customType: string; data: unknown }[] = [];
	let selections = 0;
	const selectionOptions: string[][] = [];
	let choice: string | undefined = "Autopilot — Agent 自行验证";
	const pi = {
		registerCommand: (name: string, command: typeof commands extends Map<string, infer V> ? V : never) => commands.set(name, command),
		registerTool: (tool: ToolDefinition) => tools.set(tool.name, tool),
		on: (name: string, handler: (event: unknown, ctx: ExtensionCommandContext) => unknown) => handlers.set(name, handler),
		appendEntry: (customType: string, data: unknown) => entries.push({ type: "custom", customType, data }),
		sendUserMessage() {},
	} as unknown as ExtensionAPI;
	const ctx = {
		hasUI: true,
		ui: {
			setStatus() {}, notify() {},
			theme: { fg: (_: string, text: string) => text },
			select: async (_title: string, options: string[]) => { selections++; selectionOptions.push(options); return choice; },
			editor: async () => "extra context",
		},
		sessionManager: { getBranch: () => entries },
		waitForIdle: async () => {},
	} as unknown as ExtensionCommandContext;
	debugMode(pi);
	return {
		entries, ctx,
		commandNames: () => [...commands.keys()],
		select: (value: string | undefined) => { choice = value; },
		selections: () => selections,
		selectionOptions: () => selectionOptions,
		command: async (name: string, args = "") => { await commands.get(name)!.handler(args, ctx); },
		event: (name: string, event: unknown = {}) => handlers.get(name)!(event, ctx),
		checkpoint: async (humanReason?: string, signal?: AbortSignal) => {
			const result = await tools.get("debug_reproduction")!.execute("test", { title: "Verify", steps: ["Run regression"], humanReason }, signal, undefined, ctx);
			assert.ok(result.details && typeof result.details === "object" && "outcome" in result.details);
			return { ...result, details: result.details };
		},
	};
}

test("Autopilot choice returns guidance, not success; later machine checkpoints never prompt", async () => {
	const h = harness();
	await h.command("debug", "CLI regression");
	const first = await h.checkpoint();
	assert.equal(h.selections(), 1);
	assert.deepEqual(first.details.outcome, { kind: "autopilot" });
	assert.match(JSON.stringify(first.content), /只完成 Autopilot 模式交接/);
	assert.match(JSON.stringify(first.content), /收到本提示说明交接已完成/);
	assert.doesNotMatch(JSON.stringify(first.content), /下一次工具调用必须是 debug_reproduction/);
	assert.match(JSON.stringify(first.content), /机器路径/);
	assert.match(JSON.stringify(first.content), /人工路径总共最多两次检查点/);
	const second = await h.checkpoint();
	assert.deepEqual(second.details.outcome, { kind: "autopilot" });
	assert.equal(h.selections(), 1);
	const prompt = h.event("before_agent_start", { systemPrompt: "BASE" });
	assert.match(JSON.stringify(prompt), /BASE/);
	assert.match(JSON.stringify(prompt), /命令、测试、API、日志/);
	assert.match(JSON.stringify(prompt), /不要让用户代跑机器验证/);
	assert.doesNotMatch(JSON.stringify(prompt), /Only after the user selects Fixed/);
});

test("a new debug task starts in Guided mode after Autopilot", async () => {
	const h = harness();
	await h.command("debug", "first bug");
	assert.deepEqual((await h.checkpoint()).details.outcome, { kind: "autopilot" });
	await h.command("debug", "second bug");
	assert.deepEqual((await h.checkpoint()).details.outcome, { kind: "autopilot" });
	assert.equal(h.selections(), 2);
});

test("visual judgment still uses original outcomes; cancelled does not claim fixed", async () => {
	const h = harness();
	await h.command("debug", "layout");
	await h.checkpoint();
	h.select(undefined);
	assert.deepEqual((await h.checkpoint("Judge visual alignment")).details.outcome, { kind: "cancelled" });
	assert.ok(!h.selectionOptions().at(-1)?.includes("Autopilot — Agent 自行验证"));
	h.select("Issue reproduced, please try again");
	assert.deepEqual((await h.checkpoint("Judge click behavior")).details.outcome, { kind: "reproduced" });
	h.select("Fixed");
	assert.deepEqual((await h.checkpoint("Judge appearance")).details.outcome, { kind: "fixed" });
	assert.equal(h.event("before_agent_start", { systemPrompt: "BASE" }), undefined);
});

test("no additional commands; restore preference, reset empty branches and migrate old state", async () => {
	const h = harness();
	assert.deepEqual(h.commandNames().sort(), ["debug", "debug-stop"]);
	await h.command("debug", "bug");
	await h.checkpoint();
	h.event("session_start");
	await h.checkpoint();
	assert.equal(h.selections(), 1);
	h.select("Type prompt…");
	h.entries.length = 0;
	h.event("session_tree");
	await assert.rejects(h.checkpoint(), /inactive/);
	h.entries.push({ type: "custom", customType: "pi-debug-mode:state", data: { version: 1, active: true, bug: "old" } });
	h.event("session_start");
	assert.deepEqual((await h.checkpoint()).details.outcome, { kind: "prompt", text: "extra context" });
	assert.equal(h.selections(), 2);
});

test("headless machine verification stays agent-owned; cancellation and inactive mode are respected", async () => {
	const h = harness();
	await assert.rejects(h.checkpoint(), /inactive/);
	await h.command("debug", "bug");
	await h.checkpoint();
	Object.assign(h.ctx, { hasUI: false });
	assert.deepEqual((await h.checkpoint()).details.outcome, { kind: "autopilot" });
	assert.deepEqual((await h.checkpoint("Visual judgment")).details.outcome, { kind: "unavailable" });
	assert.deepEqual((await h.checkpoint(undefined, AbortSignal.abort())).details.outcome, { kind: "cancelled" });
	assert.equal(h.selections(), 1);
	await h.command("debug-stop");
	assert.equal(h.event("before_agent_start", { systemPrompt: "BASE" }), undefined);
});
