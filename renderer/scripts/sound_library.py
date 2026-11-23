#!/usr/bin/env python3
"""代码视频音效库工具：检索、查看、校验、重建。

库内全部声音为 CC0 或公有领域，可商用、无需署名。目录与许可见库根目录 catalog.json 与各子目录 LICENSE。
库位置按顺序查找：--lib 参数 → 环境变量 CTV_SOUND_LIB → ~/Documents/Codex/素材库/code-to-video-sounds。

示例：
    python3 sound_library.py search 风铃
    python3 sound_library.py search 嗖 --max-dur 0.6 -n 5
    python3 sound_library.py search 欢快 --kind music
    python3 sound_library.py show wz-tone-ding-high
    python3 sound_library.py path wz-tone-ding-high
    python3 sound_library.py verify
    python3 sound_library.py fetch --lib /新位置   # 按目录里的固定版本链接重新下载整个库
    python3 sound_library.py add 风铃.wav --tags 风铃 环境 --source "来源网址" --license CC0-1.0
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

DEFAULT = "~/Documents/Codex/素材库/code-to-video-sounds"

# 中文检索词 → 目录里的英文或中文关键词。检索时两边都会匹配。
SYN = {
    "风铃": ["chime", "shimmer", "glint", "glass", "bell", "sparkle", "tinkl"],
    "铃": ["bell", "chime", "ding"], "叮": ["ding", "bell", "chime", "tone"], "钟": ["bell", "gong", "clock"],
    "嗖": ["whoosh", "swish", "swoosh", "air"], "转场": ["transition", "whoosh", "riser", "swish"],
    "划过": ["whoosh", "swipe", "swish"], "滑动": ["swipe", "slide"], "弹出": ["pop", "appear", "bubble"],
    "出现": ["appear", "pop", "materialis", "reveal"], "消失": ["vanish", "disappear", "dissolve"],
    "点击": ["click", "tap", "tick", "press"], "打字": ["typing", "keyboard", "key"], "键盘": ["keyboard", "typing", "key"],
    "成功": ["success", "confirm", "correct", "complete"], "错误": ["error", "fail", "wrong"],
    "通知": ["notification", "alert", "message"], "提示": ["notification", "tone", "alert", "ding"],
    "落地": ["impact", "land", "thud"], "撞击": ["impact", "hit", "collid"], "重击": ["hit", "slam", "boom", "punch"],
    "轰": ["boom", "bass", "rumble"], "低音": ["bass", "sub", "808", "boom"], "铺垫": ["riser", "build", "anticipation"],
    "上升": ["riser", "rise", "up"], "下降": ["faller", "fall", "down"], "闪光": ["shimmer", "sparkle", "glint"],
    "亮": ["shimmer", "bright", "sparkle"], "魔法": ["magic", "sparkle", "shimmer"], "庆祝": ["celebrat", "applause", "confetti", "firework"],
    "掌声": ["applause", "clap"], "金币": ["coin", "money"], "钱": ["money", "coin", "till", "cash"],
    "时钟": ["clock", "tick", "timer"], "倒计时": ["countdown", "timer", "tick"], "计数": ["count", "number", "data"],
    "数据": ["data", "chart", "count", "progress"], "进度": ["progress", "bar", "loading"], "科技": ["digital", "tech", "glitch", "scan", "laser"],
    "故障": ["glitch", "static", "error"], "扫描": ["scan"], "书写": ["writ", "pen", "pencil", "marker", "chalk"],
    "翻页": ["page", "paper", "book"], "纸": ["paper", "card", "page"], "水": ["water", "splash", "drip", "bubble", "rain"],
    "雨": ["rain"], "环境": ["ambient", "ambience", "loop"], "手机": ["phone", "vibrat", "ring"], "门铃": ["doorbell"],
    "机械": ["mechan", "lock", "latch", "switch", "shutter"], "开关": ["switch", "toggle"], "相机": ["shutter", "camera"],
    "弹跳": ["bounce", "spring", "boing"], "旋转": ["spin"], "缩放": ["zoom", "grow", "shrink"],
    "落版": ["sting", "logo"], "片头": ["intro", "sting", "logo"], "片尾": ["outro", "sting", "end"],
    "游戏": ["game", "8-bit", "nes", "arcade", "jingle"], "复古": ["retro", "8-bit", "nes", "classic"],
}


def lib_root(arg):
    return Path(os.path.expanduser(arg or os.environ.get("CTV_SOUND_LIB") or DEFAULT))


def load(root):
    f = root / "catalog.json"
    if not f.exists():
        sys.exit(f"找不到音效库目录文件：{f}\n用 --lib 指定库位置，或运行 fetch 重新下载。")
    return json.loads(f.read_text(encoding="utf-8"))["sounds"]


def text_of(s):
    parts = [s["id"], s.get("desc", ""), s.get("category", "")] + s.get("tags", []) + s.get("use_for", [])
    return " ".join(parts).lower()


def score(s, terms):
    t = text_of(s)
    total = 0
    for term in terms:
        keys = [term.lower()] + SYN.get(term, [])
        # 英文关键词按词首匹配，避免 rain 命中 grainy；中文按子串匹配
        hit = [k for k in keys if (re.search(r"\b" + re.escape(k.lower()), t) if k.isascii() else k in t)]
        if not hit:
            return 0
        total += len(hit)
    return total


def cmd_search(a, root):
    sounds = load(root)
    terms = a.query
    res = []
    for s in sounds:
        if a.kind and s["kind"] != a.kind:
            continue
        if a.max_dur and s["duration"] > a.max_dur:
            continue
        if a.min_dur and s["duration"] < a.min_dur:
            continue
        sc = score(s, terms)
        if sc:
            res.append((sc, s))
    res.sort(key=lambda x: (-x[0], x[1]["duration"]))
    if not res:
        print("没有匹配。可换近义词，或用英文关键词（如 whoosh、chime、pop）。")
        return
    for sc, s in res[: a.n]:
        sync = f"，同步点 {s['sync_at']:.3f}s" if s.get("sync_at") is not None else ""
        print(f"{s['id']}  [{s['kind']}/{s['category']}] {s['duration']:.2f}s{sync}")
        print(f"    {s.get('desc', '')}")
    if len(res) > a.n:
        print(f"…… 共 {len(res)} 条，用 -n 查看更多")


def find(root, sid):
    for s in load(root):
        if s["id"] == sid:
            return s
    sys.exit(f"没有这个编号：{sid}")


def cmd_show(a, root):
    s = find(root, a.id)
    s = dict(s, absolute_path=str(root / s["path"]))
    print(json.dumps(s, ensure_ascii=False, indent=1))


def cmd_path(a, root):
    print(root / find(root, a.id)["path"])


def cmd_verify(a, root):
    sounds = load(root)
    missing = [s["id"] for s in sounds if not (root / s["path"]).exists()]
    wrong = [s["id"] for s in sounds if (root / s["path"]).exists() and (root / s["path"]).stat().st_size != s["bytes"]]
    print(f"条目 {len(sounds)}，缺失 {len(missing)}，大小不符 {len(wrong)}")
    for x in (missing + wrong)[:20]:
        print("  ", x)
    if a.decode:
        bad = []
        for s in sounds:
            r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(root / s["path"]), "-f", "null", "-"],
                               capture_output=True, text=True)
            if r.returncode or r.stderr.strip():
                bad.append(s["id"])
        print(f"解码失败 {len(bad)}", bad[:20])
    sys.exit(1 if missing or wrong else 0)


def cmd_fetch(a, root):
    src = Path(a.catalog) if a.catalog else Path(__file__).resolve().parent.parent / "assets" / "sound-catalog.json"
    data = json.loads(src.read_text(encoding="utf-8"))
    root.mkdir(parents=True, exist_ok=True)
    n = 0
    for s in data["sounds"]:
        dst = root / s["path"]
        if dst.exists() and dst.stat().st_size == s["bytes"]:
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["curl", "-sfL", "-m", "120", "-o", str(dst), s["url"]])
        n += 1
        if r.returncode:
            print("下载失败：", s["id"], s["url"])
    (root / "catalog.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"完成，下载 {n} 个文件。许可说明见 Skill 的 assets/SOUND-LICENSES.md")


def measure_onset(path, rate=8000, win=40):
    """测量起音位置（秒）：第一次达到开头 0.6 秒内峰值 30% 的位置。作为没有标注同步点的声音的 sync_at。"""
    from array import array
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate), "-f", "s16le", "-"],
                       capture_output=True)
    smp = array("h")
    smp.frombytes(r.stdout[: len(r.stdout) // 2 * 2])
    env = [max(abs(v) for v in smp[i:i + win]) for i in range(0, max(1, len(smp) - win), win)]
    if not env or max(env) == 0:
        return 0.0
    thr = 0.3 * max(env[: int(0.6 * rate / win)] or env)
    for k, v in enumerate(env):
        if v >= thr:
            return round(k * win / rate, 3)
    return 0.0


def cmd_add(a, root):
    """把自己找到的可商用声音登记进库：复制到 user/ 目录并写入目录文件。"""
    import shutil
    src = Path(a.file)
    if not src.is_file():
        sys.exit(f"文件不存在：{src}")
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)],
                       capture_output=True, text=True)
    try:
        dur = round(float(r.stdout), 3)
    except ValueError:
        sys.exit("无法读取音频时长，确认文件是可解码的音频")
    data = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
    sid = "usr-" + src.stem.replace(" ", "-")
    if any(s["id"] == sid for s in data["sounds"]):
        sys.exit(f"编号已存在：{sid}")
    dst = root / "user" / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    data["sounds"].append({"id": sid, "kind": a.kind, "path": f"user/{src.name}", "category": a.category,
                           "tags": a.tags, "desc": a.desc or src.stem, "duration": dur, "source": a.source,
                           "sync_at": measure_onset(dst), "sync_source": "测得起音",
                           "license": a.license, "url": a.source, "bytes": dst.stat().st_size})
    data["count"] = len(data["sounds"])
    (root / "catalog.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已登记 {sid}（{dur}s）。请确认许可允许商用，并保留来源页面。")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lib", help="音效库位置")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search", help="按中文或英文关键词检索，多个词同时满足")
    s.add_argument("query", nargs="+")
    s.add_argument("--kind", choices=["sfx", "ambience", "music"])
    s.add_argument("--max-dur", type=float)
    s.add_argument("--min-dur", type=float)
    s.add_argument("-n", type=int, default=10)
    s2 = sub.add_parser("show", help="查看一条的完整信息")
    s2.add_argument("id")
    s3 = sub.add_parser("path", help="输出文件绝对路径")
    s3.add_argument("id")
    s4 = sub.add_parser("verify", help="检查库文件是否齐全")
    s4.add_argument("--decode", action="store_true", help="同时逐个解码检查")
    s5 = sub.add_parser("fetch", help="按目录中的固定版本链接下载或补全整个库")
    s5.add_argument("--catalog", help="目录文件，默认用 Skill 自带的 assets/sound-catalog.json")
    s6 = sub.add_parser("add", help="登记一个自己找到的可商用声音")
    s6.add_argument("file")
    s6.add_argument("--tags", nargs="+", required=True)
    s6.add_argument("--source", required=True, help="来源网址或说明")
    s6.add_argument("--license", required=True, help="许可，例如 CC0-1.0")
    s6.add_argument("--kind", choices=["sfx", "ambience", "music"], default="sfx")
    s6.add_argument("--category", default="自行添加")
    s6.add_argument("--desc")
    a = ap.parse_args()
    root = lib_root(a.lib)
    {"search": cmd_search, "show": cmd_show, "path": cmd_path, "verify": cmd_verify,
     "fetch": cmd_fetch, "add": cmd_add}[a.cmd](a, root)


if __name__ == "__main__":
    main()
