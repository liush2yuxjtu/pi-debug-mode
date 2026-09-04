import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { outcomeMessage, type ReproductionOutcome } from "./protocol.ts";

const STATE_ENTRY = "pi-debug-mode:state";
const OPTIONS = [
	"Fixed",
	"Issue reproduced, please try again",
	"Type prompt…",
] as const;

interface DebugState {
	active: boolean;
	bug: string;
}

interface PersistedState {
	version: 1;
	active: boolean;
	bug: string;
}

interface ReproductionDetails {
	steps: string[];
	outcome: ReproductionOutcome;
}

function debugInstructions(bug: string): string {
	return `[PI DEBUG MODE ACTIVE]\nBug: ${bug}\n\nWork evidence-first:\n1. Inspect the real execution path and list 3-5 competing hypotheses.\n2. Add minimal temporary runtime instrumentation that can distinguish those hypotheses in one reproduction. Mark every probe with "pi-debug" so cleanup is reliable.\n3. Do not make a speculative fix before runtime evidence exists.\n4. Call debug_reproduction with exact reproduction steps after instrumentation.\n5. When the issue is reproduced, read logs directly by exact path even when ignored by git, then make the smallest root-cause fix.\n6. Call debug_reproduction again to verify. Only after the user selects Fixed, remove every pi-debug probe and run the smallest relevant validation.`;
}

function persist(pi: ExtensionAPI, state: DebugState): void {
	pi.appendEntry<PersistedState>(STATE_ENTRY, {
		version: 1,
		active: state.active,
		bug: state.bug,
	});
}

function updateStatus(ctx: ExtensionContext, active: boolean): void {
	ctx.ui.setStatus(
		"pi-debug-mode",
		active ? ctx.ui.theme.fg("warning", "debug") : undefined,
	);
}

function isPersistedState(value: unknown): value is PersistedState {
	return (
		typeof value === "object" &&
		value !== null &&
		"version" in value &&
		value.version === 1 &&
		"active" in value &&
		typeof value.active === "boolean" &&
		"bug" in value &&
		typeof value.bug === "string"
	);
}

export default function debugMode(pi: ExtensionAPI): void {
	const state: DebugState = { active: false, bug: "" };

	pi.registerCommand("debug", {
		description: "start evidence-first debug mode",
		handler: async (args, ctx) => {
			const bug =
				args.trim() || (await ctx.ui.editor("Describe the bug:", ""))?.trim();
			if (!bug) return;

			state.active = true;
			state.bug = bug;
			persist(pi, state);
			updateStatus(ctx, true);
			await ctx.waitForIdle();
			await pi.sendUserMessage(`Debug this issue in Pi Debug Mode:\n\n${bug}`);
		},
	});

	pi.registerCommand("debug-stop", {
		description: "stop debug mode without claiming a fix",
		handler: async (_args, ctx) => {
			state.active = false;
			persist(pi, state);
			updateStatus(ctx, false);
			ctx.ui.notify("Debug mode stopped.", "info");
		},
	});

	pi.registerTool({
		name: "debug_reproduction",
		label: "Reproduce issue",
		description:
			"Present exact reproduction or fix-verification steps, then collect one of three user outcomes: Fixed; Issue reproduced, please try again; or a typed prompt. Use only while Pi Debug Mode is active, after adding instrumentation or applying an evidence-backed fix.",
		promptSnippet:
			"Show debug reproduction steps and collect fixed/reproduced/custom feedback",
		promptGuidelines: [
			"Use debug_reproduction at each Pi Debug Mode human checkpoint instead of asking for reproduction feedback in ordinary prose.",
		],
		executionMode: "sequential",
		parameters: Type.Object({
			title: Type.String({ description: "Short checkpoint title" }),
			steps: Type.Array(Type.String(), {
				minItems: 1,
				description: "Exact ordered steps the user should perform",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			let outcome: ReproductionOutcome;

			if (!ctx.hasUI) {
				outcome = { kind: "unavailable" };
			} else {
				const steps = params.steps
					.map((step, index) => `${index + 1}. ${step}`)
					.join("\n");
				const choice = await ctx.ui.select(`${params.title}\n\n${steps}`, [
					...OPTIONS,
				]);

				if (choice === "Fixed") {
					outcome = { kind: "fixed" };
					state.active = false;
					persist(pi, state);
					updateStatus(ctx, false);
				} else if (choice === "Issue reproduced, please try again") {
					outcome = { kind: "reproduced" };
				} else if (choice === "Type prompt…") {
					const text = (
						await ctx.ui.editor("Additional debug context:", "")
					)?.trim();
					outcome = text ? { kind: "prompt", text } : { kind: "cancelled" };
				} else {
					outcome = { kind: "cancelled" };
				}
			}

			return {
				content: [{ type: "text" as const, text: outcomeMessage(outcome) }],
				details: { steps: params.steps, outcome } satisfies ReproductionDetails,
			};
		},
	});

	pi.on("before_agent_start", (event) => {
		if (!state.active) return;
		return {
			systemPrompt: `${event.systemPrompt}\n\n${debugInstructions(state.bug)}`,
		};
	});

	pi.on("session_start", (_event, ctx) => {
		const latest = ctx.sessionManager
			.getBranch()
			.toReversed()
			.find(
				(entry) => entry.type === "custom" && entry.customType === STATE_ENTRY,
			);
		if (latest?.type === "custom" && isPersistedState(latest.data)) {
			state.active = latest.data.active;
			state.bug = latest.data.bug;
		}
		updateStatus(ctx, state.active);
	});
}
