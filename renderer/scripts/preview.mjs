// 快速预览：只截若干时刻，拼成一张图，便于迭代。node scripts/preview.mjs <页面目录> [时刻数=8] [指定时刻,逗号分隔]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(process.env.PLAYWRIGHT_MODULE || "playwright"); }
const DEMO = path.resolve(process.argv[2]);
const N = Number(process.argv[3] || 8);
const aspect = fs.existsSync(path.join(DEMO, "aspect.txt")) ? fs.readFileSync(path.join(DEMO, "aspect.txt"), "utf8").trim() : "16:9";
const [W, H] = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] }[aspect];
const b = await pw.chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on("pageerror", (e) => { console.error("页面错误", e.message); process.exit(1); });
p.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await p.goto(pathToFileURL(path.join(DEMO, "index.html")).href);
await p.evaluate(() => window.__ready || null);
const sc = await p.evaluate(() => window.__scene);
const times = process.argv[4] ? process.argv[4].split(",").map(Number) : Array.from({ length: N }, (_, i) => (sc.duration * (i + 0.5)) / N);
for (const t of times) { await p.evaluate(async (tt) => { window.__seek(tt); await document.fonts.ready; }, t); }
await p.waitForTimeout(400);
const dir = path.join(DEMO, "build", "preview-frames"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
for (const [i, t] of times.entries()) {
  await p.evaluate(async (tt) => { window.__seek(tt); await document.fonts.ready; }, t);
  await p.screenshot({ path: `${dir}/${String(i).padStart(2, "0")}.png` });
}
await b.close();
const cols = aspect === "9:16" ? Math.min(times.length, 6) : 4;
const out = path.join(DEMO, "build", "preview.jpg"); fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${dir}/%02d.png`, "-vf", `scale=${aspect === "9:16" ? 300 : 640}:-2,tile=${cols}x${Math.ceil(times.length / cols)}:padding=6:color=gray`, "-frames:v", "1", "-q:v", "3", out]);
console.log(out, times.map((t) => t.toFixed(2)).join(" "));
