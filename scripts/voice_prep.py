"""配音整理：量每段配音的时长，用 whisper 听写出每个生词实际念到的时刻，写回 narration.json 并生成 page/narration.js。
同时把听写结果和原稿并排打印出来，用来检查有没有念错、漏念。

输入：项目/assets/narration.json（lines: [{id, en（生词用 [ ] 标出）, zh, voiceUrl?}], vocab: {词: [词性, 中文]}）
      项目/assets/voice/<id>.mp3（没有且写了 voiceUrl 时自动下载）
输出：narration.json 每句补上 dur（秒）和 words（{生词: 在这段配音里的出现秒数}）；page/narration.js（window.NARRATION）
用法：~/.venvs/vocab-story/bin/python voice_prep.py 项目目录 [--no-whisper] [--model small]
依赖：ffprobe；faster-whisper（没装或加 --no-whisper 时跳过听写，生词卡时间退回按字符位置估算）"""
import argparse, difflib, json, pathlib, re, subprocess, sys, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("project"); ap.add_argument("--no-whisper", action="store_true"); ap.add_argument("--model", default="small")
a = ap.parse_args()
root = pathlib.Path(a.project).resolve()
nar_path = root / "assets/narration.json"
nar = json.loads(nar_path.read_text())
voice = root / "assets/voice"; voice.mkdir(parents=True, exist_ok=True)
norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())

# 1. 校验稿子：每个 [生词] 都要在 vocab 里，vocab 里每个词都要在旁白里出现
used = set()
for l in nar["lines"]:
    for w in re.findall(r"\[([^\]]+)\]", l["en"]):
        if w not in nar["vocab"]: sys.exit(f"{l['id']} 里的生词 [{w}] 不在 vocab 里")
        used.add(w)
unused = [w for w in nar["vocab"] if w not in used]
if unused: sys.exit(f"vocab 里这些词没有出现在任何一句旁白里：{unused}")

# 2. 下载缺的配音，量时长
for l in nar["lines"]:
    f = voice / f"{l['id']}.mp3"
    if not f.exists():
        if not l.get("voiceUrl"): sys.exit(f"缺配音 {f}，narration.json 里也没有 voiceUrl")
        req = urllib.request.Request(l["voiceUrl"], headers={"User-Agent": "Mozilla/5.0"})
        f.write_bytes(urllib.request.urlopen(req, timeout=120).read()); print("下载", f.name)
    l["dur"] = round(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)])), 2)

# 3. whisper 听写，拿到每个生词的时刻
model = None
if not a.no_whisper:
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(a.model, device="cpu", compute_type="int8")
    except Exception as e:
        print(f"⚠ 没法加载 whisper（{e}），跳过听写，生词卡时间按字符位置估算")
for l in nar["lines"]:
    l.pop("words", None)
    if not model: continue
    segs, _ = model.transcribe(str(voice / f"{l['id']}.mp3"), language="en", word_timestamps=True)
    heard = [(norm(w.word), w.start) for s in segs for w in s.words if norm(w.word)]
    plain = l["en"].replace("[", "").replace("]", "")
    script = [norm(t) for t in plain.split() if norm(t)]
    sm = difflib.SequenceMatcher(None, script, [h[0] for h in heard], autojunk=False)
    at = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): at[blk.a + k] = heard[blk.b + k][1]
    ratio = sm.ratio()
    flag = "" if ratio > 0.9 else "  ⚠ 听写和原稿差别较大，听一下这段配音"
    print(f"{l['id']}  {l['dur']:5.2f}s  原稿：{plain}\n{'':13}听写：{' '.join(h[0] for h in heard)}{flag}")
    # 生词（可能是多个词的短语）在原稿里的词序号 → 对应的听写时刻
    words, pos = {}, 0
    for seg in re.split(r"(\[[^\]]+\])", l["en"]):
        toks = [norm(t) for t in seg.strip("[]").split() if norm(t)]
        if seg.startswith("["):
            hit = next((at[i] for i in range(pos, pos + len(toks)) if i in at), None)
            if hit is None: print(f"{'':13}⚠ 没听出 [{seg[1:-1]}]，这个词的生词卡时间按位置估算")
            else: words[seg[1:-1]] = round(hit, 2)
        pos += len(toks)
    l["words"] = words

nar_path.write_text(json.dumps(nar, ensure_ascii=False, indent=1) + "\n")
js = {"lines": [{k: l[k] for k in ("id", "en", "zh", "dur", "words") if k in l} for l in nar["lines"]], "vocab": nar["vocab"]}
(root / "page").mkdir(exist_ok=True)
(root / "page/narration.js").write_text("// 由 voice_prep.py 生成，不要手改；改稿子改 assets/narration.json 后重跑\nwindow.NARRATION = " + json.dumps(js, ensure_ascii=False) + ";\n")
total = sum(l["dur"] for l in nar["lines"])
print(f"共 {len(nar['lines'])} 句，配音合计 {total:.1f} 秒；已写 narration.json 和 page/narration.js")
