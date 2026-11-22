// 生词故事动画引擎：所有故事通用，不要在这里写任何故事专属的内容。
// 负责：画布与样式、场地图层、精灵摆放与前后排序、身高表与地面透视、烟团/星光/速度线、镜头、
//       “等旁白”时间重映射、双语字幕与生词卡、换场地的扫屏转场、片尾光圈、声音提示、渲染器约定。
// 用法（story.js）：
//   VocabStory.init({ ...配置 });     // 之后 put / puff / camera / C / gAt 等都是全局函数
//   function drawKitchen(t) { ... }   // 每个场地一个绘制函数，t 是故事时间
//   VocabStory.start({ kitchen: drawKitchen, ... });
// 依赖：gsap、demo.js、fx.js（先于本文件加载）；narration.js 提供 window.NARRATION。
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const SIZES = { "16:9": [1920, 1080], "9:16": [1080, 1920] };
  const VS = (window.VocabStory = {});

  VS.init = (cfg) => {
    const [W, H] = SIZES[cfg.aspect || "16:9"] || (() => { throw new Error(`不支持的画幅 ${cfg.aspect}`); })();
    const tall = H > W;
    const INK = "#2B2320", CREAM = "#F3EAD6", GOLD = "#F4D58D", DUST = "#D9CDB8";
    const { E, lerp, spring, clamp } = FX;
    const P = (t, a, b) => clamp((t - a) / (b - a));
    const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    const DUR = cfg.duration;

    // ---------- 样式与固定图层 ----------
    const sub = tall ? { bottom: 210, max: W - 140 } : { bottom: 66, max: W - 240 };
    const vc = tall ? { right: 70, top: 200 } : { right: 116, top: 96 };
    const css = document.createElement("style");
    css.textContent = `
@font-face{font-family:"ChillRound";src:url("../assets/fonts/ChillRoundGothic/ChillRoundGothic_Medium.ttf") format("truetype");font-weight:400 500;font-display:block}
@font-face{font-family:"ChillRound";src:url("../assets/fonts/ChillRoundGothic/ChillRoundGothic_Bold.ttf") format("truetype");font-weight:600 900;font-display:block}
:root{--ink:${INK};--cream:${CREAM};--gold:${GOLD}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${INK}}
body{font-family:"ChillRound",sans-serif;font-weight:500;color:var(--ink)}
.loc{position:absolute;inset:0;overflow:hidden;display:none}
.cam{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
.cam>img.bg{position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover}
.spr{position:absolute;left:0;top:0;display:none}
svg.fx{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible;z-index:5000}
#title{position:absolute;background:var(--cream);border:5px solid var(--ink);
  border-radius:46px 24px 52px 20px;padding:34px 70px 40px;transform-origin:50% 50%}
#title .t1{font-weight:700;font-size:168px;line-height:1.2;letter-spacing:0.06em}
#title .t2{font-size:50px;line-height:1.4;margin-top:6px}
#sub{position:absolute;left:50%;bottom:${sub.bottom}px;transform:translateX(-50%);background:var(--cream);border:4px solid var(--ink);
  border-radius:22px 14px 26px 12px;padding:22px 44px 24px;width:max-content;max-width:${sub.max}px;text-align:center;opacity:0}
#sub .en{font-family:"Fraunces",serif;font-weight:600;font-size:38px;line-height:1.36;text-wrap:balance;color:var(--ink)}
#sub .zh{font-size:32px;line-height:1.45;color:#4A3C34;margin-top:6px;text-wrap:balance}
#sub .v{color:#A63E14;text-decoration:underline wavy #D9893F;text-decoration-thickness:3px;text-underline-offset:8px}
#vcard{position:absolute;right:${vc.right}px;top:${vc.top}px;background:var(--cream);border:4px solid var(--ink);border-radius:26px 16px 30px 14px;
  padding:24px 54px 26px;opacity:0;transform-origin:85% 0%;min-width:330px}
#vcard .tag{font-size:26px;line-height:1.4;color:#4A3C34}
#vcard .word{font-family:"Fraunces",serif;font-weight:600;font-size:60px;line-height:1.25;color:#A63E14;margin-top:4px}
#vcard .pos{font-family:"Fraunces",serif;font-style:italic;font-weight:600;font-size:30px;line-height:1.4;color:#4A3C34}
#vcard .mean{font-size:38px;line-height:1.4;color:var(--ink)}
#over{position:absolute;inset:0;width:${W}px;height:${H}px;pointer-events:none}
#over{z-index:100}#end{z-index:110}#sub{z-index:120}#vcard{z-index:120}
.inset{position:absolute;border-radius:50%;overflow:hidden;border:6px solid var(--ink);background:#E9D9BC;display:none;z-index:50}
.inset img{position:absolute}
#end{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:var(--ink)}
#end span{font-weight:700;font-size:220px;color:var(--cream);line-height:1.2;display:inline-block}`;
    document.head.append(css);
    document.body.insertAdjacentHTML("afterbegin", `<div id="locs"></div>
<div id="sub" data-box><div class="en" data-text id="subEn"></div><div class="zh" data-text id="subZh"></div></div>
<div id="vcard" data-box><div class="tag" data-text>生词 New word</div><div class="word" data-text id="vw"></div><div class="pos" data-text id="vp"></div><div class="mean" data-text id="vm"></div></div>
<svg id="over" viewBox="0 0 ${W} ${H}"></svg>
<div id="end"><span data-read id="endt"></span></div>`);
    const over = document.getElementById("over");

    // ---------- 时间重映射：在动作已落定的地方放慢“等旁白”，配音不变速 ----------
    // holds: [故事时刻, 增加的视频秒数, 停顿内故事走速]
    const HOLDS = (cfg.holds || []).map(([s0, e, r]) => ({ s0, L: e / (1 - r), r }));
    const storyOf = (T) => { let off = 0; for (const h of HOLDS) { const Ts = h.s0 + off; if (T < Ts) return T - off; if (T < Ts + h.L) return h.s0 + h.r * (T - Ts); off += h.L * (1 - h.r); } return T - off; };
    const videoOf = (t) => { let off = 0; for (const h of HOLDS) { if (t <= h.s0) return t + off; if (t < h.s0 + h.r * h.L) return h.s0 + off + (t - h.s0) / h.r; off += h.L * (1 - h.r); } return t + off; };
    const VDUR = Math.round(videoOf(DUR) * 30) / 30;
    const D = Demo({ duration: VDUR, label: cfg.label || "", music: cfg.music || null });
    let VB = 0;
    { const seek0 = window.__seek; window.__seek = (T, b = T) => { VB = b; seek0(storyOf(T), storyOf(b)); }; }
    window.__scene.motion_blur = cfg.motionBlur || { samples: 5, shutter: 0.5 };
    window.__scene.finish = cfg.finish || { grain: 0.035, vignette: 0.2 };
    const C = (t, s, g = 0) => D.cue(videoOf(t), s, g);   // 声音提示：写故事时间，自动换算成视频时间

    // ---------- 场地 ----------
    const LOCS = cfg.locs, WIPE = cfg.wipe ?? 0.7;
    const L = {}, AR = {}, loads = [];
    for (const loc of LOCS) {
      const box = document.createElement("div"); box.className = "loc"; box.id = "L_" + loc.id;
      const cam = document.createElement("div"); cam.className = "cam";
      const bg = document.createElement("img"); bg.className = "bg"; bg.src = `../assets/bg/${loc.bg}.jpg`; cam.append(bg); loads.push(bg.decode());
      const spr = {};
      for (const n of loc.sprites) {
        const im = document.createElement("img"); im.className = "spr"; im.src = `../assets/cut/${n}.png`; cam.append(im); spr[n] = im;
        loads.push(im.decode().then(() => { AR[n] = im.naturalWidth / im.naturalHeight; }));
      }
      const fx = document.createElementNS(NS, "svg"); fx.setAttribute("class", "fx"); fx.setAttribute("viewBox", `0 0 ${W} ${H}`); cam.append(fx);
      box.append(cam); document.getElementById("locs").append(box);
      L[loc.id] = { ...loc, el: box, cam, spr, fx };
    }
    // 标题牌：放在指定场地里，随场地一起被转场擦掉；故事里通过 TITLE 做动画
    let TITLE = null;
    if (cfg.title) {
      TITLE = document.createElement("div"); TITLE.id = "title";
      TITLE.style.left = (cfg.title.x ?? 150) + "px"; TITLE.style.top = (cfg.title.y ?? 120) + "px";
      const t1 = document.createElement("div"); t1.className = "t1"; t1.dataset.read = ""; t1.textContent = cfg.title.t1;
      const t2 = document.createElement("div"); t2.className = "t2"; t2.dataset.read = ""; t2.textContent = cfg.title.t2 || "";
      TITLE.append(t1, t2); L[cfg.title.loc].el.append(TITLE);
    }
    // 放大圆框：特写被字幕挡住或太小的细节。返回 div，里面的 img 由故事自己摆
    const makeInset = (loc, sprite, { left, top, size }) => {
      const d = document.createElement("div"); d.className = "inset";
      d.style.cssText += `left:${left}px;top:${top}px;width:${size}px;height:${size}px`;
      d.innerHTML = `<img src="../assets/cut/${sprite}.png">`; L[loc].el.append(d); return d;
    };
    window.__ready = Promise.all([document.fonts.ready, ...loads]);

    // ---------- 绘制工具 ----------
    // put：按脚底 (x,y) 摆一张精灵图，高度 h；脚的 y 越大越靠前（自动盖住后面的人）
    function put(loc, n, o) {
      const im = L[loc].spr[n]; const h = o.h, w = h * AR[n];
      const ox = o.ox ?? 0.5, oy = o.oy ?? 1;
      im.style.display = "block"; im.style.width = w + "px"; im.style.height = h + "px";
      im.style.opacity = o.op ?? 1; im.style.zIndex = String(Math.round(o.y + (o.z || 0)));
      im.style.transformOrigin = `${w * ox}px ${h * oy}px`;
      im.style.transform = `translate(${o.x - w * ox}px,${o.y - h * oy}px) rotate(${o.rot || 0}deg) skewX(${o.skew || 0}deg) scale(${(o.sx ?? 1) * (o.flip ? -1 : 1)},${o.sy ?? 1})`;
      return { w, h, left: o.x - w * ox, top: o.y - h * oy };
    }
    // 身高表：每张图的高度 = 该深度下“主角站立身高 g” × 系数（用 contact_sheet.py 的刻度图量出来）
    const FACT = cfg.fact || {};
    const SZ = (n, g) => { if (!(n in FACT)) throw new Error(`身高表 fact 里没有 ${n}`); return g * FACT[n]; };
    // 地面透视：ground[场地] = [地平线 y, 参考身高, 参考脚位 y]；脚位越靠后（y 越小）人越小
    const GROUND = cfg.ground || {};
    const gAt = (loc, y) => { const [hz, g0, y0] = GROUND[loc]; return g0 * (y - hz) / (y0 - hz); };
    // 落位挤压：姿势切换或落地后，压扁再按弹簧回弹
    function squash(t, t0, amt = 0.16) {
      if (t < t0) return { sx: 1, sy: 1 };
      const v = spring(t - t0, 3.0, 0.42); const d = (1 - v) * amt;
      return { sx: 1 + d * 0.7, sy: 1 - d };
    }
    function el(svg, tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); return e; }
    // 手绘烟尘云：先画墨色外圈再盖浅色，得到连成一片的描边轮廓；每 0.1 秒换一次抖动（沸腾线）
    function puff(svg, t, t0, cx, cy, R, { dur = 0.9, seed = 1, fill = DUST, n = 8, drift = [0, 0] } = {}) {
      const k = (t - t0) / dur; if (k < 0 || k > 1) return;
      const g = E.outBack(clamp(k / 0.28), 1.6);
      const boil = Math.floor(t * 10);
      const blobs = [];
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2 + hash(seed + i) * 0.6;
        const center = i === n;
        const dist = center ? 0 : R * 0.52 * g;
        const shrink = clamp((k - 0.42 - (center ? 0.12 : hash(seed * 3 + i) * 0.18)) / 0.32);
        const r = R * (center ? 0.55 : 0.36 + hash(seed * 7 + i) * 0.16) * g * (1 - E.inCubic(shrink));
        if (r < 1) continue;
        const jx = (hash(boil * 13 + i + seed) - 0.5) * 5, jy = (hash(boil * 29 + i + seed) - 0.5) * 5;
        blobs.push([cx + Math.cos(a) * dist + jx + drift[0] * k, cy + Math.sin(a) * dist * 0.8 + jy + drift[1] * k, r]);
      }
      const sw = 4.5;
      for (const [x, y, r] of blobs) el(svg, "circle", { cx: x, cy: y, r: r + sw, fill: INK });
      for (const [x, y, r] of blobs) el(svg, "circle", { cx: x, cy: y, r, fill });
      for (const [x, y, r] of blobs.slice(0, 3)) if (r > 30)
        el(svg, "path", { d: `M${x - r * 0.4} ${y + r * 0.1} q${r * 0.3} ${-r * 0.35} ${r * 0.6} ${-r * 0.05}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" });
    }
    function star(svg, x, y, s, rot = 0, fill = GOLD) {
      if (s <= 0.5) return;
      const q = s * 0.26;
      el(svg, "path", { d: `M0 ${-s} L${q} ${-q} L${s} 0 L${q} ${q} L0 ${s} L${-q} ${q} L${-s} 0 L${-q} ${-q} Z`, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `translate(${x} ${y}) rotate(${rot})` });
    }
    // 一闪：0→1→0 的星光
    function twinkle(svg, t, t0, x, y, s, dur = 0.5) {
      const k = (t - t0) / dur; if (k < 0 || k > 1) return;
      star(svg, x, y, s * Math.sin(Math.PI * k), k * 90);
    }
    // 速度线：在物体身后画几条平行细线
    function speed(svg, t, x, y, ang, len, n, spread, seed = 1, w = 3) {
      const boil = Math.floor(t * 10);
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      for (let i = 0; i < n; i++) {
        const off = (i / (n - 1) - 0.5) * spread + (hash(boil + i * 7 + seed) - 0.5) * 18;
        const l = len * (0.55 + hash(seed + i * 3) * 0.45);
        const sx = x + nx * off + dx * hash(i + seed) * 30, sy = y + ny * off + dy * hash(i + seed) * 30;
        el(svg, "line", { x1: sx, y1: sy, x2: sx + dx * l, y2: sy + dy * l, stroke: INK, "stroke-width": w, "stroke-linecap": "round" });
      }
    }
    // 魔法轨迹：从 (ax,ay) 飞向 (bx,by) 的一串星
    function zap(svg, t, t0, ax, ay, bx, by, dur = 0.4) {
      const k = (t - t0) / dur; if (k < 0 || k > 1.25) return;
      for (let i = 0; i < 7; i++) {
        const u = clamp(k - i * 0.05); if (u <= 0) continue;
        const e = E.inOutCubic(u);
        const x = lerp(ax, bx, e), y = lerp(ay, by, e) - Math.sin(Math.PI * e) * 120;
        const fade = 1 - clamp((k - 1) / 0.25);
        star(svg, x, y, (16 - i * 1.8) * fade, t * 300 + i * 40);
      }
    }
    // 摄像机：z 缩放，围绕焦点 (fx,fy)，带轻微手持漂移，并限制不露出背景边缘
    function camera(loc, { z = 1, fx = W / 2, fy = H / 2, dx = 0, dy = 0, t = 0, drift = 3 } = {}) {
      let tx = W / 2 - fx * z + dx, ty = H / 2 - fy * z + dy;
      tx += (FX.fbm(t * 0.5, 1.3) - 0.5) * drift * 2;
      ty += (FX.fbm(4.1, t * 0.5) - 0.5) * drift * 2;
      tx = Math.min(0, Math.max(W - W * z, tx)); ty = Math.min(0, Math.max(H - H * z, ty));
      L[loc].cam.style.transform = `translate(${tx}px,${ty}px) scale(${z})`;
      return { z, tx, ty };
    }
    const shake = (t, t0, amp = 14) => t < t0 ? 0 : amp * Math.exp(-9 * (t - t0)) * Math.sin((t - t0) * 70);

    // ---------- 双语字幕 + 生词卡（按配音实际时间） ----------
    // narration.lines[i]：{ id, en（生词用 [ ] 标出）, zh, dur（配音秒数）, words?: { 生词: 在这段配音里的出现秒数 } }
    const NAR = cfg.narration || window.NARRATION, LINES = NAR.lines.map((l) => ({ ...l })), VOCAB = NAR.vocab, SCENE_T = cfg.sceneT;
    if (SCENE_T.length !== LINES.length) throw new Error(`sceneT 有 ${SCENE_T.length} 项，旁白有 ${LINES.length} 句，必须一一对应`);
    LINES.forEach((l, i) => {
      if (!l.dur) throw new Error(`旁白 ${l.id} 没有 dur，先运行 voice_prep.py`);
      l.start = videoOf(SCENE_T[i]) + (i === 0 ? 0.5 : 0.35);
      const nextStart = i < LINES.length - 1 ? videoOf(SCENE_T[i + 1]) + 0.1 : VDUR - 0.4;
      l.end = Math.min(l.start + l.dur + 0.9, nextStart);
      if (l.start + l.dur > nextStart + 0.05) console.warn(`旁白 ${l.id} 比这一场长 ${(l.start + l.dur - nextStart).toFixed(2)} 秒，会和下一句重叠：给这一场加 holds`);
      const plain = l.en.replace(/[\[\]]/g, ""); const timed = l.words || {}; l.cards = [];
      l.en.replace(/\[([^\]]+)\]/g, (m, w, off) => {
        if (!VOCAB[w]) throw new Error(`旁白 ${l.id} 里的生词 ${w} 不在 vocab 里`);
        const pos = l.en.slice(0, off).replace(/[\[\]]/g, "").length;
        // 有逐词时间戳就用（提前 0.1 秒弹出），没有就按字符位置估算
        const at = w in timed ? l.start + Math.max(0, timed[w] - 0.1) : l.start + 0.15 + (pos / plain.length) * (l.dur - 0.3);
        l.cards.push({ w, at }); return m;
      });
      D.settle(Math.min(l.end - 0.3, l.cards.length ? l.cards[0].at + 0.8 : l.start + 1.2));
    });
    window.__voice = LINES.map((l) => ({ file: `assets/voice/${l.id}.mp3`, start: l.start }));
    window.__subs = LINES.map((l) => ({ start: l.start, end: l.end, en: l.en.replace(/[\[\]]/g, ""), zh: l.zh }));
    window.__overlaps = LINES.map((l, i) => i < LINES.length - 1 ? +(l.start + l.dur - LINES[i + 1].start).toFixed(2) : 0);
    const subEl = document.getElementById("sub"), subEn = document.getElementById("subEn"), subZh = document.getElementById("subZh");
    const card = document.getElementById("vcard"), vw = document.getElementById("vw"), vp = document.getElementById("vp"), vm = document.getElementById("vm");
    let subCur = -1, cardCur = "";
    function drawSubs(T) {
      const i = LINES.findIndex((l) => T >= l.start - 0.15 && T < l.end + 0.25);
      if (i < 0) { subEl.style.opacity = 0; card.style.opacity = 0; return; }
      const l = LINES[i];
      if (i !== subCur) {
        subEn.innerHTML = l.en.split(/(\[[^\]]+\])/).map((seg) => seg.startsWith("[") ? `<span class="v">${seg.slice(1, -1)}</span>` : seg).join("");
        subZh.textContent = l.zh; subCur = i;
      }
      const inK = E.outCubic(P(T, l.start - 0.15, l.start + 0.15)), out = E.inCubic(P(T, l.end, l.end + 0.25));
      subEl.style.opacity = inK * (1 - out);
      subEl.style.transform = `translateX(-50%) translateY(${(1 - inK) * 24 + out * 16}px)`;
      // 生词卡：念到这个词时弹出，停到下一个生词或本句结束
      const cur = [...l.cards].reverse().find((w) => T >= w.at);
      if (!cur) { card.style.opacity = 0; return; }
      if (cur.w !== cardCur) { const [pos, mean] = VOCAB[cur.w]; vw.textContent = cur.w; vp.textContent = pos; vm.textContent = mean; cardCur = cur.w; }
      const v = spring(T - cur.at, 2.8, 0.5), o = E.inCubic(P(T, l.end, l.end + 0.2));
      card.style.opacity = clamp((T - cur.at) * 8) * (1 - o);
      card.style.transform = `scale(${0.6 + 0.4 * v}) rotate(${(1 - v) * 6 + 1.2}deg)`;
    }
    D.settle(1.2);

    // ---------- 换场地的扫屏转场：一根指针从画面中心顺时针扫一圈，扫过的扇形露出下一场 ----------
    const CX = W / 2, CY = H / 2, RAD = Math.ceil(Math.hypot(W, H) / 2) + 400;
    const wipeCues = cfg.wipeCues || [[0.02, "kis-tick_002", -2], [0.32, "wz-swish-medium", -4]];
    LOCS.slice(1).forEach((l) => wipeCues.forEach(([dt, s, g]) => C(l.start + dt, s, g)));
    function wipeClip(k) {
      if (k >= 1) return "none";
      const a1 = -Math.PI / 2 + k * Math.PI * 2, pts = [`${CX}px ${CY}px`];
      const steps = Math.max(2, Math.ceil(k * 48));
      for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + (a1 + Math.PI / 2) * (i / steps); pts.push(`${CX + Math.cos(a) * RAD}px ${CY + Math.sin(a) * RAD}px`); }
      return `polygon(${pts.join(",")})`;
    }
    function drawHand(k) {
      if (k <= 0 || k >= 1) return;
      const a = -Math.PI / 2 + k * Math.PI * 2, L2 = RAD - 200;
      const tipx = CX + Math.cos(a) * L2, tipy = CY + Math.sin(a) * L2, nx = -Math.sin(a), ny = Math.cos(a);
      el(over, "path", { d: `M${CX + nx * 16} ${CY + ny * 16} L${tipx + nx * 3} ${tipy + ny * 3} L${tipx - nx * 3} ${tipy - ny * 3} L${CX - nx * 16} ${CY - ny * 16} Z`, fill: INK });
      el(over, "circle", { cx: CX, cy: CY, r: 30, fill: GOLD, stroke: INK, "stroke-width": 6 });
    }

    // ---------- 片尾：主线物件形状的光圈收拢，然后出片尾字 ----------
    // end: { path（以原点为中心、约 200 宽的 SVG 路径）, irisStart, irisEnd, textAt, text }
    const END = cfg.end || null;
    let irisFocus = [W / 2, H / 2];
    const setIrisFocus = (x, y) => { irisFocus = [x, y]; };
    const movePath = (d, x, y, s) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, a, b) => `${x + a * s} ${y + b * s}`);
    function drawIris(t) {
      if (!END || t < END.irisStart) return;
      const t0 = END.irisStart, t1 = END.irisEnd, big = 22 * Math.max(W, H) / 1920; let s;
      if (t < t0 + 0.8) s = lerp(big, 1.9, E.outQuart(P(t, t0, t0 + 0.8)));
      else if (t < t1 - 0.3) s = 1.9 + Math.sin((t - t0 - 0.8) * 5) * 0.04;
      else s = lerp(1.9, 0, E.inBack(P(t, t1 - 0.3, t1), 1.6));
      el(el(over, "g", {}), "path", { d: `M-10 -10 H${W + 10} V${H + 10} H-10 Z ${movePath(END.path, irisFocus[0], irisFocus[1], s)}`, fill: INK, "fill-rule": "evenodd" });
    }
    const endEl = document.getElementById("end"), endT = document.getElementById("endt");
    if (END) endT.textContent = END.text || "完";

    // ---------- 每帧 ----------
    VS.start = (draw) => {
      for (const loc of LOCS) if (typeof draw[loc.id] !== "function") throw new Error(`场地 ${loc.id} 没有绘制函数`);
      D.onFrame((t) => {
        over.innerHTML = "";
        for (const loc of LOCS) {
          const o = L[loc.id];
          const vis = t >= loc.start && t < loc.end + WIPE && (!END || t < END.irisEnd + 0.05);
          o.el.style.display = vis ? "block" : "none";
          if (!vis) continue;
          for (const k in o.spr) o.spr[k].style.display = "none";
          o.fx.innerHTML = "";
          const wk = loc.start > 0 ? P(t, loc.start, loc.start + WIPE) : 1;
          o.el.style.clipPath = wipeClip(E.inOutSine(wk));
          o.el.style.zIndex = LOCS.indexOf(loc);
          draw[loc.id](t);
          if (loc.start > 0 && wk < 1) drawHand(E.inOutSine(wk));
        }
        drawSubs(VB);
        drawIris(t);
        const showEnd = END && t >= END.irisEnd;
        endEl.style.display = showEnd ? "flex" : "none";
        if (showEnd) { const v = spring(t - END.textAt, 2.4, 0.5); endT.style.transform = `scale(${0.2 + 0.8 * v}) rotate(${(1 - v) * -12}deg)`; endT.style.opacity = clamp((t - END.textAt) * 8); }
      });
    };

    // 故事文件里直接当全局函数用
    Object.assign(window, { W, H, INK, CREAM, GOLD, DUST, E, P, lerp, spring, clamp, hash, D, C, L, AR, over, TITLE, FACT, GROUND,
      put, SZ, gAt, squash, el, puff, star, twinkle, speed, zap, camera, shake, makeInset, setIrisFocus, videoOf, storyOf, DUR, VDUR });
  };
})();
