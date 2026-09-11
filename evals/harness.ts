import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readFileSync } from "node:fs";
import debugMode from "../src/index.ts";

export default function harness(pi: ExtensionAPI) {
	const fixture: { prompt: string; fixture: string } = JSON.parse(readFileSync(process.env.DEBUG_EVAL_CASE!, "utf8"));
	const instructions = readFileSync(process.env.DEBUG_EVAL_PROMPT!, "utf8");
	let start: ((args: string, ctx: ExtensionCommandContext) => Promise<void>) | undefined;
	let selections = 0;
	let calls = 0;
	const proxy = new Proxy(pi, {
		get(target, key) {
			if (key === "sendUserMessage") return () => {};
			if (key === "registerCommand") return (name: string, command: { handler: typeof start }) => {
				if (name === "debug") start = command.handler;
			};
			if (key === "registerTool") return (tool: Parameters<ExtensionAPI["registerTool"]>[0]) => {
				pi.registerTool({ ...tool, async execute(id, params, signal, update, ctx) {
					const wrapped = { ...ctx, hasUI: true, ui: { ...ctx.ui,
						select: async () => ++selections === 1 ? "Autopilot — Agent 自行验证" : undefined,
						setStatus() {},
					} };
					const result = await tool.execute(id, params, signal, update, wrapped);
					const details = result.details;
					if (details && typeof details === "object" && "outcome" in details &&
						details.outcome && typeof details.outcome === "object" && "kind" in details.outcome && details.outcome.kind === "autopilot") {
						return { ...result, content: [{ type: "text", text: instructions }] };
					}
					return result;
				} });
			};
			return Reflect.get(target, key);
		},
	});
	debugMode(proxy);
	pi.on("session_start", async (_event, ctx) => {
		await start!(fixture.prompt, ctx as ExtensionCommandContext);
	});
	pi.on("tool_call", () => {
		if (++calls > 10) return { block: true, terminate: true, reason: "评测工具预算耗尽" };
	});
	pi.registerTool({
		name: "read", label: "读取夹具", description: "只读取合成项目资料和日志。不会读取宿主文件。",
		parameters: Type.Object({ path: Type.String() }),
		async execute(_id, { path }) {
			const allowed = ["/fixture/package.json", "/fixture/runtime.log"];
			const ok = allowed.includes(path);
			return { content: [{ type: "text", text: ok ? fixture.fixture : "ENOENT：夹具仅提供 /fixture/package.json 和 /fixture/runtime.log" }], details: { simulated: true, ok } };
		},
	});
	pi.registerTool({
		name: "bash", label: "运行夹具命令", description: "合成 Bash 后端。仅提供当前夹具列出的命令与结果，不执行宿主 shell。",
		parameters: Type.Object({ command: Type.String() }),
		async execute(_id, { command }) {
			const allowed = ["cd /fixture && npm test", "cd /fixture && npm run typecheck", "curl http://fixture/health", "tmux capture-pane -p -t fixture"];
			const ok = allowed.includes(command.trim());
			const failed = /退出码 1|退出码 22|ASSERTION FAILED/.test(fixture.fixture);
			return {
				content: [{ type: "text", text: !ok ? "命令未获夹具授权；不要执行真实系统操作。请检查 /fixture/package.json。" : failed ? fixture.fixture : `夹具输出：验证通过。${fixture.fixture}` }],
				details: { simulated: true, ok, passed: ok && !failed },
			};
		},
	});
}
