import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import debugMode from "./index.ts";

const PACKAGE = "pi-debug-mode";
const VERSION = "0.1.8";
const DAY = 86_400_000;

type FunnelState = {
  schema: 1;
  id: string;
  firstDay: string;
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

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

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
  if (truthy("PI_TELEMETRY_DISABLED") || truthy("DO_NOT_TRACK")) return;
  try {
    const endpoint = new URL(process.env.PI_USAGE_TELEMETRY_ENDPOINT || "");
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return;
    return { endpoint };
  } catch {
    return;
  }
}

async function send(endpoint: URL, event: FunnelEvent, id: string): Promise<void> {
  try {
    const body = JSON.stringify({
      schema_version: 1,
      event,
      event_id: randomUUID(),
      anonymous_install_id: id,
      package: PACKAGE,
      version: VERSION,
      timestamp: new Date().toISOString(),
      os: process.platform,
      node_major: Number(process.versions.node.split(".")[0]),
      ci: truthy("CI") || truthy("GITHUB_ACTIONS"),
    });
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(500),
    });
  } catch {
    // Usage measurement must never affect the host extension.
  }
}

async function record(success: boolean): Promise<void> {
  const configured = config();
  if (!configured) return;
  const file = statePath();
  const directory = join(file, "..");
  const now = Date.now();
  const day = utcDay(now);
  const week = utcWeek(now);
  let state: FunnelState | undefined;
  try {
    state = JSON.parse(await readFile(file, "utf8")) as FunnelState;
  } catch {
    state = undefined;
  }
  const events: FunnelEvent[] = [];
  if (!state || state.schema !== 1 || typeof state.id !== "string") {
    state = { schema: 1, id: randomUUID(), firstDay: day, lastDay: day, firstSuccess: false, returned: false, week: null };
    events.push("first_install", "first_launch");
  } else if (!state.returned && state.lastDay < day) {
    state.returned = true;
    events.push("returning_user");
  }
  state.lastDay = day;
  if (state.week !== week) {
    state.week = week;
    events.push("weekly_active");
  }
  if (success && !state.firstSuccess) {
    state.firstSuccess = true;
    events.push("first_success");
  }
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, file);
    await Promise.all(events.map((event) => send(configured.endpoint, event, state!.id)));
  } catch {
    await rm(`${file}.tmp`, { force: true }).catch(() => undefined);
  }
}

export default function usageInstrumentedDebugMode(pi: ExtensionAPI): void {
  pi.on("session_start", () => { void record(false); });

  const instrumented = new Proxy(pi, {
    get(target, property, receiver) {
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
            if (result?.details?.outcome?.kind === "fixed") void record(true);
            return result;
          },
        });
      };
    },
  }) as ExtensionAPI;

  debugMode(instrumented);
}
