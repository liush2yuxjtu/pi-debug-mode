export type ReproductionOutcome =
	| { kind: "fixed" }
	| { kind: "reproduced" }
	| { kind: "prompt"; text: string }
	| { kind: "cancelled" }
	| { kind: "unavailable" };

export function outcomeMessage(outcome: ReproductionOutcome): string {
	switch (outcome.kind) {
		case "fixed":
			return "User confirmed the issue is fixed. Remove all temporary debug instrumentation, run the smallest relevant validation, and summarize the root cause and fix.";
		case "reproduced":
			return "User reproduced the issue. Read the captured runtime evidence now, update the hypotheses, and try again with a targeted fix or better instrumentation.";
		case "prompt":
			return `User provided additional debug context: ${outcome.text}`;
		case "cancelled":
			return "User cancelled the reproduction checkpoint. Pause debug-mode work without claiming the issue is fixed.";
		case "unavailable":
			return "Interactive UI is unavailable. Ask the user to reply with: Fixed; Issue reproduced, please try again; or additional debug context.";
		default: {
			const exhaustive: never = outcome;
			return exhaustive;
		}
	}
}
