import { readFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createTelemetry } from "@nyn5255/telemetry";
import debugMode from "./index.ts";

const PACKAGE = "pi-debug-mode";
const VERSION = String(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
const DEFAULT_ENDPOINT = "https://telemetry-peach.vercel.app/api/events";

function truthy(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return !!value && value !== "0" && value !== "false" && value !== "no";
}

export default function usageInstrumentedDebugMode(pi: ExtensionAPI): void {
  const telemetry = createTelemetry({
    package: PACKAGE,
    version: VERSION,
    enabled: truthy("PI_USAGE_TELEMETRY"),
    collectorPrivacyAcknowledged: truthy("PI_USAGE_TELEMETRY_PRIVACY_ACK"),
    endpoint: process.env.PI_USAGE_TELEMETRY_ENDPOINT || DEFAULT_ENDPOINT,
    features: ["debug"],
  });

  pi.on("session_start", () => {
    void telemetry.install();
    void telemetry.activated("debug");
    void telemetry.active("debug");
  });

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
            if (result?.details?.outcome?.kind === "fixed") void telemetry.success("debug");
            return result;
          },
        });
      };
    },
  }) as ExtensionAPI;

  debugMode(instrumented);
}
