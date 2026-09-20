import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdtemp, rm, writeFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

const DEFAULT_ENDPOINT = "https://telemetry-peach.vercel.app/api/feedback";
const MAX_SESSION_BYTES = 8_000_000;
const MAX_FILES = 9;
const MAX_PAYLOAD_BYTES = 3_400_000;
const SENSITIVE_ENV = /(TOKEN|SECRET|PASSWORD|PASSWD|API.?KEY|AUTH|COOKIE|CREDENTIAL|DATABASE_URL|POSTGRES|PGPASSWORD|PRIVATE.?KEY)/i;
const SENSITIVE_KEY = /^(?:token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key|access[_-]?key|refresh[_-]?token|headers?|environment|env)$/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_CREDENTIAL = /([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^@\s/]+@/gi;
const INLINE_SECRETS = [
	/\bsk-[A-Za-z0-9_-]{16,}\b/g,
	/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
	/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
	/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,
	/\bpat[A-Za-z0-9._-]{24,}\b/g,
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

interface RedactionSummary {
	secret_replacements: number;
	images_removed: number;
	paths_redacted: number;
	emails_redacted: number;
}

interface FeedbackFile {
	name: string;
	sha256: string;
	content_gzip_base64: string;
	original_bytes: number;
	gzip_bytes: number;
}

interface PreparedBundle {
	files: FeedbackFile[];
	redaction: RedactionSummary & { scanner: string; scanner_version: string };
	rawBytes: number;
	redactedBytes: number;
	gzipBytes: number;
}

function version(): string {
	return String(
		JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version,
	);
}

function networkDisabled(): boolean {
	return (
		process.env.DO_NOT_TRACK === "1" ||
		process.env.PI_TELEMETRY_DISABLED === "1"
	);
}

function envSecrets(env: NodeJS.ProcessEnv = process.env): string[] {
	const values = new Set<string>();
	for (const [key, value] of Object.entries(env)) {
		if (value && value.length >= 8 && SENSITIVE_ENV.test(key)) values.add(value);
	}
	return [...values].sort((a, b) => b.length - a.length);
}

function replaceCount(
	text: string,
	pattern: string | RegExp,
	replacement: string,
): { text: string; count: number } {
	let count = 0;
	if (typeof pattern === "string") {
		if (!pattern) return { text, count };
		let index = text.indexOf(pattern);
		while (index >= 0) {
			count++;
			index = text.indexOf(pattern, index + pattern.length);
		}
		return { text: text.split(pattern).join(replacement), count };
	}
	return {
		text: text.replace(pattern, () => {
			count++;
			return replacement;
		}),
		count,
	};
}

export function redactString(
	input: string,
	summary: RedactionSummary,
	secrets = envSecrets(),
): string {
	let text = input;
	for (const secret of secrets) {
		const result = replaceCount(text, secret, "<redacted-secret>");
		text = result.text;
		summary.secret_replacements += result.count;
	}
	for (const pattern of INLINE_SECRETS) {
		const result = replaceCount(text, pattern, "<redacted-secret>");
		text = result.text;
		summary.secret_replacements += result.count;
	}
	{
		let count = 0;
		text = text.replace(URL_CREDENTIAL, (_match, scheme: string) => {
			count++;
			return `${scheme}<redacted-credentials>@`;
		});
		summary.secret_replacements += count;
	}
	const home = homedir();
	if (home && text.includes(home)) {
		const result = replaceCount(text, home, "$HOME");
		text = result.text;
		summary.paths_redacted += result.count;
	}
	{
		const result = replaceCount(text, EMAIL, "<redacted-email>");
		text = result.text;
		summary.emails_redacted += result.count;
	}
	return text;
}

function redactValue(
	value: unknown,
	summary: RedactionSummary,
	secrets: string[],
	key?: string,
	parentType?: string,
): unknown {
	if (key && SENSITIVE_KEY.test(key)) {
		summary.secret_replacements++;
		return `<redacted-${key.toLowerCase()}>`;
	}
	if (parentType === "image" && key === "data") {
		summary.images_removed++;
		return "<image-removed>";
	}
	if (typeof value === "string") return redactString(value, summary, secrets);
	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item, summary, secrets));
	}
	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const type = typeof record.type === "string" ? record.type : undefined;
		const out: Record<string, unknown> = {};
		for (const [childKey, child] of Object.entries(record)) {
			out[childKey] = redactValue(child, summary, secrets, childKey, type);
		}
		return out;
	}
	return value;
}

function safeChildSession(
	mainSessionFile: string,
	candidate: string,
): string | undefined {
	if (!candidate.endsWith(".jsonl")) return;
	const mainDir = resolve(dirname(mainSessionFile));
	const resolved = resolve(candidate);
	if (dirname(resolved) !== mainDir) return;
	return resolved;
}

export function collectReferencedChildSessions(
	mainSessionFile: string,
	mainText: string,
): string[] {
	const files = new Set<string>();
	for (const line of mainText.split(/\r?\n/)) {
		if (!line.trim()) continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			continue;
		}
		const walk = (value: unknown, key?: string) => {
			if (key === "childSessionFile" && typeof value === "string") {
				const safe = safeChildSession(mainSessionFile, value);
				if (safe) files.add(safe);
				return;
			}
			if (Array.isArray(value)) {
				for (const item of value) walk(item);
				return;
			}
			if (value && typeof value === "object") {
				for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
					walk(child, childKey);
				}
			}
		};
		walk(parsed);
	}
	return [...files].slice(0, MAX_FILES - 1);
}

export function redactSessionText(
	text: string,
	summary: RedactionSummary,
	secrets = envSecrets(),
): string {
	const output: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			throw new Error("Session contains an invalid JSONL line; transcript upload blocked.");
		}
		output.push(JSON.stringify(redactValue(parsed, summary, secrets)));
	}
	return output.length ? `${output.join("\n")}\n` : "";
}

async function readBounded(path: string): Promise<string> {
	const info = await stat(path);
	if (!info.isFile() || info.size > MAX_SESSION_BYTES) {
		throw new Error(`Session is larger than ${MAX_SESSION_BYTES} bytes; transcript upload blocked.`);
	}
	return readFile(path, "utf8");
}

async function scanWithTruffleHog(
	pi: ExtensionAPI,
	paths: string[],
): Promise<string> {
	const versionResult = await pi.exec("trufflehog", ["--version"], { timeout: 10_000 });
	if (versionResult.code !== 0) {
		throw new Error("TruffleHog is required for transcript upload but is not installed.");
	}
	const scan = await pi.exec(
		"trufflehog",
		[
			"filesystem",
			...paths,
			"-j",
			"--results=verified,unknown,unverified",
			"--no-color",
			"--no-update",
		],
		{ timeout: 120_000 },
	);
	if (scan.code !== 0) {
		throw new Error("TruffleHog scan failed; transcript upload blocked.");
	}
	const findings = scan.stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (findings.length > 0) {
		throw new Error(`TruffleHog found ${findings.length} possible secret(s); transcript upload blocked.`);
	}
	return versionResult.stdout.trim().slice(0, 100) || "unknown";
}

export async function prepareBundle(
	pi: ExtensionAPI,
	mainSessionFile: string,
): Promise<PreparedBundle> {
	const temp = await mkdtemp(join(tmpdir(), "pi-debug-feedback-"));
	const summary: RedactionSummary = {
		secret_replacements: 0,
		images_removed: 0,
		paths_redacted: 0,
		emails_redacted: 0,
	};
	try {
		const mainText = await readBounded(mainSessionFile);
		const children = collectReferencedChildSessions(mainSessionFile, mainText);
		const sources = [mainSessionFile, ...children];
		if (sources.length > MAX_FILES) throw new Error("Too many transcript files; upload blocked.");

		const secrets = envSecrets();
		const redacted: Array<{ name: string; path: string; text: string; rawBytes: number }> = [];
		for (const [index, source] of sources.entries()) {
			const raw = index === 0 ? mainText : await readBounded(source);
			const text = redactSessionText(raw, summary, secrets);
			const name = index === 0 ? `main-${basename(source)}` : `subtask-${index}-${basename(source)}`;
			const redactedPath = join(temp, name);
			await writeFile(redactedPath, text, { encoding: "utf8", mode: 0o600 });
			redacted.push({ name, path: redactedPath, text, rawBytes: Buffer.byteLength(raw) });
		}

		const scannerVersion = await scanWithTruffleHog(pi, redacted.map((entry) => entry.path));
		const files: FeedbackFile[] = [];
		let rawBytes = 0;
		let redactedBytes = 0;
		let gzipBytes = 0;
		for (const entry of redacted) {
			const bytes = Buffer.from(entry.text, "utf8");
			const gzip = gzipSync(bytes, { level: 9 });
			rawBytes += entry.rawBytes;
			redactedBytes += bytes.length;
			gzipBytes += gzip.length;
			files.push({
				name: `${entry.name}.gz`,
				sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
				content_gzip_base64: gzip.toString("base64"),
				original_bytes: bytes.length,
				gzip_bytes: gzip.length,
			});
		}

		return {
			files,
			redaction: { ...summary, scanner: "trufflehog", scanner_version: scannerVersion },
			rawBytes,
			redactedBytes,
			gzipBytes,
		};
	} finally {
		await rm(temp, { recursive: true, force: true }).catch(() => undefined);
	}
}

function emptyRedaction(): PreparedBundle["redaction"] {
	return {
		scanner: "local-redaction",
		scanner_version: "1",
		secret_replacements: 0,
		images_removed: 0,
		paths_redacted: 0,
		emails_redacted: 0,
	};
}

async function postFeedback(payload: object): Promise<string> {
	const endpoint = process.env.PI_DEBUG_FEEDBACK_ENDPOINT ?? DEFAULT_ENDPOINT;
	const body = JSON.stringify(payload);
	if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) {
		throw new Error("Feedback bundle is too large after compression; nothing was uploaded.");
	}
	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body,
		signal: AbortSignal.timeout(30_000),
	});
	const result = (await response.json().catch(() => ({}))) as { feedback_id?: string; error?: string };
	if (!response.ok || !result.feedback_id) {
		throw new Error(`Feedback upload failed (${response.status}).`);
	}
	return result.feedback_id;
}

export function registerDebugFeedback(pi: ExtensionAPI): void {
	pi.registerCommand("debug-feedback", {
		description:
			"Send explicit feedback; optionally attach locally redacted main + /subtask transcripts after secret scanning and confirmation",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/debug-feedback requires an interactive UI.", "warning");
				return;
			}
			if (networkDisabled()) {
				ctx.ui.notify("Feedback upload is disabled by DO_NOT_TRACK or PI_TELEMETRY_DISABLED.", "warning");
				return;
			}

			const entered = (
				await ctx.ui.editor(
					"Feedback for pi-debug-mode (this text will be uploaded):",
					args.trim(),
				)
			)?.trim();
			if (!entered) return;

			const feedbackSummary: RedactionSummary = {
				secret_replacements: 0,
				images_removed: 0,
				paths_redacted: 0,
				emails_redacted: 0,
			};
			const feedback = redactString(entered.slice(0, 8000), feedbackSummary);
			const choice = await ctx.ui.select(
				"Attach transcripts?",
				[
					"Feedback text only",
					"Feedback + redacted main/subtask transcripts",
				],
			);
			if (!choice) return;

			let bundle: PreparedBundle | undefined;
			if (choice.includes("transcripts")) {
				const mainSessionFile = ctx.sessionManager.getSessionFile();
				if (!mainSessionFile) {
					ctx.ui.notify("Current session is not persisted; transcript upload is unavailable.", "warning");
					return;
				}
				const firstConsent = await ctx.ui.confirm(
					"Prepare redacted transcripts?",
					[
						"Raw transcripts never leave this machine.",
						"Main session + referenced pi-subtask child sessions are copied to a temporary directory, deterministic secrets/paths/emails/images are redacted, then TruffleHog must report zero findings.",
						"If the scanner is missing or finds anything, transcript upload is blocked.",
					].join("\n"),
				);
				if (!firstConsent) return;
				try {
					bundle = await prepareBundle(pi, mainSessionFile);
				} catch (error) {
					ctx.ui.notify(error instanceof Error ? error.message : String(error), "warning");
					const textOnly = await ctx.ui.confirm(
						"Send feedback text only?",
						"No transcript will be uploaded.",
					);
					if (!textOnly) return;
				}
			}

			const redaction = bundle
				? {
						...bundle.redaction,
						secret_replacements:
							bundle.redaction.secret_replacements + feedbackSummary.secret_replacements,
						paths_redacted: bundle.redaction.paths_redacted + feedbackSummary.paths_redacted,
						emails_redacted: bundle.redaction.emails_redacted + feedbackSummary.emails_redacted,
					}
				: { ...emptyRedaction(), ...feedbackSummary, scanner: "local-redaction", scanner_version: "1" };

			const files = bundle?.files ?? [];
			const details = bundle
				? [
						`${files.length} transcript file(s)`,
						`${bundle.rawBytes} raw bytes processed locally`,
						`${bundle.redactedBytes} redacted bytes`,
						`${bundle.gzipBytes} compressed bytes`,
						`${redaction.secret_replacements} secret replacement(s)`,
						`${redaction.paths_redacted} home-path replacement(s)`,
						`${redaction.emails_redacted} email replacement(s)`,
						`${redaction.images_removed} image payload(s) removed`,
						`Scanner: ${redaction.scanner} ${redaction.scanner_version}`,
						"Server retention: 30 days",
					]
				: ["Feedback text only", "No transcript files", "Server retention: 30 days"];

			const finalConsent = await ctx.ui.confirm(
				"Upload this feedback?",
				`${details.join("\n")}\n\nThe hosting platform can see the source IP at connection time.`,
			);
			if (!finalConsent) return;

			try {
				const feedbackId = await postFeedback({
					schema_version: 1,
					feedback_id: randomUUID(),
					package: "pi-debug-mode",
					version: version(),
					client_timestamp: new Date().toISOString(),
					feedback,
					files,
					redaction,
				});
				ctx.ui.notify(`Feedback uploaded. Reference: ${feedbackId}`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
