import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createTelemetry, type Telemetry } from "@nyn5255/telemetry";

/**
 * Shared usage funnel for pi-debug-mode.
 *
 * This replaces the package's earlier bespoke funnel (env-var-only opt-in, its own
 * event names and its own state directory). One collector, one schema and one
 * consent model across the published packages means the funnel counts a user
 * once instead of once per package implementation.
 *
 * Off by default. Nothing is written or sent until the user grants consent here
 * or explicitly sets the opt-in environment variables.
 */

export const PACKAGE = "pi-debug-mode";

/** Public collector. The path is irrelevant: the deployment routes every path to the function. */
export const COLLECTOR_ENDPOINT = "https://telemetry-peach.vercel.app/api/events";

/** Published retention window for pseudonymous rows. Mirrors collector/schema.sql. */
export const RETENTION_DAYS = 180;

/** Feature slug allowed by the collector's allow-list. */
export const FEATURE = "debug";

/**
 * Exactly the fields the collector accepts. Listed here so the consent prompt can
 * state them instead of paraphrasing them.
 */
export const SENT_FIELDS = [
	"schema_version",
	"event",
	"event_id",
	"anonymous_install_id",
	"package",
	"version",
	"timestamp",
	"os",
	"node_major",
	"ci",
	"feature",
	"week",
] as const;

/** Never sent. Kept explicit so the promise is auditable rather than implied. */
export const NEVER_SENT = [
	"prompts",
	"bug descriptions",
	"reproduction steps",
	"source code",
	"file paths",
	"repository names",
	"tokens",
	"emails",
	"usernames",
	"model output",
	"IP addresses",
] as const;

export type Consent = "granted" | "denied" | "unset";

interface Prefs {
	schema: 1;
	consent: Consent;
	updatedAt?: string;
	collector?: string;
}

const DEFAULT_PREFS: Prefs = { schema: 1, consent: "unset" };

function truthy(value: string | undefined): boolean {
	const normalized = value?.trim().toLowerCase();
	return !!normalized && normalized !== "0" && normalized !== "false" && normalized !== "no";
}

/**
 * Config root for the package's own preferences. The library keeps its dedupe
 * state elsewhere on purpose: revoking consent must not erase the anonymous id,
 * otherwise a later re-opt-in would look like a brand new install.
 */
export function prefsPath(): string {
	const root =
		process.platform === "win32"
			? process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local")
			: process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
	return join(root, "pi-debug-mode", "telemetry.json");
}

function validPrefs(value: unknown): value is Prefs {
	if (!value || typeof value !== "object") return false;
	const prefs = value as Prefs;
	return prefs.schema === 1 && ["granted", "denied", "unset"].includes(prefs.consent);
}

/** Read the stored consent. A corrupt or unreadable file fails closed to "unset". */
export async function readPrefs(file = prefsPath()): Promise<Prefs> {
	try {
		const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
		return validPrefs(parsed) ? parsed : { ...DEFAULT_PREFS };
	} catch {
		return { ...DEFAULT_PREFS };
	}
}

/** Persist consent with an atomic rename and owner-only permissions. */
export async function writePrefs(consent: Consent, file = prefsPath()): Promise<void> {
	const target: Prefs = {
		schema: 1,
		consent,
		updatedAt: new Date().toISOString(),
		collector: COLLECTOR_ENDPOINT,
	};
	await mkdir(dirname(file), { recursive: true, mode: 0o700 });
	const temporary = `${file}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporary, `${JSON.stringify(target)}\n`, { mode: 0o600, flag: "wx" });
		await rename(temporary, file);
	} finally {
		await rm(temporary, { force: true }).catch(() => undefined);
	}
}

/**
 * Effective consent.
 *
 * Precedence, highest first:
 *  1. DO_NOT_TRACK / PI_TELEMETRY_DISABLED — always off, no consent is enough.
 *  2. PI_DEBUG_MODE_TELEMETRY=1|0 — process override for scripted runs.
 *  3. Legacy PI_USAGE_TELEMETRY=1 + PI_USAGE_TELEMETRY_PRIVACY_ACK=1 — the previous
 *     funnel's opt-in, honored so an operator who already opted in is not silently
 *     turned off by the migration.
 *  4. Stored consent from /debug-telemetry.
 */
export async function resolveConsent(
	env: NodeJS.ProcessEnv = process.env,
	file = prefsPath(),
): Promise<Consent> {
	if (truthy(env.DO_NOT_TRACK) || truthy(env.PI_TELEMETRY_DISABLED)) return "denied";
	const override = env.PI_DEBUG_MODE_TELEMETRY?.trim().toLowerCase();
	if (override === "1" || override === "true") return "granted";
	if (override === "0" || override === "false") return "denied";
	if (truthy(env.PI_USAGE_TELEMETRY) && truthy(env.PI_USAGE_TELEMETRY_PRIVACY_ACK)) return "granted";
	return (await readPrefs(file)).consent;
}

/**
 * Build the client for the current consent state. `collectorPrivacyAcknowledged`
 * is set because the collector code stores no connection metadata and never logs a
 * payload; the consent prompt states separately what the hosting platform itself
 * may still record, so the user is not asked to trust an unstated claim.
 */
export function createFunnel(consent: Consent, options: { version: string; stateDirectory?: string; env?: NodeJS.ProcessEnv } = { version: "0.0.0" }): Telemetry {
	const env = options.env ?? process.env;
	return createTelemetry({
		package: PACKAGE,
		version: options.version,
		endpoint:
			env.PI_DEBUG_MODE_TELEMETRY_ENDPOINT?.trim() ||
			env.PI_USAGE_TELEMETRY_ENDPOINT?.trim() ||
			COLLECTOR_ENDPOINT,
		enabled: consent === "granted",
		collectorPrivacyAcknowledged: true,
		features: [FEATURE],
		// The 500 ms library default is shorter than a serverless cold start over a
		// long-haul link; 1000 ms is the library maximum.
		timeoutMs: 1000,
		stateDirectory: options.stateDirectory,
	});
}

/** Consent copy shown before the user decides. Both promises and the retention are stated. */
export function consentSummary(): string[] {
	return [
		`Collector: ${COLLECTOR_ENDPOINT}`,
		`Fields: ${SENT_FIELDS.join(", ")}`,
		`Never sent: ${NEVER_SENT.join(", ")}`,
		`Retention: pseudonymous rows are deleted after ${RETENTION_DAYS} days.`,
		"Stored locally: one random anonymous install id plus once-only flags, so each event is sent at most one time.",
		"Network failures are ignored: telemetry never blocks or delays debugging.",
		"Hosting note: the collector stores no IP; the platform that runs it may keep short-lived technical request logs outside this package's control.",
	];
}
