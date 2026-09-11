import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
	AUTOPILOT_INSTRUCTIONS,
	outcomeMessage,
	type ReproductionOutcome,
} from "./protocol.ts";

const STATE_ENTRY = "pi-debug-mode:state";
const AUTOPILOT_OPTION = "Autopilot — Agent 自行验证";
const OPTIONS = [
	"Fixed",
	"Issue reproduced, please try again",
	"Type prompt…",
	AUTOPILOT_OPTION,
] as const;

interface DebugState {
	active: boolean;
	bug: string;
	autopilot: boolean;
}

interface PersistedState {
	version: 1;
	active: boolean;
	bug: string;
	autopilot?: boolean;
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
		...(state.autopilot ? { autopilot: true } : {}),
	});
}

function updateStatus(
	ctx: ExtensionContext,
	active: boolean,
	autopilot = false,
): void {
	if (!ctx.hasUI) return;
	ctx.ui.setStatus(
		"pi-debug-mode",
		active
			? ctx.ui.theme.fg("warning", autopilot ? "debug · autopilot" : "debug")
			: undefined,
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
		typeof value.bug === "string" &&
		(!("autopilot" in value) || typeof value.autopilot === "boolean")
	);
}

export default function debugMode(pi: ExtensionAPI): void {
	const state: DebugState = { active: false, bug: "", autopilot: false };

	pi.registerCommand("debug", {
		description: "start evidence-first debug mode",
		handler: async (args, ctx) => {
			const bug =
				args.trim() ||
				(ctx.hasUI
					? (await ctx.ui.editor("Describe the bug:", ""))?.trim()
					: undefined);
			if (!bug) return;

			state.active = true;
			state.bug = bug;
			persist(pi, state);
			updateStatus(ctx, true, state.autopilot);
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
			"Debug checkpoint: Fixed, reproduced, custom feedback, or enable Autopilot prompt guidance. In Autopilot, perform machine-checkable verification yourself; only request human visual/UI/aesthetic judgment with humanReason. Use only in active Pi Debug Mode.",
		promptSnippet:
			"Debug checkpoint with optional Autopilot self-verification guidance",
		promptGuidelines: [
			"Use debug_reproduction for Pi Debug Mode human checkpoints. In Autopilot, verify command/test/API/log behavior yourself; use humanReason only for human visual, click/UI, or aesthetic judgment. Never delegate machine-checkable verification to the user.",
		],
		executionMode: "sequential",
		parameters: Type.Object({
			title: Type.String({ description: "Short checkpoint title" }),
			humanReason: Type.Optional(
				Type.String({
					minLength: 1,
					description:
						"In Autopilot only: precise visual, click/UI, or aesthetic judgment requiring a human. Omit for machine-checkable tasks.",
				}),
			),
			steps: Type.Array(Type.String(), {
				minItems: 1,
				description: "Exact ordered steps the user should perform",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!state.active) {
				throw new Error("Pi Debug Mode is inactive. Start /debug first.");
			}
			let outcome: ReproductionOutcome;

			if (_signal?.aborted) {
				outcome = { kind: "cancelled" };
			} else if (state.autopilot && !params.humanReason?.trim()) {
				outcome = { kind: "autopilot" };
			} else if (!ctx.hasUI) {
				outcome = { kind: "unavailable" };
			} else {
				const steps = params.steps
					.map((step, index) => `${index + 1}. ${step}`)
					.join("\n");
				const choice = await ctx.ui.select(
					`${params.title}\n${params.humanReason?.trim() ?? ""}\n${steps}`,
					[...OPTIONS].filter(
						(option) => !state.autopilot || option !== AUTOPILOT_OPTION,
					),
					{ signal: _signal },
				);

				if (choice === AUTOPILOT_OPTION) {
					state.autopilot = true;
					persist(pi, state);
					updateStatus(ctx, true, true);
					outcome = { kind: "autopilot" };
				} else if (choice === "Fixed") {
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
			systemPrompt: `${event.systemPrompt}\n\n${state.autopilot
			? `[PI DEBUG MODE ACTIVE]\nBug: ${state.bug}\n\n${AUTOPILOT_INSTRUCTIONS}`
			: debugInstructions(state.bug)}`,
		};
	});

	const restore = (_event: unknown, ctx: ExtensionContext) => {
		state.active = false;
		state.bug = "";
		state.autopilot = false;
		const latest = ctx.sessionManager
			.getBranch()
			.toReversed()
			.find(
				(entry) => entry.type === "custom" && entry.customType === STATE_ENTRY,
			);
		if (latest?.type === "custom" && isPersistedState(latest.data)) {
			state.active = latest.data.active;
			state.bug = latest.data.bug;
			state.autopilot = latest.data.autopilot ?? false;
		}
		updateStatus(ctx, state.active, state.autopilot);
	};
	pi.on("session_start", restore);
	pi.on("session_tree", restore);
}
