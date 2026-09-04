import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
const out = path.join(root, "artifacts/demo");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: out, size: { width: 1280, height: 720 } },
  colorScheme: "light",
});
const page = await context.newPage();
const started = Date.now();
const markers = [];
async function mark(label) {
  const state = await page.evaluate(({ label, elapsedMs }) => ({
    label, elapsedMs, scrollY: scrollY,
    viewport: { width: innerWidth, height: innerHeight },
  }), { label, elapsedMs: Date.now() - started });
  markers.push(state);
}
async function moveAndClick(selector, label) {
  const el = page.locator(selector);
  await el.waitFor({ state: "visible" });
  const box = await el.boundingBox();
  if (!box) throw new Error(`CLICK FAIL: ${label}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await page.waitForTimeout(400);
  await el.click();
  await mark(label);
}
await page.goto("http://127.0.0.1:41731/docs/demo.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
await mark("orient");
await moveAndClick("#start", "start-debug");
await page.waitForTimeout(2500);
await moveAndClick("#reproduced", "issue-reproduced");
await page.waitForTimeout(2300);
await moveAndClick("#fixed", "fixed");
await page.waitForTimeout(3400);
await page.screenshot({ path: path.join(out, "pi-debug-mode-poster.png") });
const video = page.video();
await context.close();
await video.saveAs(path.join(out, "pi-debug-mode-demo.webm"));
await browser.close();
await fs.writeFile(path.join(out, "markers.json"), JSON.stringify(markers, null, 2));
console.log(JSON.stringify({ ok: true, markers }));
