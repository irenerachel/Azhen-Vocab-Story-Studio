// 从动画页面读出配音起点、字幕时间和片长，写到 项目/build/voice-timeline.json（混音与 SRT 用同一份时间）
// 用法：PLAYWRIGHT_MODULE=项目/node_modules/playwright node export_timeline.mjs 项目目录
import { createRequire } from "node:module"; import fs from "node:fs"; import path from "node:path";
const require = createRequire(import.meta.url); const pw = require(process.env.PLAYWRIGHT_MODULE);
const root = path.resolve(process.argv[2] || ".");
const b = await pw.chromium.launch({ args: ["--allow-file-access-from-files"] }); const p = await b.newPage();
await p.goto("file://" + path.join(root, "page/index.html")); await p.evaluate(() => window.__ready);
p.on("pageerror", (e) => { console.error("页面错误：", e.message); process.exit(1); });
const data = await p.evaluate(() => ({ duration: window.__scene.duration, voice: window.__voice, subs: window.__subs }));
const over = await p.evaluate(() => window.__overlaps || []);
over.forEach((o, i) => { if (o > 0.05) console.error(`⚠ 第 ${i + 1} 句旁白还没念完，下一句就开始了（重叠 ${o} 秒）：给这一场加 holds`); });
fs.mkdirSync(path.join(root, "build"), { recursive: true }); fs.writeFileSync(path.join(root, "build/voice-timeline.json"), JSON.stringify(data, null, 2)); await b.close(); console.log(data.duration, data.voice.map((v) => v.start.toFixed(2)).join(" "));
