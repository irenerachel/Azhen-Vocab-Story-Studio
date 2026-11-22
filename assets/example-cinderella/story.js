// 灰姑娘：午夜十二点的那双鞋 —— 故事文件。通用能力都在 lib/engine.js，这里只写这个故事的配置和每个场地的画面。
// 时间都是“故事时间”（秒）；配音比画面长的地方用 holds 让画面等旁白，引擎会自动换算成视频时间。
const IRIS0 = 47.0, IRIS1 = 48.35, ENDT = 48.55;   // 片尾：光圈开始收、收完、出“完”字

VocabStory.init({
  aspect: "16:9",
  label: "灰姑娘",
  duration: 50,
  music: { sound: "fpd-happy-whistling-ukulele", gain_db: -27, fade_in: 0.3, fade_out: 1.6 },
  // 场地：每个场地一张背景，列出这个场地会用到的精灵图（assets/cut/ 下的文件名）
  locs: [
    { id: "kitchen", bg: "B1", start: 0, end: 12.4, sprites: ["C01", "C02", "C03", "C04"] },
    { id: "garden", bg: "B2", start: 12.4, end: 24.6, sprites: ["C08", "C05", "C06", "C07", "C09", "C10", "C11"] },
    { id: "ball", bg: "B3", start: 24.6, end: 30.8, sprites: ["C11", "C12", "C13", "C14a", "C14b"] },
    { id: "stairs", bg: "B4", start: 30.8, end: 37.4, sprites: ["C11", "C16"] },
    { id: "parlor", bg: "B5", start: 37.4, end: 50, sprites: ["C12", "C18", "C19"] },
  ],
  // 身高表：图片显示高度 = 主角站立身高 × 系数。角色相对身高：灰姑娘 1，继母 1.08，瘦姐姐 1.0，胖姐姐 0.68，王子 1.1，教母 0.68
  fact: { C01: 0.98, C02: 1.075, C03: 1.08, C04: 1.45, C05: 0.74, C06: 0.68, C07: 0.42, C08: 1.0, C09: 0.33, C10: 0.95,
    C11: 1.03, C12: 1.1, C13: 1.09, C14a: 0.68, C14b: 1.0, C18: 0.53, C19: 1.0 },
  // 地面透视：[地平线 y, 参考身高, 参考脚位 y]
  ground: { kitchen: [450, 640, 1000], garden: [470, 427, 790], ball: [560, 640, 1000], parlor: [560, 640, 1000] },
  // 每句旁白从哪个故事时刻开始（与 narration.js 里的句子一一对应）
  sceneT: [0, 6.4, 12.4, 18.4, 24.6, 30.8, 37.4, 43.4],
  // 等旁白的停顿：[故事时刻, 增加的视频秒数, 停顿内故事走速]
  holds: [[5.4, 1.5, 0.2], [13.85, 3.2, 0.08], [19.31, 1.2, 0.08], [21.2, 1.6, 0.08], [26.3, 1.2, 0.08], [28.0, 2.6, 0.3],
    [36.2, 0.6, 0.3], [38.45, 1.6, 0.08], [42.0, 0.6, 0.2], [43.85, 2.8, 0.08]],
  title: { loc: "kitchen", t1: "灰姑娘", t2: "午夜十二点的那双鞋", x: 150, y: 120 },
  // 片尾光圈的形状：主线物件（玻璃鞋）的轮廓
  end: { irisStart: IRIS0, irisEnd: IRIS1, textAt: ENDT, text: "完",
    path: "M-100 20 C-100 -12 -82 -42 -60 -42 L-50 -42 C-30 -12 12 -6 60 -12 C96 -16 112 6 106 26 C102 42 80 46 60 46 L-40 46 C-55 46 -60 40 -62 30 L-70 30 L-78 76 L-92 76 L-95 30 C-100 28 -100 24 -100 20 Z" },
});

// ================= 场 1–2：厨房 =================
// 姑娘面朝左扫地（扫地图原本朝右，水平翻转），扫帚尖把灰扫向左上方的标题牌
const K = { x: 1290, y: 820, h: gAt("kitchen", 820) };   // h：灰姑娘站立身高；脚放在字幕框（y≈817）上方，扫帚头和脚不被挡
const SWEEPS = [0.35, 1.05, 1.75];
const BIG = 2.45, ENGULF = 3.15, SWAP2 = 3.45, BLOW = 4.45;
SWEEPS.forEach((s) => C(s, "wz-swish-soft", -6)); C(BIG, "wz-whoosh-fast-hard", -2); C(2.7, "wz-swish-medium", -4);
C(ENGULF, "wz-impact-medium-soft", -3); C(BLOW, "wz-whoosh-fast-soft", -4);
const FAM_IN = 6.9, FAM_STOP = 8.0, DROP = 8.55, FAM_OUT = 9.3;
[6.95, 7.35, 7.75].forEach((s) => C(s, "kimp-footstep_carpet_000", -6)); C(DROP, "wz-impact-heavy-soft", 0); C(8.8, "wz-transform-stretch", -8); C(FAM_OUT + 0.15, "wz-whoosh-fast-medium", -3);
function drawKitchen(t) {
  const lc = "kitchen", fx = L[lc].fx;
  // 镜头：开场轻推到姑娘，第二场回到全景再推近衣服山
  let z = lerp(1.0, 1.06, E.inOutSine(P(t, 0, 6.2)));
  z = lerp(z, 1.0, E.inOutCubic(P(t, 6.3, 7.1)));
  z = lerp(z, 1.12, E.inOutSine(P(t, 9.8, 12.4)));
  camera(lc, { z, fx: 1150, fy: lerp(600, 520, E.inOutSine(P(t, 9.8, 12.4))), t, dy: shake(t, DROP, 10) });
  // 标题牌：首帧就在；被一股灰卷走
  const tk = P(t, BIG + 0.2, BIG + 0.65);
  TITLE.style.display = tk >= 1 ? "none" : "block";
  TITLE.style.transform = `translate(${-E.inCubic(tk) * 900}px,${-E.inCubic(tk) * 520}px) rotate(${-E.inCubic(tk) * 38 + Math.sin(t * 3) * 0.6}deg) scale(${1 - 0.25 * tk})`;
  // 姑娘
  if (t < SWAP2) {
    const ph = (t % 0.7) / 0.7; const sw = Math.sin(ph * Math.PI * 2);
    const bigK = P(t, BIG - 0.25, BIG + 0.15);
    const rot = -sw * 3 - bigK * 6 + E.outCubic(P(t, BIG + 0.15, BIG + 0.5)) * 6;
    put(lc, "C01", { x: K.x + sw * 10, y: K.y, h: SZ("C01", K.h), flip: true, rot });
  } else if (t < DROP) {
    const s = squash(t, SWAP2, 0.2);
    put(lc, "C02", { x: K.x, y: K.y, h: SZ("C02", K.h), ...s, rot: Math.sin((t - SWAP2) * 2.2) * 0.8 });
  } else {
    const s = squash(t, DROP, 0.24); const k = t - DROP;
    const wob = 4.2 * Math.sin(2 * Math.PI * 1.3 * k) * Math.exp(-0.35 * k);
    put(lc, "C04", { x: K.x - 10, y: K.y, h: SZ("C04", K.h), ...s, rot: wob });
  }
  // 扫地的小灰团与弧线
  const hC01 = SZ("C01", K.h); const tip = [K.x - 0.42 * hC01 * AR.C01, K.y - 0.06 * hC01];   // 扫帚头（图是朝右画的，翻转后在左下）
  SWEEPS.forEach((s, i) => {
    puff(fx, t, s, tip[0] - 40, tip[1] - 10, 55, { dur: 0.75, seed: 10 + i, drift: [-160, -40] });
    const k = P(t, s - 0.1, s + 0.2);
    if (k > 0 && k < 1) for (let j = 0; j < 3; j++)
      el(fx, "path", { d: `M${tip[0] + 60} ${tip[1] + 40 - j * 26} q${-90} ${-10 - j * 8} ${-180 * k} ${-50 - j * 10}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" });
  });
  // 一大股灰：沿直线冲向标题牌
  for (let i = 0; i < 6; i++) {
    const s0 = BIG + i * 0.06;
    const k = E.outCubic(P(t, s0, s0 + 0.5));
    const x = lerp(tip[0], 520, k), y = lerp(tip[1], 330, k);
    puff(fx, t, s0, x, y, 60 + i * 22, { dur: 0.9, seed: 40 + i });
  }
  if (t > BIG && t < BIG + 0.5) speed(fx, t, tip[0] - 120, tip[1] - 120, Math.atan2(330 - tip[1], 520 - tip[0]) + Math.PI, 260, 5, 160, 3);
  // 扑脸大灰团：遮住换姿势
  puff(fx, t, ENGULF, K.x - 20, K.y - K.h * 0.5, K.h * 0.52, { dur: 1.0, seed: 77, n: 10 });
  // 吹开灰
  const hC02 = SZ("C02", K.h); const mouth = [K.x - 0.17 * hC02 * AR.C02, K.y - 0.81 * hC02];
  puff(fx, t, BLOW, mouth[0], mouth[1], 40, { dur: 0.9, seed: 91, drift: [30, -170] });
  // 继母三人：从右侧昂首走进，停一下，再一溜烟往左跑掉
  if (t > FAM_IN - 0.1 && t < FAM_OUT + 0.9) {
    const FY = 780, hF = SZ("C03", gAt("kitchen", FY)); let x, sx = 1, sy = 1, sk = 0;
    if (t < FAM_STOP) { const k = E.outCubic(P(t, FAM_IN, FAM_STOP)); x = lerp(2500, 560, k); }
    else if (t < FAM_OUT) { x = 560; const a = P(t, FAM_OUT - 0.3, FAM_OUT); sx = 1 + 0.06 * a; sy = 1 - 0.05 * a; sk = 5 * a; }
    else { const k = E.inCubic(P(t, FAM_OUT, FAM_OUT + 0.45)); x = lerp(560, -900, k); sx = 1 + 0.35 * clamp(k * 3); sk = -12 * clamp(k * 3); }
    const bob = t < FAM_STOP ? Math.abs(Math.sin((t - FAM_IN) * Math.PI / 0.4)) * 14 : 0;
    put(lc, "C03", { x, y: FY - bob, h: hF, sx, sy, skew: sk });
    if (t > FAM_OUT && t < FAM_OUT + 0.6) speed(fx, t, x + hF * 0.6, FY - hF * 0.55, 0, 300, 6, hF * 0.6, 9);
    if (t > FAM_IN && t < FAM_IN + 0.5) speed(fx, t, x + hF * 0.65, FY - hF * 0.55, 0, 260, 5, hF * 0.55, 5);
  }
  // 衣服山落下：一团灰遮住换图
  puff(fx, t, DROP - 0.05, K.x - 10, K.y - K.h * 0.25, K.h * 0.36, { dur: 0.8, seed: 120, n: 9 });
  if (t > FAM_OUT + 0.45) puff(fx, t, FAM_OUT + 0.45, 80, 760, 120, { dur: 0.8, seed: 130 });
}

// ================= 场 3–4：月夜后院 =================
const G = { girl: [1450, 790, gAt("garden", 790)], gm: [590, 820, SZ("C05", gAt("garden", 820))], mid: [1030, 840], gMid: gAt("garden", 840) };
const GM_IN = 13.0, ZAP1 = 14.15, HEN = 14.6, OOPS = 15.55;
const RETRY = 18.55, PUMP_IN = 18.75, ZAP2 = 19.5, SWELL = 19.9, COACH = 20.5, ZAP3 = 21.45, SPIN = 21.8, SPIN_END = 22.65, DING = 23.0;
C(GM_IN, "wz-pop-large-out", -2); C(GM_IN + 0.05, "wz-shimmer-short-bright", -6); C(ZAP1, "wz-shimmer-short-sparkle", -5); C(HEN, "wz-pop-large-out", -2); C(HEN + 0.15, "wz-move-spring", -6); C(OOPS, "wz-click-snap-soft", -8);
C(RETRY, "wz-click-snap-medium", -6); C(PUMP_IN, "wz-swipe-slow-soft", -6); C(ZAP2, "wz-shimmer-short-sparkle", -5); C(SWELL, "wz-transform-stretch", -4); C(COACH, "wz-pop-large-out", 0); C(COACH + 0.05, "wz-shimmer-short-bright", -4);
C(ZAP3, "wz-shimmer-short-sparkle", -5); C(SPIN, "wz-whoosh-fast-soft", -4); C(SPIN + 0.4, "wz-whoosh-fast-soft", -6); C(SPIN_END, "wz-impact-light-soft", -6); C(DING, "wz-tone-ding-high", -4);
function broom(svg, x, y, rot, sc = 1) {
  const g = el(svg, "g", { transform: `translate(${x} ${y}) rotate(${rot}) scale(${sc})` });
  el(g, "path", { d: "M-6 -330 L6 -330 L8 -60 L-8 -60 Z", fill: "#8A5A33", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" });
  el(g, "path", { d: "M-24 -70 Q0 -84 24 -70 L46 4 Q0 14 -46 4 Z", fill: "#D7B370", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" });
  for (const dx of [-20, -6, 8, 22]) el(g, "line", { x1: dx * 0.6, y1: -50, x2: dx * 1.4, y2: 0, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" });
  el(g, "line", { x1: -28, y1: -58, x2: 28, y2: -58, stroke: INK, "stroke-width": 4 });
}
function drawGarden(t) {
  const lc = "garden", fx = L[lc].fx;
  let z = lerp(1.04, 1.0, E.outCubic(P(t, 12.4, 13.4)));
  z = lerp(z, 1.08, E.inOutSine(P(t, 15.6, 18.4)));
  z = lerp(z, 1.0, E.inOutCubic(P(t, 18.4, 19.1)));
  z = lerp(z, 1.1, E.inOutSine(P(t, 21.2, 24.6)));
  const fxp = t < 21 ? 1000 : lerp(1000, 1400, E.inOutSine(P(t, 21.2, 22.4)));
  camera(lc, { z: z * 1.12, fx: fxp + 40, fy: 640, t, dy: shake(t, COACH, 12) });
  const [gx, gy, gh] = G.girl, [mx, my, mh] = G.gm;
  // 教母
  const wandTip = [mx + mh * AR.C05 * 0.43, my - mh * 0.97];
  if (t >= GM_IN + 0.25) {
    if (t < OOPS || t >= RETRY) {
      const s = squash(t, t < RETRY ? GM_IN + 0.25 : RETRY, 0.2);
      const wave = (t > ZAP1 - 0.2 && t < ZAP1 + 0.3) || (t > ZAP2 - 0.2 && t < ZAP2 + 0.3) || (t > ZAP3 - 0.2 && t < ZAP3 + 0.3) ? -5 : 0;
      put(lc, "C05", { x: mx, y: my, h: mh, ...s, rot: wave + Math.sin(t * 2.4) * 1.2 });
    } else {
      const s = squash(t, OOPS, 0.14);
      put(lc, "C06", { x: mx + 10, y: my, h: mh * FACT.C06 / FACT.C05, ...s, rot: Math.sin(t * 7) * 0.8 });
    }
  }
  puff(fx, t, GM_IN, mx, my - mh * 0.45, 170, { dur: 0.95, seed: 200, fill: "#F7F1E4", n: 9 });
  for (let i = 0; i < 5; i++) twinkle(fx, t, GM_IN + 0.3 + i * 0.12, mx + (hash(i + 5) - 0.5) * 280, my - mh * (0.3 + hash(i + 9) * 0.8), 22, 0.5);
  // 扫帚 → 鸡
  if (t < HEN + 0.1) broom(fx, G.mid[0], G.mid[1], 8 + Math.sin(t * 1.5) * 1.5, G.gMid / 520);
  zap(fx, t, ZAP1, wandTip[0], wandTip[1], G.mid[0], G.mid[1] - 160);
  puff(fx, t, HEN - 0.05, G.mid[0], G.mid[1] - 120, 135, { dur: 0.8, seed: 210, fill: "#F7F1E4" });
  if (t >= HEN + 0.15 && t < RETRY + 0.6) {
    const k = t - (HEN + 0.15);
    const hop = Math.abs(Math.sin(k * Math.PI / 0.45)) * 26 * (k > 0.5 ? 1 : 0);
    let x = G.mid[0], sx = 1, sk = 0;
    if (t > RETRY) { const q = E.inCubic(P(t, RETRY, RETRY + 0.45)); x = lerp(G.mid[0], -400, q); sx = 1 + 0.3 * clamp(q * 3); sk = -10 * clamp(q * 3); }
    const s = squash(t, HEN + 0.15, 0.25);
    put(lc, "C07", { x, y: G.mid[1] - hop, h: SZ("C07", G.gMid), sx: s.sx * sx, sy: s.sy, skew: sk, flip: true });
    if (t > RETRY && t < RETRY + 0.5) speed(fx, t, x + 110, G.mid[1] - 100, 0, 200, 4, 120, 21);
  }
  // 南瓜滚进来 → 鼓胀 → 马车
  if (t >= PUMP_IN && t < COACH) {
    const k = E.outCubic(P(t, PUMP_IN, PUMP_IN + 0.55));
    const x = lerp(-300, G.mid[0], k);
    const roll = (1 - k) * -420;
    const sw = P(t, SWELL, COACH);
    const pulse = Math.sin(sw * Math.PI * 7) * 0.09 * sw;
    const big = 1 + 0.75 * E.inCubic(sw);
    const s = squash(t, PUMP_IN + 0.55, 0.18);
    put(lc, "C09", { x, y: G.mid[1], h: SZ("C09", G.gMid) * big, sx: s.sx * (1 + pulse), sy: s.sy * (1 - pulse), rot: roll, oy: t < PUMP_IN + 0.55 ? 0.5 : 1 });
  }
  zap(fx, t, ZAP2, wandTip[0], wandTip[1], G.mid[0], G.mid[1] - 120);
  puff(fx, t, COACH - 0.08, G.mid[0], G.mid[1] - 200, 290, { dur: 1.0, seed: 230, fill: "#F7F1E4", n: 10 });
  if (t >= COACH + 0.15) {
    const s = squash(t, COACH + 0.15, 0.22);
    const bob = Math.sin((t - COACH) * 2.2) * 4;
    put(lc, "C10", { x: G.mid[0] - 40, y: G.mid[1] + 10 - bob, h: SZ("C10", G.gMid), ...s });
    for (let i = 0; i < 6; i++) twinkle(fx, t, COACH + 0.3 + i * 0.35, G.mid[0] - 230 + hash(i + 31) * 420, G.mid[1] - 430 + hash(i + 37) * 320, 18, 0.55);
  }
  // 姑娘：旧裙 → 转一圈 → 礼服
  if (t >= 12.4) {
    if (t < SPIN) {
      const tilt = t > HEN + 0.3 && t < RETRY ? -3 * E.outCubic(P(t, HEN + 0.3, HEN + 0.8)) : 0;
      put(lc, "C08", { x: gx, y: gy, h: SZ("C08", gh), rot: tilt + Math.sin(t * 1.8) * 0.6 });
    } else if (t < SPIN_END) {
      const k = P(t, SPIN, SPIN_END); const a = E.inOutCubic(k) * Math.PI * 4;
      const sx = Math.cos(a); const useGown = k > 0.5;
      const lift = Math.sin(k * Math.PI) * 40;
      put(lc, useGown ? "C11" : "C08", { x: gx, y: gy - lift, h: SZ(useGown ? "C11" : "C08", gh), z: lift, sx: Math.max(0.04, Math.abs(sx)), flip: sx < 0 });
      for (let i = 0; i < 8; i++) {
        const ang = a * 1.3 + i * Math.PI / 4, r = 170 - k * 45;
        star(fx, gx + Math.cos(ang) * r, gy - gh * (0.15 + 0.1 * i) - lift, 14 + 8 * Math.sin(k * Math.PI), ang * 57);
      }
      speed(fx, t, gx - 150, gy - gh * 0.5, Math.PI / 2, 130, 3, 34, 51, 3);
      speed(fx, t, gx + 150, gy - gh * 0.5, -Math.PI / 2, 130, 3, 34, 52, 3);
    } else {
      const s = squash(t, SPIN_END, 0.18);
      put(lc, "C11", { x: gx, y: gy, h: SZ("C11", gh), ...s, rot: Math.sin((t - SPIN_END) * 2) * 0.8 });
    }
  }
  zap(fx, t, ZAP3, wandTip[0], wandTip[1], gx, gy - gh * 0.6);
  twinkle(fx, t, DING, gx - 40, gy - 12, 28, 0.6); twinkle(fx, t, DING + 0.12, gx + 34, gy - 10, 22, 0.55);
}

// ================= 场 5：舞厅 =================
const TAKE = 25.15, WHIP = 26.75, SIS_IN = 27.7;
C(TAKE, "wz-move-spring", -2); C(WHIP, "wz-whoosh-fast-hard", -3); C(SIS_IN, "wz-swipe-slow-firm", -5);
C(29.3, "wz-impact-light-soft", -4); [28.3, 29.9].forEach((s) => C(s, "wz-pop-small-bubble", -6));
function drawBall(t) {
  const lc = "ball", fx = L[lc].fx;
  let z = lerp(1.05, 1.0, E.outCubic(P(t, 24.6, 25.3)));
  z = lerp(z, 1.18, E.inOutCubic(P(t, TAKE + 0.4, WHIP)));
  const fxp = t < WHIP ? 1300 : 960;
  if (t >= WHIP) z = lerp(1.0, 1.05, E.inOutSine(P(t, WHIP, 30.8)));
  const whip = t >= WHIP ? (1 - E.outCubic(P(t, WHIP, WHIP + 0.4))) * 700 : 0;
  camera(lc, { z, fx: fxp, fy: 520, t, dx: whip });
  if (t < WHIP) {
    const s = squash(t, 24.75, 0.0);
    put(lc, "C11", { x: 520, y: 1000, h: SZ("C11", 640), ...s, rot: Math.sin(t * 2) * 0.8 });
    // 王子的“愣住”：先拉长再弹回
    let sx = 1, sy = 1;
    if (t > TAKE) { const v = spring(t - TAKE, 2.6, 0.38); sy = 1 + 0.18 * (1 - v) * (t - TAKE < 0.08 ? 0 : 1); sx = 1 - 0.1 * (1 - v); }
    if (t > TAKE - 0.15 && t < TAKE) { sy = 0.9; sx = 1.06; }
    put(lc, "C12", { x: 1360, y: 1000, h: SZ("C12", 640), sx, sy });
    const k = P(t, TAKE, TAKE + 0.6);
    if (k > 0 && k < 1) for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32, r0 = 170 + 40 * E.outCubic(k), r1 = r0 + 60 * (1 - k);
      const cx = 1360, cy = 1000 - SZ("C12", 640) * 0.88;
      el(fx, "line", { x1: cx + Math.cos(a) * r0, y1: cy + Math.sin(a) * r0, x2: cx + Math.cos(a) * r1, y2: cy + Math.sin(a) * r1, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" });
    }
  } else {
    const k = t - WHIP; const ang = (k / 2.6) * Math.PI * 2;
    const x = 780 + 210 * Math.sin(ang), bob = Math.abs(Math.sin(k * Math.PI / 0.75)) * 14;
    const sx = Math.cos(ang * 0.5);
    put(lc, "C13", { x, y: 1005 - bob, h: SZ("C13", 640), sx: 0.3 + 0.7 * Math.sqrt(Math.abs(sx)), flip: sx < 0, rot: Math.sin(ang) * 4 });
    if (Math.abs(sx) < 0.35) { speed(fx, t, x - 260, 650, Math.PI / 2, 140, 3, 50, 61); speed(fx, t, x + 260, 650, -Math.PI / 2, 140, 3, 50, 62); }
    if (t > SIS_IN) {
      const q = E.outBack(P(t, SIS_IN, SIS_IN + 0.5), 1.2);
      const stomp = t > 29.3 ? Math.abs(shake(t, 29.3, 10)) : 0;
      const s = squash(t, 29.3, 0.12);
      const gS = gAt("ball", 950);
      put(lc, "C14a", { x: lerp(2400, 1440, q), y: 950 + stomp, h: SZ("C14a", gS), ...(t > 29.3 ? s : {}) });
      const q2 = E.outBack(P(t, SIS_IN + 0.12, SIS_IN + 0.62), 1.2);
      put(lc, "C14b", { x: lerp(2600, 1660, q2), y: 945, h: SZ("C14b", gS) });
      // 怒气烟（插图自带的已去掉，改由代码画，和全片烟团同一画法）
      [[28.3, 1440, 950 - SZ("C14a", gS)], [29.3, 1660, 945 - SZ("C14b", gS)], [29.9, 1440, 950 - SZ("C14a", gS)]].forEach(([s0, px, py], i) =>
        puff(fx, t, s0, px + (i - 1) * 20, py - 10, 38, { dur: 0.75, seed: 300 + i, fill: "#B8B2AA", drift: [0, -80] }));
    }
  }
}

// ================= 场 6：王宫台阶 =================
const CLK = [605, 243, 36];
const STRIKES = [31.75, 32.4, 33.05], RUN0 = 32.75, DROP_S = 34.0, LOOK = 34.3, ZIP = 34.95;
STRIKES.forEach((s, i) => C(s, i === 1 ? "rd-gong_02" : "rd-gong_01", i === 2 ? -4 : -1));
[31.2, 31.4, 31.6].forEach((s) => C(s, "kis-tick_002", 0));
C(DROP_S + 0.05, "wz-tone-ding-mid", -4); C(DROP_S, "wz-transform-stretch", -6); C(ZIP, "wz-whoosh-fast-hard", -2); C(35.9, "wz-shimmer-short-soft", -6);
[32.85, 33.1, 33.35, 33.6, 33.85].forEach((s) => C(s, "kimp-footstep_concrete_001", -10));
// 台阶中线（从右上到左下），以及随远近变化的人物高度
const PATH = [[1440, 255], [1520, 520], [1440, 730], [1220, 950], [900, 1260]];
function along(u) {
  const n = PATH.length - 1; const f = clamp(u, 0, 0.9999) * n; const i = Math.floor(f), k = f - i;
  const p0 = PATH[Math.max(0, i - 1)], p1 = PATH[i], p2 = PATH[i + 1], p3 = PATH[Math.min(n, i + 2)];
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (-a + 3 * b - 3 * c + d) * k * k * k);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), 125 + 420 * Math.pow(clamp(u), 1.2)];
}
const U_DROP = 0.52;
function drawStairs(t) {
  const lc = "stairs", fx = L[lc].fx;
  let z = 1.9; let fxp = CLK[0], fyp = CLK[1];
  const back = E.inOutCubic(P(t, 33.15, 33.75)); z = lerp(1.9, 1.0, back);
  fxp = lerp(CLK[0], 960, back); fyp = lerp(CLK[1], 540, back);
  const fin = E.inOutSine(P(t, 35.5, 37.4)); const slipP = along(U_DROP + 0.05);
  z = lerp(z, 1.4, fin); fxp = lerp(fxp, slipP[0], fin); fyp = lerp(fyp, slipP[1] - 60, fin);
  let sh = 0; STRIKES.forEach((s) => sh += shake(t, s, 12));
  camera(lc, { z, fx: fxp, fy: fyp, t, dx: sh, dy: sh * 0.6 });
  // 钟：分针一格一格走到 12，敲三下
  const [cx, cy, r] = CLK;
  let pop = 0; STRIKES.forEach((s) => { if (t > s) pop = Math.max(pop, 0.16 * Math.exp(-8 * (t - s))); });
  const g = el(fx, "g", { transform: `translate(${cx} ${cy}) scale(${1 + pop})` });
  el(g, "circle", { cx: 0, cy: 0, r, fill: "#F6EFD9", stroke: INK, "stroke-width": 3 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; el(g, "line", { x1: Math.sin(a) * r * 0.78, y1: -Math.cos(a) * r * 0.78, x2: Math.sin(a) * r * 0.9, y2: -Math.cos(a) * r * 0.9, stroke: INK, "stroke-width": i % 3 ? 1.6 : 2.6 }); }
  const ticks = Math.min(3, Math.floor(clamp((t - 31.2) / 0.2 + 1, 0, 3)));
  const minA = (-18 + ticks * 6) * Math.PI / 180;
  el(g, "line", { x1: 0, y1: 0, x2: Math.sin(minA) * r * 0.8, y2: -Math.cos(minA) * r * 0.8, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" });
  el(g, "line", { x1: 0, y1: 0, x2: Math.sin(-0.06) * r * 0.5, y2: -Math.cos(-0.06) * r * 0.5, stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" });
  el(g, "circle", { cx: 0, cy: 0, r: 3.5, fill: INK });
  STRIKES.forEach((s) => { const k = P(t, s, s + 0.55); if (k > 0 && k < 1) for (let j = 0; j < 2; j++) {
    const rr = r * (1.4 + j * 0.5 + k * 1.3);
    for (const side of [-1, 1]) el(fx, "path", { d: `M${cx + side * rr * Math.cos(0.6)} ${cy - rr * Math.sin(0.6)} A${rr} ${rr} 0 0 ${side > 0 ? 1 : 0} ${cx + side * rr * Math.cos(0.6)} ${cy + rr * Math.sin(0.6)}`, fill: "none", stroke: INK, "stroke-width": 3 * (1 - k) + 0.5, "stroke-linecap": "round" });
  } });
  // 她冲下台阶
  if (t >= RUN0 && t < ZIP + 0.5) {
    let u, flip = false, sk = 0, sx = 1;
    if (t < DROP_S) u = lerp(0.0, U_DROP, (t - RUN0) / (DROP_S - RUN0));
    else if (t < LOOK) { const k = P(t, DROP_S, LOOK); u = U_DROP + 0.06 * E.outCubic(k); sk = 14 * Math.sin(k * Math.PI); }
    else if (t < ZIP) { u = U_DROP + 0.06; flip = t > LOOK + 0.08 && t < ZIP - 0.12; }
    else { const k = E.inCubic(P(t, ZIP, ZIP + 0.38)); u = U_DROP + 0.06 + 0.6 * k; sx = 1 + 0.4 * clamp(k * 3); sk = -14 * clamp(k * 3); }
    const [x, y, h] = along(u);
    const running = t < DROP_S || t > ZIP;
    const bob = running ? Math.abs(Math.sin((t - RUN0) * Math.PI / 0.25)) * h * 0.05 : 0;
    put(lc, "C11", { x, y: y - bob, h, flip, skew: sk, sx, rot: running ? -11 + Math.sin((t - RUN0) * Math.PI / 0.25) * 3 : (flip ? 6 : 0) });
    if (running && t > RUN0 + 0.1) speed(fx, t, x + h * 0.45, y - h * 0.5, Math.atan2(-120, 80), h * 0.6, 4, h * 0.6, 71, Math.max(2, h / 200));
    if (t > DROP_S && t < LOOK) puff(fx, t, DROP_S, x + h * 0.25, y - 10, h * 0.12, { dur: 0.6, seed: 400 });
    if (t >= LOOK + 0.08 && t < LOOK + 0.3) for (let i = 0; i < 3; i++) el(fx, "line", { x1: x + h * 0.32, y1: y - h * (0.95 - i * 0.08), x2: x + h * 0.42, y2: y - h * (1.0 - i * 0.1), stroke: INK, "stroke-width": 4, "stroke-linecap": "round" });
  }
  // 掉下的玻璃鞋：弹两下后停在台阶上
  if (t >= DROP_S) {
    const [x0, y0, h0] = along(U_DROP); const [x1, y1] = along(U_DROP + 0.05);
    const k = P(t, DROP_S, DROP_S + 0.7);
    const bx = lerp(x0, x1, E.outCubic(k)); const bounce = Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k) * 90;
    const hs = h0 * 0.14;
    put(lc, "C16", { x: bx, y: lerp(y0, y1, k) - bounce, h: hs, rot: (1 - k) * -40 + 8, oy: 0.9 });
    if (t > 35.6) { twinkle(fx, t, 35.9, x1 + hs * 0.3, y1 - hs * 0.8, 26, 0.6); twinkle(fx, t, 36.6, x1 - hs * 0.4, y1 - hs * 0.5, 20, 0.55); }
  }
}

// ================= 场 7–8：客厅 =================
const PR_IN = 37.65, STRAIN = 38.7, TOPPLE = 41.1, CUT8 = 43.4, FIT = 44.1, WINK = 45.5;
C(PR_IN, "wz-whoosh-fast-medium", -3); C(PR_IN + 0.4, "wz-impact-light-soft", -6);
[STRAIN, 39.45, 40.2].forEach((s) => C(s, "wz-transform-stretch", -5)); C(TOPPLE + 0.25, "wz-impact-heavy-soft", -1); C(TOPPLE + 0.32, "wz-move-bounce", -6); C(TOPPLE + 0.3, "wz-move-spring", -6);
C(CUT8, "wz-whoosh-fast-soft", -4); C(FIT, "wz-tone-ding-high", -2); C(FIT + 0.05, "wz-shimmer-short-bright", -6); C(WINK, "wz-shimmer-short-soft", -6); C(IRIS0, "wz-swish-soft", -6); C(ENDT + 0.05, "wz-sting-playful-short", -3);
const GIRL8 = { x: 1100, y: 1000, h: SZ("C19", 640) };
const SIS = { x: 1260, y: 980, get h() { return SZ("C18", gAt("parlor", 980)); } };
// 特写圆框：第 8 场脚上的玻璃鞋会被字幕挡住，用圆框放大给观众看
const inset = makeInset("parlor", "C19", { left: 250, top: 250, size: 380 });
function drawParlor(t) {
  const lc = "parlor", fx = L[lc].fx;
  inset.style.display = "none";
  if (t < CUT8) {
    let z = lerp(1.04, 1.0, E.outCubic(P(t, 37.4, 38.2)));
    z = lerp(z, 1.18, E.inOutSine(P(t, 38.4, 43.4)));
    let sh = shake(t, TOPPLE + 0.25, 12);
    camera(lc, { z, fx: 960, fy: 700, t, dy: sh });
    const k = E.outCubic(P(t, PR_IN, PR_IN + 0.4));
    const s = squash(t, PR_IN + 0.4, 0.14);
    let ps = t > PR_IN + 0.4 ? s : { skew: -10 * (1 - k) };
    if (t > TOPPLE + 0.3) { const v = spring(t - TOPPLE - 0.3, 2.6, 0.38); ps = { sx: 1 - 0.1 * (1 - v), sy: 1 + 0.16 * (1 - v) }; }
    put(lc, "C12", { x: lerp(-400, 560, k), y: 1000, h: SZ("C12", 640), ...ps });
    if (t > PR_IN && t < PR_IN + 0.5) speed(fx, t, lerp(-400, 600, k) - 250, 760, Math.PI, 260, 5, 300, 81);
    // 胖姐姐使劲塞
    let jx = 0, sx = 1, sy = 1, rot = 0;
    if (t > STRAIN && t < TOPPLE) { jx = (hash(Math.floor(t * 30)) - 0.5) * 12; const q = Math.sin((t - STRAIN) * Math.PI * 2 * 1.4); sy = 1 + 0.05 * q; sx = 1 - 0.035 * q; }
    if (t >= TOPPLE) { const q = E.inCubic(P(t, TOPPLE, TOPPLE + 0.25)); rot = 24 * q; const s2 = squash(t, TOPPLE + 0.25, 0.14); sx = s2.sx; sy = s2.sy; }
    put(lc, "C18", { x: SIS.x + jx, y: SIS.y, h: SIS.h, sx, sy, rot, ox: 0.75 });
    [STRAIN + 0.2, 39.45, 40.2].forEach((s0, i) => {
      const q = P(t, s0, s0 + 0.55); if (q <= 0 || q >= 1) return;
      for (let j = 0; j < 2; j++) {
        const a = -Math.PI / 2 + (j ? 0.7 : -0.7) + i * 0.1, d = 150 + 120 * q;
        const x = SIS.x + 40 + Math.cos(a) * d * 0.6, y = SIS.y - SIS.h * 0.85 + Math.sin(a) * d * 0.35 + 90 * q * q;
        el(fx, "path", { d: `M${x} ${y - 20} Q${x + 12} ${y + 2} ${x} ${y + 10} Q${x - 12} ${y + 2} ${x} ${y - 20} Z`, fill: "#BFE3F0", stroke: INK, "stroke-width": 3 });
      }
    });
    puff(fx, t, TOPPLE + 0.22, SIS.x + 90, SIS.y - 10, 90, { dur: 0.9, seed: 500 });
  } else {
    // 场 8：横摇进来，只有她
    const wk = 1 - E.outCubic(P(t, CUT8, CUT8 + 0.45));
    let z = lerp(1.1, 1.0, E.outCubic(P(t, CUT8, CUT8 + 0.6)));
    const gw = GIRL8.h * AR.C19;
    const face = [GIRL8.x - gw * 0.08, GIRL8.y - GIRL8.h * 0.84];
    const push = E.inOutCubic(P(t, 44.6, 46.6));
    z = lerp(z, 1.55, push);
    const fxp = lerp(GIRL8.x - 60, face[0], push), fyp = lerp(620, face[1] + 30, push);
    const cm = camera(lc, { z, fx: fxp, fy: fyp, t, dx: -wk * 800 });
    if (t < CUT8 + 0.5) speed(fx, t, GIRL8.x, 500, 0, 600 * wk, 5, 700, 91, 4);
    const s = squash(t, FIT, 0.08);
    put(lc, "C19", { x: GIRL8.x, y: GIRL8.y, h: GIRL8.h, ...s, rot: Math.sin(t * 1.6) * 0.5 });
    const foot = [GIRL8.x - gw * 0.05, GIRL8.y - GIRL8.h * 0.05];
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; twinkle(fx, t, FIT + i * 0.03, foot[0] + Math.cos(a) * 70, foot[1] + Math.sin(a) * 50, 22, 0.5); }
    twinkle(fx, t, FIT, foot[0], foot[1] - 10, 42, 0.6);
    // 特写圆框：弹出时放大脚上的玻璃鞋，镜头推向脸时收起
    const iv = t < FIT - 0.05 ? 0 : spring(t - FIT + 0.05, 2.6, 0.5) * (1 - E.inBack(P(t, 45.9, 46.25), 1.4));
    inset.style.display = iv > 0.01 ? "block" : "none";
    if (iv > 0.01) {
      const D0 = 380, iw = D0 / 0.62, ih = iw / AR.C19, im = inset.firstChild;
      im.style.width = iw + "px"; im.style.height = ih + "px"; im.style.left = (D0 / 2 - 0.5 * iw) + "px"; im.style.top = (D0 / 2 - 0.88 * ih) + "px";
      inset.style.transform = `scale(${iv}) rotate(${(1 - iv) * -10}deg)`;
      for (let i = 0; i < 4; i++) twinkle(over, t, FIT + 0.15 + i * 0.22, 250 + 60 + hash(i + 71) * 260, 250 + 120 + hash(i + 73) * 200, 24, 0.5);
    }
    twinkle(fx, t, WINK, face[0] + gw * 0.22, face[1] - GIRL8.h * 0.04, 30, 0.55);
    setIrisFocus(cm.tx + face[0] * cm.z, cm.ty + (face[1] + 10) * cm.z);   // 片尾光圈收向她的脸
  }
}

VocabStory.start({ kitchen: drawKitchen, garden: drawGarden, ball: drawBall, stairs: drawStairs, parlor: drawParlor });
