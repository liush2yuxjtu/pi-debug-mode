import { readFileSync } from "node:fs";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Telemetry } from "@nyn5255/telemetry";
import debugMode from "./index.ts";
import {
	COLLECTOR_ENDPOINT,
	FEATURE,
	NEVER_SENT,
	RETENTION_DAYS,
	SENT_FIELDS,
	consentSummary,
	createFunnel,
	resolveConsent,
	writePrefs,
} from "./telemetry.ts";

const VERSION = String(
	JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version,
);

/**
 * Usage-funnel entry point.
 *
 * The extension is loaded through this wrapper so the funnel can see real usage
 * (a debug session starting, a reproduction ending in Fixed) without the debug
 * implementation knowing telemetry exists. Consent is checked once at load and
 * again whenever the user changes it with `/debug-telemetry`.
 */
export default async function usageInstrumentedDebugMode(pi: ExtensionAPI): Promise<void> {
	let telemetry: Telemetry | undefined;
	let consent = await resolveConsent();

	if (consent === "granted") telemetry = createFunnel(consent, { version: VERSION });

	const funnel = (): Telemetry | undefined => telemetry;

	pi.registerCommand("debug-telemetry", {
		description: "Usage telemetry consent: status, on, off (off by default)",
		handler: async (args: string, ctx: ExtensionContext) => {
			const action = args.trim().toLowerCase();
			const lines = consentSummary();

			if (action === "on") {
				if (!ctx.hasUI) {
					await writePrefs("granted");
					consent = "granted";
					telemetry = createFunnel(consent, { version: VERSION });
					return;
				}
				const agreed = await ctx.ui.confirm(
					"Enable pi-debug-mode usage telemetry?",
					[...lines, "", "Enable now?"].join("\n"),
				);
				if (!agreed) {
					ctx.ui.notify("Telemetry stays off.", "info");
					return;
				}
				await writePrefs("granted");
				consent = "granted";
				telemetry = createFunnel(consent, { version: VERSION });
				ctx.ui.notify("Usage telemetry enabled. /debug-telemetry off revokes it.", "info");
				return;
			}

			if (action === "off") {
				await writePrefs("denied");
				consent = "denied";
				funnel()?.disable();
				telemetry = undefined;
				ctx.ui.notify("Usage telemetry disabled.", "info");
				return;
			}

			const state =
				consent === "granted" ? "on" : consent === "denied" ? "off" : "off (never decided)";
			const envOverride =
				process.env.PI_DEBUG_MODE_TELEMETRY ??
				(process.env.PI_USAGE_TELEMETRY ? "legacy PI_USAGE_TELEMETRY" : undefined);
			const message = [
				`Usage telemetry: ${state}`,
				`Collector: ${COLLECTOR_ENDPOINT}`,
				`Fields: ${SENT_FIELDS.join(", ")}`,
				`Never sent: ${NEVER_SENT.join(", ")}`,
				`Retention: ${RETENTION_DAYS} days`,
				envOverride ? `Process override active: ${envOverride}` : "No process override.",
				...lines.slice(-1),
				"Enable with /debug-telemetry on, revoke with /debug-telemetry off.",
			].join("\n");
			ctx.ui.notify(message, "info");
		},
	});

	const instrumented = new Proxy(pi, {
		get(target, property, receiver) {
			if (property === "registerCommand") {
				return (name: string, command: { handler?: (args: string, ctx: ExtensionContext) => unknown }) => {
					if (name !== "debug" || typeof command?.handler !== "function") {
						return target.registerCommand(name, command as never);
					}
					const handler = command.handler.bind(command);
					return target.registerCommand(name, {
						...command,
						async handler(args: string, ctx: ExtensionContext) {
							// A debug session starting is the activation signal, and real use
							// for weekly active — never a timer, never package import.
							void funnel()?.activated(FEATURE);
							void funnel()?.active(FEATURE);
							return handler(args, ctx);
						},
					} as never);
				};
			}
			if (property !== "registerTool") return Reflect.get(target, property, receiver);
			return (tool: any) => {
				if (tool?.name !== "debug_reproduction" || typeof tool.execute !== "function") {
					return target.registerTool(tool);
				}
				const execute = tool.execute.bind(tool);
				return target.registerTool({
					...tool,
					async execute(...args: any[]) {
						const result = await execute(...args);
						if (result?.details?.outcome?.kind === "fixed") void funnel()?.success(FEATURE);
						return result;
					},
				});
			};
		},
	}) as ExtensionAPI;

	pi.on("session_start", () => {
		// One install event per anonymous install id, at most one attempt.
		void funnel()?.install();
	});

	await debugMode(instrumented);
}
