// 通用页面渲染器：把任何按时间 seek 的页面（HTML/SVG/Canvas/WebGL/Three.js）逐帧渲染成 MP4，并逐帧做版式审查。
// 用法：node scripts/render_page.mjs <页面目录> [--aspect 16:9|9:16|1:1] [--fps 30] [--samples N] [--out 输出目录] [--lib 音效库路径] [--chrome 浏览器路径]
// 页面约定：目录里有 index.html；页面定义 window.__scene = { duration, cues, settle, music } 与 window.__seek(t)；
// 有图片、字体等素材要加载时，定义 window.__ready（Promise）。画幅也可以写在目录里的 aspect.txt。
// 页面可选：__scene.motion_blur = { samples, shutter } 子帧运动模糊；__scene.finish = { grain, vignette, bloom, bloom_threshold, bloom_radius, chroma } 成片质感。
// __seek(t, base)：t 为子帧时刻，base 为整帧时刻；数字、文字内容按 base 更新。
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DEMO = path.resolve(process.argv[2]);
const args = Object.fromEntries(process.argv.slice(3).reduce((a, x, i, all) =>
  x.startsWith("--") ? [...a, [x.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]] : a, []));
const ASPECTS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] };
const aspect = args.aspect || (fs.existsSync(path.join(DEMO, "aspect.txt")) ? fs.readFileSync(path.join(DEMO, "aspect.txt"), "utf8").trim() : "16:9");
const [W, H] = ASPECTS[aspect] || (() => { throw new Error(`不支持的画幅 ${aspect}`); })();
const FPS = Number(args.fps || 30);
const OUT = path.resolve(args.out || path.join(DEMO, "build"));
const NAME = path.basename(DEMO);
const LIB = path.resolve((args.lib || process.env.CTV_SOUND_LIB || path.join(os.homedir(), "Documents/Codex/素材库/code-to-video-sounds")).replace(/^~/, os.homedir()));
const tag = aspect.replace(":", "x");

let pw;
try { pw = require("playwright"); } catch { pw = require(process.env.PLAYWRIGHT_MODULE || "playwright"); }

// ---------- 版式审查（在页面里执行，规则同质量底线） ----------
function auditInPage(settled) {
  const S = Math.min(innerWidth, innerHeight);
  const errs = [];
  const visible = (el) => { const cs = getComputedStyle(el); let e = el;
    while (e) { const s = getComputedStyle(e); if (s.visibility === "hidden" || Number(s.opacity) < 0.05 || s.display === "none") return false; e = e.parentElement; }
    return cs; };
  // 文字边界：行内框再按字体度量收到字形墨迹（canvas measureText 的实际上下伸）；竖排时只用行内框
  const ctx2d = (window.__ink ||= document.createElement("canvas").getContext("2d"));
  const inkBox = (el) => {
    const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.writingMode.startsWith("vertical") || !el.textContent.trim()) return b;
    ctx2d.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx2d.measureText(el.textContent.trim());
    const top = b.top + Math.max(0, m.fontBoundingBoxAscent - m.actualBoundingBoxAscent);
    const bottom = b.bottom - Math.max(0, m.fontBoundingBoxDescent - m.actualBoundingBoxDescent);
    return { left: b.left, right: b.right, top, bottom: Math.max(top, bottom), width: b.width, height: Math.max(0, bottom - top) };
  };
  // 内边距在落位帧检查：缩放、飞入过程中盒子与字号的比例会暂时变化
  for (const box of settled ? document.querySelectorAll("[data-box]") : []) {
    if (!visible(box)) continue;
    const b = box.getBoundingClientRect();
    for (const t of box.querySelectorAll("[data-text]")) {
      if (!visible(t)) continue;        // 还没出现的文字不参与本帧检查
      const g = inkBox(t); const h = parseFloat(getComputedStyle(t).fontSize);
      const display = h >= 0.06 * S;   // 展示级大字：按字号比例放宽，避免卡片被撑得过大
      let px = Math.max((display ? 0.5 : 0.8) * h, 0.012 * S), py = Math.max((display ? 0.35 : 0.5) * h, 0.012 * S);
      if (getComputedStyle(t).writingMode.startsWith("vertical")) [px, py] = [py, px];   // 竖排：行方向变为纵向
      const gaps = [g.left - b.left, g.top - b.top, b.right - g.right, b.bottom - g.bottom];
      const need = [px, py, px, py];
      "左上右下".split("").forEach((side, i) => { if (gaps[i] < need[i] - 0.5)
        errs.push(`“${t.textContent.trim()}”容器内${side}侧内边距 ${gaps[i].toFixed(0)}px，至少 ${need[i].toFixed(0)}px`); });
    }
  }
  if (settled) {
    const side = 0.06 * S, bottom = innerHeight > innerWidth ? 0.12 * S : side;
    for (const el of document.querySelectorAll("[data-read], [data-box]")) {
      if (!visible(el)) continue;
      // 有文字的元素按字形墨迹测量；没有文字的图形（圆点、图标）按元素边界测量
      const r = el.hasAttribute("data-box") || !el.textContent.trim() ? el.getBoundingClientRect() : inkBox(el);
      if (r.width === 0 && r.height === 0) continue;
      const gaps = [r.left, r.top, innerWidth - r.right, innerHeight - r.bottom];
      const need = [side, side, side, bottom];
      "左上右下".split("").forEach((s, i) => { if (gaps[i] < need[i] - 0.5)
        errs.push(`“${el.textContent.trim().slice(0, 12)}”距画面${s}边 ${gaps[i].toFixed(0)}px，至少 ${need[i].toFixed(0)}px`); });
    }
  }
  // 质量底线：对比度（落位帧检查；按最近的实底背景色计算，背景是图片或渐变时需人工复核）
  if (settled) {
    const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor);
      if (c.length === 4 ? c[3] > 0.5 : c.length === 3) return c.slice(0, 3); } return rgb(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
    for (const el of document.querySelectorAll("[data-read], [data-text]")) {
      if (!visible(el) || !el.textContent.trim()) continue;
      const nodes = [el, ...el.querySelectorAll("*")].filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
      for (const n of nodes) {
        const cs = getComputedStyle(n), fg = rgb(cs.color).slice(0, 3), bg = bgOf(n);
        const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const large = parseFloat(cs.fontSize) >= 0.06 * S;
        if (ratio < (large ? 3 : 4.5)) errs.push(`“${n.textContent.trim().slice(0, 12)}”对比度 ${ratio.toFixed(2)}:1，至少 ${large ? 3 : 4.5}:1`);
      }
    }
  }
  // 质量底线：文字不加投影。用户点名的风格本身就靠投影或发光时（例如拟物卡片、CRT 荧光字），页面设 __scene.allow_shadow = true 跳过这一项
  for (const el of (window.__scene && window.__scene.allow_shadow) ? [] : document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.textShadow !== "none" || cs.boxShadow !== "none") errs.push(`${el.tagName.toLowerCase()} 带有投影`);
  }
  return errs;
}

// ---------- 音效库 ----------
function loadCatalog() {
  const f = path.join(LIB, "catalog.json");
  if (!fs.existsSync(f)) throw new Error(`找不到音效库 ${f}。用 --lib 指定，或运行 scripts/sound_library.py fetch 下载。`);
  return new Map(JSON.parse(fs.readFileSync(f, "utf8")).sounds.map((s) => [s.id, s]));
}

function buildAudio(scene, catalog, wavPath, stemPath) {
  const parts = [];
  const resolved = scene.cues.map((c) => {
    const s = catalog.get(c.sound);
    if (!s) throw new Error(`音效库里没有 ${c.sound}`);
    const start = Math.max(0, c.t - (s.sync_at || 0));   // 让声音的同步点落在画面事件上
    return { ...c, start: Number(start.toFixed(4)), file: path.join(LIB, s.path) };
  });
  const mix = (inputs, outFile, withMusic) => {
    const a = ["-v", "error", "-y"];
    const f = [];
    inputs.forEach((c, i) => {
      a.push("-i", c.file);
      f.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${c.gain_db || 0}dB,adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`);
    });
    let n = inputs.length;
    if (withMusic && scene.music && scene.music.sound) {
      const m = catalog.get(scene.music.sound);
      a.push("-i", path.join(LIB, m.path));
      const fo = scene.music.fade_out || 1;
      const ms = scene.music.start || 0, fi = scene.music.fade_in ?? 0.5;   // start：从曲子的第几秒开始用
      f.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=${ms}:${ms + scene.duration},asetpts=PTS-STARTPTS,volume=${scene.music.gain_db}dB,` +
        (fi > 0 ? `afade=t=in:d=${fi},` : "") + `afade=t=out:st=${scene.duration - fo}:d=${fo}[a${n}]`);
      n += 1;
    }
    f.push(`${Array.from({ length: n }, (_, i) => `[a${i}]`).join("")}amix=inputs=${n}:normalize=0:dropout_transition=0,apad,atrim=0:${scene.duration}[out]`);
    a.push("-filter_complex", f.join(";"), "-map", "[out]", "-ar", "48000", outFile);
    execFileSync("ffmpeg", a);
  };
  const forMix = resolved.length ? resolved : [{ t: 0, start: 0, gain_db: -90, file: path.join(LIB, catalog.get("wz-click-hover-soft").path) }];
  mix(forMix, stemPath, false);      // 只含音效的分轨，用于音画同步检查
  mix(forMix, wavPath, true);        // 成片混音：音效 + 背景音乐
  return resolved;
}

// ---------- 主流程 ----------
const catalog = loadCatalog();
fs.mkdirSync(path.join(OUT, "output"), { recursive: true });
const frames = path.join(OUT, `frames-${NAME}`);
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

// 允许本地页面读取同目录图片像素（canvas 读像素需要），只用于渲染本机工程文件
const launch = { args: ["--allow-file-access-from-files"], ...(args.chrome ? { executablePath: args.chrome } : {}) };
const browser = await pw.chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.error("页面错误：", e.message); process.exit(1); });
await page.goto(pathToFileURL(path.join(DEMO, "index.html")).href);
await page.evaluate(() => document.fonts.ready);
await Promise.race([page.evaluate(() => window.__ready || null),
  new Promise((_, rej) => setTimeout(() => rej(new Error("页面素材 20 秒内没有加载完成（window.__ready）")), 20000))]);
const scene = await page.evaluate(() => window.__scene);
// 先核对声音编号，免得出完帧才报错
{ const miss = [...scene.cues.map((c) => c.sound), scene.music && scene.music.sound].filter((x) => x && !catalog.has(x));
  if (miss.length) { await browser.close(); throw new Error(`音效库里没有：${[...new Set(miss)].join("、")}`); } }
// 字体预热：网页字体按字符分片懒加载，先把全片过一遍，等每个时刻用到的字形都到位再正式出帧
for (let i = 0; i <= 16; i++) {
  await page.evaluate(async (tt) => { window.__seek(tt); await document.fonts.ready; }, (scene.duration * i) / 16);
}
await page.waitForTimeout(300);
await page.evaluate(() => document.fonts.ready);
const fontInfo = await page.evaluate(() => ["Noto Sans CJK SC", "Noto Serif CJK SC"].filter((f) => document.fonts.check(`16px "${f}"`, "中文")));
// 只改了声音时：不重渲画面，复用已有成片的视频流，重新混音后封装
if ("audio-only" in args) {
  await browser.close();
  const mp4 = path.join(OUT, "output", `${NAME}.mp4`), tmp = mp4.replace(/\.mp4$/, ".video.mp4");
  if (!fs.existsSync(mp4)) throw new Error(`没有可复用的成片：${mp4}`);
  const wav = path.join(OUT, `mix-${NAME}.wav`), stem = path.join(OUT, `sfx-stem-${NAME}.wav`);
  const cues = buildAudio(scene, catalog, wav, stem);
  fs.renameSync(mp4, tmp);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4]);
  fs.rmSync(tmp);
  const rep = path.join(OUT, `report-${NAME}.json`), old = fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, "utf8")) : {};
  fs.writeFileSync(rep, JSON.stringify({ ...old, cues: cues.map(({ t, start, sound }) => ({ t, start, sound })), music: scene.music, audio_stem: stem, output: mp4 }, null, 2));
  console.log(`已重新混音：${mp4}`); process.exit(0);
}
const total = Math.round(scene.duration * FPS);
const settleFrames = new Set(scene.settle.map((t) => Math.round(t * FPS)));
// 运动模糊：每帧在快门时间内取若干子帧再平均。快门从帧时刻向后开，硬切点落在帧边界上不会糊进两镜头。
const MB = scene.motion_blur || {};
const SUB = Math.max(1, Number(args.samples || MB.samples || 1));
const SHUTTER = Math.min(1, MB.shutter ?? 0.5);
let checks = 0;
for (let n = 0; n < total; n++) {
  for (let k = 0; k < SUB; k++) {
    const t = Math.min(scene.duration, (n + (SUB > 1 ? (k / SUB) * SHUTTER : 0)) / FPS);
    await page.evaluate(([tt, base]) => window.__seek(tt, base), [t, n / FPS]);
    if (k === 0) {
      const errs = await page.evaluate(auditInPage, settleFrames.has(n));
      checks++;
      if (errs.length) { await browser.close(); throw new Error(`版式审查未通过（第 ${n} 帧，${t.toFixed(2)} 秒）：\n  ${errs.join("\n  ")}`); }
    }
    await page.screenshot({ path: path.join(frames, `${String(n * SUB + k).padStart(7, "0")}.png`) });
  }
  if (n % 30 === 0) process.stdout.write(`\r帧 ${n}/${total}`);
}
await browser.close();

const wav = path.join(OUT, `mix-${NAME}.wav`), stem = path.join(OUT, `sfx-stem-${NAME}.wav`);
const cues = buildAudio(scene, catalog, wav, stem);
const mp4 = path.join(OUT, "output", `${NAME}.mp4`);
// 成片质感：泛光、色散、暗角、颗粒，都由 FFmpeg 确定性地完成（noise 用固定种子）
const F = scene.finish || {};
const chain = [];
if (SUB > 1) chain.push(`tmix=frames=${SUB}`, `select='eq(mod(n\\,${SUB})\\,${SUB - 1})'`, "setpts=N/" + FPS + "/TB");
chain.push("format=gbrp");
let vf = chain.join(",");
if (F.bloom) {   // 只让高光溢出：先压掉暗部再大半径模糊，滤色叠回
  const th = F.bloom_threshold ?? 0.72;
  vf += `,split[m][h];[h]curves=all='0/0 ${th}/0 1/1',gblur=sigma=${F.bloom_radius || 28}[hb];[m][hb]blend=all_mode=screen:all_opacity=${F.bloom}`;
}
if (F.chroma) vf += `,rgbashift=rh=${-Math.round(F.chroma)}:bh=${Math.round(F.chroma)}`;
if (F.vignette) vf += `,vignette=angle=${(F.vignette * Math.PI / 2).toFixed(3)}`;
vf += ",scale=out_color_matrix=bt709:out_range=tv,format=yuv420p";
if (F.grain) vf += `,noise=c0s=${Math.round(F.grain * 100)}:c0f=t:all_seed=7`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS * SUB), "-i", path.join(frames, "%07d.png"), "-i", wav,
  "-filter_complex", `[0:v]${vf}[v]`, "-map", "[v]", "-map", "1:a", "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "17",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4]);
const report = { aspect, motion_blur_samples: SUB, finish: F, size: [W, H], fps: FPS, duration: scene.duration, fonts_available: fontInfo,
  layout_audited_frames: checks, cues: cues.map(({ t, start, sound }) => ({ t, start, sound })),
  music: scene.music, audio_stem: stem, output: mp4 };
const rep = path.join(OUT, `report-${NAME}.json`);
fs.rmSync(frames, { recursive: true, force: true });
fs.writeFileSync(rep, JSON.stringify(report, null, 2));
console.log(`完成：${mp4}\n报告：${rep}`);
