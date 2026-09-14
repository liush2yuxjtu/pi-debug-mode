import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import debugMode from "./index.ts";

const PACKAGE = "pi-debug-mode";
const VERSION = String(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);

type FunnelState = {
  schema: 1;
  id: string;
  lastDay: string;
  firstSuccess: boolean;
  returned: boolean;
  week: string | null;
};
type FunnelEvent = "first_install" | "first_launch" | "first_success" | "returning_user" | "weekly_active";
function truthy(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
function utcDay(now: number): string { return new Date(now).toISOString().slice(0, 10); }
function utcWeek(now: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function statePath(): string {
  const root = process.platform === "win32"
    ? (process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"))
    : (process.env.XDG_CONFIG_HOME || join(homedir(), ".config"));
  return join(root, "liushiyu-usage-funnel", `${createHash("sha256").update(PACKAGE).digest("hex")}.json`);
}
function config(): { endpoint: URL } | undefined {
  if (!truthy("PI_USAGE_TELEMETRY") || !truthy("PI_USAGE_TELEMETRY_PRIVACY_ACK")) return;
  if (truthy("PI_TELEMETRY_DISABLED") || truthy("DO_NOT_TRACK") || truthy("CI") || truthy("GITHUB_ACTIONS")) return;
  try {
    const endpoint = new URL(process.env.PI_USAGE_TELEMETRY_ENDPOINT || "");
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return;
    return { endpoint };
  } catch { return; }
}
async function send(endpoint: URL, event: FunnelEvent, id: string): Promise<void> {
  try {
    await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema_version: 1,
        event,
        event_id: randomUUID(),
        anonymous_install_id: id,
        package: PACKAGE,
        version: VERSION,
        timestamp: new Date().toISOString(),
        os: process.platform,
        node_major: Number(process.versions.node.split(".")[0]),
        ci: false,
      }),
      signal: AbortSignal.timeout(500),
    });
  } catch { /* at-most-once telemetry: no retries or offline spool */ }
}
async function record(success: boolean): Promise<void> {
  const configured = config();
  if (!configured) return;
  const file = statePath();
  const lock = `${file}.lock`;
  let locked = false;
  let temporary: string | undefined;
  let state: FunnelState | undefined;
  const events: FunnelEvent[] = [];
  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    await mkdir(lock, { mode: 0o700 });
    locked = true;
    try {
      state = JSON.parse(await readFile(file, "utf8")) as FunnelState;
      if (!state || state.schema !== 1 || typeof state.id !== "string" || typeof state.lastDay !== "string" || typeof state.firstSuccess !== "boolean" || typeof state.returned !== "boolean") return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return;
    }
    const now = Date.now();
    const day = utcDay(now);
    const week = utcWeek(now);
    if (!state) {
      state = { schema: 1, id: randomUUID(), lastDay: day, firstSuccess: false, returned: false, week: null };
      events.push("first_install", "first_launch");
    } else if (!state.returned && state.lastDay < day) {
      state.returned = true;
      events.push("returning_user");
    }
    state.lastDay = day;
    if (state.week !== week) { state.week = week; events.push("weekly_active"); }
    if (success && !state.firstSuccess) { state.firstSuccess = true; events.push("first_success"); }
    temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: "wx" });
    await rename(temporary, file);
    temporary = undefined;
  } catch { return; }
  finally {
    if (temporary) await rm(temporary, { force: true }).catch(() => undefined);
    if (locked) await rm(lock, { recursive: true, force: true }).catch(() => undefined);
  }
  if (state) await Promise.all(events.map((event) => send(configured.endpoint, event, state.id)));
}

export default function usageInstrumentedDebugMode(pi: ExtensionAPI): void {
  let queue = Promise.resolve();
  const enqueue = (success: boolean) => {
    queue = queue.then(() => record(success)).catch(() => undefined);
    return queue;
  };
  pi.on("session_start", () => { void enqueue(false); });

  const instrumented = new Proxy(pi, {
    get(target, property, receiver) {
      if (property !== "registerTool") return Reflect.get(target, property, receiver);
      return (tool: any) => {
        if (tool?.name !== "debug_reproduction" || typeof tool.execute !== "function") return target.registerTool(tool);
        const execute = tool.execute.bind(tool);
        return target.registerTool({
          ...tool,
          async execute(...args: any[]) {
            const result = await execute(...args);
            if (result?.details?.outcome?.kind === "fixed") void enqueue(true);
            return result;
          },
        });
      };
    },
  }) as ExtensionAPI;

  debugMode(instrumented);
}
