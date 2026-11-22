// 故事文件骨架：两个场地、两句旁白。复制后改配置、重写每个场地的绘制函数。
// 这里的时间都是“故事时间”（秒）。画面写在 W×H 的画布上：横版 1920×1080，竖版 1080×1920。
// 骨架里的坐标写成了画布的比例，横竖版都能直接跑；正式写故事时按你的背景图改成具体数字更直观。
const ASPECT = "16:9";                             // new_project.sh 会改成建项目时选的画幅，要和 page/aspect.txt 一致
const [CW, CH] = ASPECT === "9:16" ? [1080, 1920] : [1920, 1080];
const IRIS0 = 14.6, IRIS1 = 15.9, ENDT = 16.1;      // 片尾：光圈开始收、收完、出片尾字

VocabStory.init({
  aspect: ASPECT,
  label: "故事名",
  duration: 17,                                    // 故事总长（秒，不含等旁白的停顿）
  music: { sound: "fpd-happy-whistling-ukulele", gain_db: -27, fade_in: 0.3, fade_out: 1.6 },
  locs: [                                          // 每个场地一张背景 + 这个场地用到的精灵图
    { id: "home", bg: "B1", start: 0, end: 8, sprites: ["C01", "C02"] },
    { id: "yard", bg: "B2", start: 8, end: 17, sprites: ["C05", "C08"] },
  ],
  fact: { C01: 0.98, C02: 1.075, C05: 0.74, C08: 1.0 },          // 身高表：显示高度 = 主角站立身高 × 系数
  ground: { home: [CH * 0.42, CH * 0.36, CH * 0.76], yard: [CH * 0.43, CH * 0.33, CH * 0.73] },   // [地平线 y, 参考身高, 参考脚位 y]
  sceneT: [0, 8],                                  // 每句旁白从哪个故事时刻开始
  holds: [[6.5, 1.2, 0.1]],                        // 等旁白：[故事时刻, 增加的视频秒数, 停顿内走速]
  title: { loc: "home", t1: "故事名", t2: "一句副标题", x: CW * 0.08, y: CH * 0.12 },
  end: { irisStart: IRIS0, irisEnd: IRIS1, textAt: ENDT, text: "完",
    // 光圈形状：换成主线物件的轮廓。以原点为中心、约 200 宽，只用 M / L / C 加绝对坐标（不要用 A 弧线和相对坐标）
    path: "M-100 0 C-100 -55 -55 -100 0 -100 C55 -100 100 -55 100 0 C100 55 55 100 0 100 C-55 100 -100 55 -100 0 Z" },
});

// ---------- 场地 1 ----------
// 写法：先列出这一场的事件时刻，声音提示 C(时刻, 音效, 音量) 和画面都引用同一个常量
const HERO = { x: CW * 0.6, y: CH * 0.74 };          // 脚的位置；记得在字幕框上方（横版上沿约 y=817，竖版约 y=1500）
const SWAP = 3.2, TITLE_OUT = 2.4;
C(SWAP, "wz-impact-medium-soft", -3);
function drawHome(t) {
  const lc = "home", fx = L[lc].fx, g = gAt(lc, HERO.y);
  camera(lc, { z: lerp(1.0, 1.08, E.inOutSine(P(t, 0, 8))), fx: HERO.x, fy: HERO.y - g * 0.5, t });
  // 标题牌被一团烟卷走
  const k = P(t, TITLE_OUT, TITLE_OUT + 0.45);
  TITLE.style.display = k >= 1 ? "none" : "block";
  TITLE.style.transform = `translate(${-E.inCubic(k) * CW * 0.6}px,${-E.inCubic(k) * CH * 0.4}px) rotate(${-E.inCubic(k) * 30}deg)`;
  // 姿势切换：不补间，用一团烟遮住换图，再配落位挤压
  if (t < SWAP) put(lc, "C01", { x: HERO.x + Math.sin(t * 9) * 8, y: HERO.y, h: SZ("C01", g), flip: true });
  else put(lc, "C02", { x: HERO.x, y: HERO.y, h: SZ("C02", g), ...squash(t, SWAP, 0.2) });
  puff(fx, t, SWAP - 0.3, HERO.x, HERO.y - g * 0.5, g * 0.5, { dur: 1.0, seed: 7, n: 10 });
}

// ---------- 场地 2 ----------
const POP = 8.9, ZAP = 12.0;
C(POP, "wz-pop-large-out", -2); C(ZAP, "wz-shimmer-short-sparkle", -5);
function drawYard(t) {
  const lc = "yard", fx = L[lc].fx, y = CH * 0.73, g = gAt(lc, y), ax = CW * 0.28, bx = CW * 0.72;
  const cm = camera(lc, { z: lerp(1.05, 1.0, E.outCubic(P(t, 8, 9))), fx: CW / 2, fy: CH * 0.58, t });
  put(lc, "C08", { x: bx, y, h: SZ("C08", g), rot: Math.sin(t * 1.8) * 0.6 });
  if (t >= POP + 0.25) put(lc, "C05", { x: ax, y: y + 20, h: SZ("C05", gAt(lc, y + 20)), ...squash(t, POP + 0.25, 0.2) });
  puff(fx, t, POP, ax, y - g * 0.3, g * 0.4, { dur: 0.95, seed: 200, fill: "#F7F1E4", n: 9 });
  zap(fx, t, ZAP, ax + g * 0.3, y - g * 0.7, bx, y - g * 0.6);
  setIrisFocus(cm.tx + bx * cm.z, cm.ty + (y - g * 0.85) * cm.z);   // 片尾光圈收向主角的脸
}

VocabStory.start({ home: drawHome, yard: drawYard });
