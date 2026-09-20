import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	COLLECTOR_ENDPOINT,
	RETENTION_DAYS,
	SENT_FIELDS,
	consentSummary,
	createFunnel,
	firstRunNotice,
	markNoticeShown,
	prefsPath,
	readPrefs,
	resolveConsent,
	writePrefs,
} from "../src/telemetry.ts";
import usageInstrumentedDebugMode from "../src/usage-entry.ts";

const ENV_KEYS = [
	"CI", "GITHUB_ACTIONS", "GITLAB_CI", "TF_BUILD", "JENKINS_URL", "BUILD_ID",
	"DO_NOT_TRACK", "PI_TELEMETRY_DISABLED", "PI_DEBUG_MODE_TELEMETRY", "PI_DBG_TEST",
	"PI_DEBUG_MODE_TELEMETRY_ENDPOINT", "PI_USAGE_TELEMETRY", "PI_USAGE_TELEMETRY_PRIVACY_ACK",
	"PI_USAGE_TELEMETRY_ENDPOINT", "XDG_CONFIG_HOME",
];

let root: string;
let sent: Array<{ url: unknown; body: any }>;
let originalEnv: NodeJS.ProcessEnv;
let originalRequest: typeof https.request;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "pi-debug-telemetry-"));
	originalEnv = { ...process.env };
	originalRequest = https.request;
	sent = [];
	for (const key of ENV_KEYS) delete process.env[key];
	process.env.XDG_CONFIG_HOME = root;
	https.request = ((url: unknown, _options: unknown, callback: () => void) => {
		const request = new EventEmitter() as any;
		request.destroy = () => { queueMicrotask(() => request.emit("close")); return request; };
		request.end = (body: string) => {
			sent.push({ url, body: JSON.parse(body) });
			queueMicrotask(callback);
		};
		return request;
	}) as typeof https.request;
	syncBuiltinESMExports();
});

afterEach(async () => {
	https.request = originalRequest;
	syncBuiltinESMExports();
	process.env = { ...originalEnv };
	await rm(root, { recursive: true, force: true });
});

function fakePi() {
	const handlers = new Map<string, Array<(...args: any[]) => unknown>>();
	const commands = new Map<string, any>();
	const tools = new Map<string, any>();
	const pi = {
		on: (name: string, handler: (...args: any[]) => unknown) => {
			handlers.set(name, [...(handlers.get(name) ?? []), handler]);
		},
		registerCommand: (name: string, command: any) => commands.set(name, command),
		registerTool: (tool: any) => tools.set(tool?.name, tool),
		appendEntry: () => undefined,
		sendUserMessage: async () => undefined,
	};
	// Every handler Pi would call, in registration order: index.ts and the
	// telemetry wrapper both subscribe to session_start.
	const fire = (name: string, ...args: any[]) =>
		(handlers.get(name) ?? []).map((handler) => handler(...args));
	return { pi: pi as any, handlers, fire, commands, tools };
}

function fakeCtx(options: { confirm?: boolean; select?: string; editor?: string } = {}) {
	const notifications: string[] = [];
	const confirmations: Array<{ title: string; message: string }> = [];
	return {
		ctx: {
			hasUI: true,
			sessionManager: { getBranch: () => [] as unknown[] },
			waitForIdle: async () => undefined,
			ui: {
				theme: { fg: (_color: string, text: string) => text },
				setStatus: () => undefined,
				notify: (message: string) => notifications.push(message),
				confirm: async (title: string, message: string) => {
					confirmations.push({ title, message });
					return options.confirm === true;
				},
				editor: async () => options.editor,
				select: async () => options.select,
			},
		} as any,
		notifications,
		confirmations,
	};
}

const events = () => sent.map((entry) => entry.body.event);

test("telemetry is on by default and an explicit opt-out silences it", async () => {
	assert.equal(await resolveConsent(), "granted", "opt-out default");

	const denied = await writePrefs("denied"), _ = denied;
	assert.equal(await resolveConsent(), "denied");
	const funnel = createFunnel(await resolveConsent(), { version: "0.1.9" });
	await funnel.install();
	await funnel.activated("debug");
	await funnel.flush();
	assert.equal(sent.length, 0, "an explicit opt-out must send nothing");
});

test("granted consent persists with a stated collector and sends the funnel events", async () => {
	await writePrefs("granted");
	assert.equal(await resolveConsent(), "granted");
	const stored = JSON.parse(await readFile(prefsPath(), "utf8"));
	assert.equal(stored.schema, 1);
	assert.equal(stored.consent, "granted");
	assert.equal(typeof stored.noticeShown, "boolean");
	assert.equal(stored.collector, COLLECTOR_ENDPOINT);
	assert.ok(stored.updatedAt);
	const mode = (await stat(prefsPath())).mode & 0o777;
	assert.equal(mode, 0o600, "preferences must not be world readable");

	const funnel = createFunnel(await resolveConsent(), { version: "0.1.9" });
	await funnel.install();
	await funnel.activated("debug");
	await funnel.success("debug");
	await funnel.flush();
	assert.deepEqual(events().sort(), ["activated", "first_success", "install", "weekly_active"]);
	for (const entry of sent) {
		assert.equal(entry.body.package, "pi-debug-mode");
		assert.equal(entry.body.version, "0.1.9");
		assert.equal(entry.body.ci, false);
		assert.equal(entry.body.schema_version, 1);
		assert.equal(typeof entry.body.anonymous_install_id, "string");
		const payloadKeys = Object.keys(entry.body).filter((key) => entry.body[key] !== undefined);
		for (const key of payloadKeys) assert.ok(SENT_FIELDS.includes(key as any), `unexpected field ${key}`);
	}
});

test("opt-outs always win, and an explicit off beats the default", async () => {
	assert.equal(await resolveConsent(), "granted", "default is on");
	process.env.DO_NOT_TRACK = "1";
	assert.equal(await resolveConsent(), "denied");
	delete process.env.DO_NOT_TRACK;
	process.env.PI_TELEMETRY_DISABLED = "true";
	assert.equal(await resolveConsent(), "denied");
	delete process.env.PI_TELEMETRY_DISABLED;

	await writePrefs("denied");
	assert.equal(await resolveConsent(), "denied", "a stored off must survive");
	process.env.PI_DEBUG_MODE_TELEMETRY = "1";
	assert.equal(await resolveConsent(), "granted", "process override re-enables for one run");
	process.env.PI_DEBUG_MODE_TELEMETRY = "0";
	assert.equal(await resolveConsent(), "denied");
	delete process.env.PI_DEBUG_MODE_TELEMETRY;

	await writePrefs("unset");
	assert.equal(await resolveConsent(), "granted", "back to the default");

	process.env.PI_USAGE_TELEMETRY = "1";
	process.env.PI_USAGE_TELEMETRY_PRIVACY_ACK = "1";
	assert.equal(await resolveConsent(), "granted", "the old funnel's opt-in still counts");
});

test("corrupt preferences are rejected, which means the disclosure is shown again", async () => {
	await writePrefs("granted");
	await markNoticeShown();
	assert.equal((await readPrefs()).noticeShown, true);
	await writeFile(prefsPath(), "{not json");
	assert.deepEqual(await readPrefs(), { schema: 1, consent: "unset", noticeShown: false });
	await writePrefs("granted");
	await writeFile(prefsPath(), JSON.stringify({ schema: 1, consent: "yes" }));
	assert.equal(await readPrefs().then((prefs) => prefs.consent), "unset");
});

test("a granted run instruments install, activation, success, and weekly active", async () => {
	await writePrefs("granted");
	const { pi, fire, commands, tools } = fakePi();
	await usageInstrumentedDebugMode(pi);

	assert.ok(commands.has("debug-telemetry"), "consent command must exist");

	const ctx = fakeCtx({ editor: "a bug", select: "Fixed" }).ctx;
	fire("session_start", {}, ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(events().includes("install"));

	await commands.get("debug").handler("a bug", ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(events().includes("activated"));
	assert.ok(events().includes("weekly_active"));

	const reproduction = tools.get("debug_reproduction");
	assert.ok(reproduction, "debug_reproduction must still be registered");
	await reproduction.execute("call-1", { title: "check", steps: ["step"] }, undefined, undefined, ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(events().includes("first_success"));
});

test("a denied run stays silent even when the extension is used", async () => {
	await writePrefs("denied");
	const { pi, fire, commands, tools } = fakePi();
	await usageInstrumentedDebugMode(pi);
	const ctx = fakeCtx({ editor: "a bug", select: "Fixed" }).ctx;
	fire("session_start", {}, ctx);
	await commands.get("debug").handler("a bug", ctx);
	await tools.get("debug_reproduction").execute("call-1", { title: "check", steps: ["step"] }, undefined, undefined, ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.deepEqual(sent, [], "no consent must mean no traffic");
});

test("the first interactive session discloses the collector, fields, and retention once", async () => {
	const { pi, fire } = fakePi();
	await usageInstrumentedDebugMode(pi);
	assert.equal((await readPrefs()).noticeShown, false, "not shown before any session");

	const first = fakeCtx();
	fire("session_start", {}, first.ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(first.notifications.length, 1, "the notice must actually be displayed");
	const shown = first.notifications[0];
	assert.ok(shown.includes(COLLECTOR_ENDPOINT));
	assert.ok(shown.includes(`${RETENTION_DAYS} days`));
	assert.ok(shown.includes("anonymous_install_id"));
	assert.ok(shown.includes("ON by default"));
	assert.match(shown, /DO_NOT_TRACK=1/);
	assert.equal((await readPrefs()).noticeShown, true, "shown once, then recorded");

	const second = fakeCtx();
	fire("session_start", {}, second.ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(second.notifications.length, 0, "no repeat notice on later sessions");
});

test("a headless session never consumes the disclosure", async () => {
	const { pi, fire } = fakePi();
	await usageInstrumentedDebugMode(pi);
	const headless = fakeCtx();
	headless.ctx.hasUI = false;
	fire("session_start", {}, headless.ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal((await readPrefs()).noticeShown, false, "the notice is owed to a human");

	const interactive = fakeCtx();
	fire("session_start", {}, interactive.ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(interactive.notifications.length, 1);
});

test("status and off report and change the default state", async () => {
	const { pi, commands } = fakePi();
	await usageInstrumentedDebugMode(pi);

	const status = fakeCtx();
	await commands.get("debug-telemetry").handler("status", status.ctx);
	assert.match(status.notifications[0], /Usage telemetry: on \(default\)/);
	assert.ok(status.notifications[0].includes("Never sent"));
	assert.ok(status.notifications[0].includes(COLLECTOR_ENDPOINT));

	const on = fakeCtx();
	await commands.get("debug-telemetry").handler("on", on.ctx);
	assert.match(on.notifications[0], /Usage telemetry enabled/);
	assert.equal(await resolveConsent(), "granted");

	await commands.get("debug-telemetry").handler("off", fakeCtx().ctx);
	assert.equal(await resolveConsent(), "denied");
});

test("the consent copy promises exactly the fields the collector accepts", () => {
	const summary = consentSummary().join("\n");
	for (const field of SENT_FIELDS) assert.ok(summary.includes(field), `missing ${field}`);
	assert.ok(summary.includes(`${RETENTION_DAYS} days`));
	assert.match(summary, /never blocks/);
	assert.match(firstRunNotice().join("\n"), /ON by default/);
	assert.match(summary, /may keep short-lived technical request logs/);
});
