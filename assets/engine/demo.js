// 演示公用：一条暂停的 GSAP 时间线 + 声音提示 + 落位时刻；画布类演示用 onFrame(t) 按时间绘制。
window.Demo = function ({ duration = 4.5, label = "", music = null } = {}) {
  const cues = [], settle = [], frameFns = [];
  const tl = gsap.timeline({ paused: true });
  const api = {
    tl,
    cue: (t, sound, gain_db = 0) => cues.push({ t: Math.round(t * 1000) / 1000, sound, gain_db }),
    settle: (t) => settle.push(t),
    onFrame: (fn) => frameFns.push(fn),
    rng: (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
  };
  window.__scene = { duration, cues, settle, music, label };
  // base：本帧的整帧时刻。运动模糊会在快门内取子帧，数字、文字内容这类不该被糊开的东西按 base 更新
  window.__seek = (t, base = t) => { tl.seek(t, false); frameFns.forEach((fn) => fn(t, base)); };
  return api;
};
