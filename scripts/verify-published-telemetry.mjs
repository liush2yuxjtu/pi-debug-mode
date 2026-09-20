import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const version = "0.1.11";
const tmp = await mkdtemp(join(tmpdir(), "pi-debug-published-"));
await writeFile(join(tmp, "package.json"), JSON.stringify({name:"published-consumer",private:true,type:"module"}, null, 2));
const installArgs = ["install","--ignore-scripts","--no-audit","--no-fund",`pi-debug-mode@${version}`];
const install = process.platform === "win32"
  ? spawnSync("cmd.exe", ["/d","/s","/c", "npm", ...installArgs], {cwd: tmp, stdio:"inherit", env:process.env})
  : spawnSync("npm", installArgs, {cwd: tmp, stdio:"inherit", env:process.env});
assert.equal(install.status, 0, `npm install failed: ${install.error?.message || install.signal || install.status}`);

const packagePath = join(tmp, "node_modules", "pi-debug-mode", "package.json");
const pkg = JSON.parse(await readFile(packagePath, "utf8"));
assert.equal(pkg.version, version);
assert.equal(pkg.dependencies?.["@nyn5255/telemetry"], "^0.1.3");

for (const file of ["src/telemetry.ts","src/usage-entry.ts","src/TELEMETRY.md"]) {
  await readFile(join(tmp, "node_modules", "pi-debug-mode", file), "utf8");
}
const publishedTelemetrySource = await readFile(join(tmp, "node_modules", "pi-debug-mode", "src", "telemetry.ts"), "utf8");
await writeFile(join(tmp, "published-telemetry.ts"), publishedTelemetrySource);

const probePath = join(tmp, "probe.mjs");
await writeFile(probePath, `
import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PACKAGE, FEATURE, COLLECTOR_ENDPOINT, RETENTION_DAYS, SENT_FIELDS,
  resolveConsent, createFunnel, firstRunNotice
} from "./published-telemetry.ts";

const stateDirectory = await mkdtemp(join(tmpdir(), "pi-debug-wire-"));
const prefs = join(stateDirectory, "prefs.json");
const consent = await resolveConsent(process.env, prefs);
assert.equal(consent, "granted");
assert.equal(PACKAGE, "pi-debug-mode");
assert.equal(FEATURE, "debug");
assert.equal(COLLECTOR_ENDPOINT, "https://telemetry-peach.vercel.app/api/events");
assert.equal(RETENTION_DAYS, 180);
const notice = firstRunNotice().join("\\n");
assert.match(notice, /ON by default/);
assert.match(notice, /180 days/);
assert.match(notice, /debug-telemetry off/);

const client = createFunnel(consent, {version: "0.1.11", stateDirectory, env: process.env});
await client.install();
await client.activated("debug");
await client.success("debug");
await client.flush();

const files = await readdir(stateDirectory);
assert.equal(files.filter(name => name.endsWith(".json")).length, 0, "debug mode consumed telemetry state");
console.log(JSON.stringify({notice_ok:true, sent_fields:SENT_FIELDS.length, state_json_files:0}));
`);

const env = {...process.env,
  PI_TELEMETRY_DEBUG:"1",
  PI_DEBUG_MODE_TELEMETRY:"1",
  CI:"0", GITHUB_ACTIONS:"0", GITLAB_CI:"0", TF_BUILD:"0", JENKINS_URL:"0", BUILD_ID:"0"
};
const probe = spawnSync(process.execPath, ["--experimental-strip-types", probePath], {
  cwd: tmp, env, encoding:"utf8"
});
if (probe.stdout) process.stdout.write(probe.stdout);
if (probe.stderr) process.stderr.write(probe.stderr);
assert.equal(probe.status, 0, `wire probe failed: ${probe.status}`);

const payloads = probe.stderr.split(/\r?\n/)
  .filter(line => line.startsWith("[telemetry:debug] "))
  .map(line => JSON.parse(line.slice("[telemetry:debug] ".length)));
assert.deepEqual(payloads.map(p => p.event), ["install","activated","first_success","weekly_active"]);
for (const p of payloads) {
  assert.equal(p.package, "pi-debug-mode");
  assert.equal(p.version, version);
  if (p.event === "install") assert.equal(p.feature, undefined);
  else assert.equal(p.feature, "debug");
  assert.equal(p.ci, false);
  assert.ok(p.event_id);
  assert.ok(p.anonymous_install_id);
}
const funnelRes = await fetch("https://telemetry-peach.vercel.app/api/funnel", {headers:{accept:"application/json"}, cache:"no-store"});
assert.equal(funnelRes.status, 200);
const funnel = await funnelRes.json();
const organic = Array.isArray(funnel.packages)
  ? funnel.packages.filter(row => row.package === "pi-debug-mode")
  : [];
console.log(JSON.stringify({
  verified_package:`pi-debug-mode@${version}`,
  platform:process.platform,
  node:process.versions.node,
  dependency:pkg.dependencies["@nyn5255/telemetry"],
  wire_events:payloads.map(p=>p.event),
  wire_ci_values:[...new Set(payloads.map(p=>p.ci))],
  funnel_status:funnelRes.status,
  funnel_privacy:funnel.privacy,
  current_pi_debug_rows:organic
}, null, 2));
