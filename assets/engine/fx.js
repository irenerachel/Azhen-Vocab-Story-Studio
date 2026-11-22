// 演示公用手法：缓动、解析弹簧、拆字遮罩、乱码解码、计数、时间码。全部是 t 的纯函数，任意顺序 seek 结果一致。
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    inOutExpo: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutQuint: (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
    outBack: (p, s = 1.4) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
    inBack: (p, s = 1.4) => (s + 1) * p * p * p - s * p * p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inCubic: (p) => p * p * p,
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  };
  // 解析阻尼弹簧：从 0 到 1，freq 每秒振荡次数，damp 阻尼比（0.5 有一次明显回弹，0.8 几乎不回弹）
  const spring = (dt, freq = 2.2, damp = 0.55) => {
    if (dt <= 0) return 0;
    const w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - damp * damp);
    return 1 - Math.exp(-damp * w * dt) * (Math.cos(wd * dt) + (damp * w / wd) * Math.sin(wd * dt));
  };
  // 把元素文字拆成带遮罩的单字（或单词），返回内层 span；遮罩用于“从基线下方升起”
  const split = (el, { by = "char", mask = true } = {}) => {
    const text = el.textContent;
    el.textContent = "";
    const units = by === "word" ? text.split(/(\s+)/) : [...text];
    const inner = [];
    for (const u of units) {
      if (/^\s+$/.test(u)) { el.append(document.createTextNode(u)); continue; }
      const outer = document.createElement("span");
      outer.style.cssText = `display:inline-block;${mask ? "overflow:hidden;vertical-align:top;padding:0.06em 0.02em 0.12em;margin:-0.06em -0.02em -0.12em;" : ""}`;
      const s = document.createElement("span");
      s.style.display = "inline-block";
      s.textContent = u;
      outer.append(s); el.append(outer); inner.push(s);
    }
    return inner;
  };
  // 乱码解码：p 从 0 到 1，左侧逐字定稿，右侧按帧序号换随机字形
  const scramble = (text, p, frame, glyphs = "01ABCDEF#%&*<>/=+") => {
    const n = [...text].length, done = Math.floor(p * n);
    return [...text].map((ch, i) => {
      if (i < done || ch === " ") return ch;
      const h = Math.abs(Math.sin((i + 1) * 91.7 + frame * 13.37) * 43758.5453) % 1;
      return glyphs[Math.floor(h * glyphs.length)];
    }).join("");
  };
  const fmt = (v, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const timecode = (t, fps = 30) => {
    const f = Math.floor(t * fps + 1e-6), s = Math.floor(f / fps);
    return `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(f % fps).padStart(2, "0")}`;
  };
  // 二维值噪声（确定性），用于手抖、纸纹、云边
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  };
  const fbm = (x, y, o = 4) => { let a = 0.5, s = 0; for (let i = 0; i < o; i++) { s += a * noise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; };
  window.FX = { clamp, lerp, prog, E, spring, split, scramble, fmt, timecode, hash, noise, fbm };
})();
