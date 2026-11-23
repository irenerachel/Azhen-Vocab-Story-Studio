#!/usr/bin/env python3
"""成片技术检查：流信息、完整解码、帧数、空白帧、运动、音画同步、联系表。

只依赖 Python 标准库与 ffmpeg/ffprobe。
示例：
    python3 check_video.py out.mp4 --size 1920x1080 --fps 30 --duration 8 \
        --report render-report.json --sheet sheet.png
--report 可读取渲染报告中的 cues 列表（每项含画面事件时刻 t，可选声音起点 start），用于比对音频起音点。
有背景音乐时，用 --audio-stem 指向只含音效的分轨，起音检测才可靠。
"""
import argparse
import json
import subprocess
import sys
from array import array
from fractions import Fraction

PW, PH = 64, 36          # 分析用缩略尺寸
AR = 8000                # 分析用音频采样率
WIN = 40                 # 5 ms 窗口


def run(cmd, binary=False):
    r = subprocess.run(cmd, capture_output=True, text=not binary)
    return r


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path])
    if r.returncode:
        sys.exit(f"ffprobe 失败：{r.stderr}")
    return json.loads(r.stdout)


def gray_frames(path):
    r = run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={PW}:{PH},format=gray",
             "-f", "rawvideo", "-"], binary=True)
    data = r.stdout
    n = len(data) // (PW * PH)
    return [data[i * PW * PH:(i + 1) * PW * PH] for i in range(n)]


def stats(fr):
    n = len(fr)
    m = sum(fr) / n
    var = sum((x - m) ** 2 for x in fr) / n
    return m, var ** 0.5


def diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)


def envelope(path):
    """读取音频并计算 5 ms 窗口的峰值包络。"""
    r = run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:a:0", "-ac", "1", "-ar", str(AR),
             "-f", "s16le", "-"], binary=True)
    smp = array("h")
    smp.frombytes(r.stdout[: len(r.stdout) // 2 * 2])
    env = [max(abs(v) for v in smp[i:i + WIN]) for i in range(0, len(smp) - WIN, WIN)]
    return env, AR / WIN


def local_onset(env, rate, start, before=0.04, after=0.4):
    """在声音起点附近找起音：窗口内第一次超过局部峰值 20% 的位置。"""
    i0, i1 = max(0, int((start - before) * rate)), min(len(env), int((start + after) * rate))
    seg = env[i0:i1]
    if not seg or max(seg) < 200:          # 约 -44 dBFS 以下视为没有声音
        return None
    thr = 0.2 * max(seg)
    for k, v in enumerate(seg):
        if v >= thr:
            return (i0 + k) / rate
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--size", help="期望尺寸，如 1920x1080")
    ap.add_argument("--fps", type=float)
    ap.add_argument("--duration", type=float)
    ap.add_argument("--report", help="渲染报告 JSON（含 cues，可含 fps/duration/size）")
    ap.add_argument("--sheet", help="输出联系表 PNG 路径")
    ap.add_argument("--static-warn", type=float, default=2.5, help="最长静止超过该秒数时提示")
    ap.add_argument("--sync-tol", type=float, default=None, help="音画允许偏差（秒），默认两帧")
    ap.add_argument("--audio-stem", help="只含音效的音频分轨，用于起音检测；默认分析成片音轨")
    a = ap.parse_args()

    rep = json.load(open(a.report, encoding="utf-8")) if a.report else {}
    exp_size = a.size or ("x".join(map(str, rep["size"])) if "size" in rep else None)
    exp_fps = a.fps or rep.get("fps")
    exp_dur = a.duration or rep.get("duration")
    fails, notes = [], []
    res = {}

    info = probe(a.video)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    au = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        sys.exit("没有视频流")
    fps = float(Fraction(v["avg_frame_rate"]))
    dur = float(info["format"]["duration"])
    res["video"] = {"codec": v["codec_name"], "size": f"{v['width']}x{v['height']}", "fps": round(fps, 3),
                    "pix_fmt": v.get("pix_fmt"), "color": v.get("color_space"), "duration": round(dur, 3)}
    if au:
        res["audio"] = {"codec": au["codec_name"], "rate": au.get("sample_rate"), "channels": au.get("channels"),
                        "duration": round(float(au.get("duration", 0)), 3)}
    if exp_size and res["video"]["size"] != exp_size:
        fails.append(f"尺寸 {res['video']['size']} ≠ {exp_size}")
    if exp_fps and abs(fps - exp_fps) > 0.01:
        fails.append(f"帧率 {fps} ≠ {exp_fps}")

    dec = run(["ffmpeg", "-v", "error", "-i", a.video, "-f", "null", "-"])
    res["decode_errors"] = dec.stderr.strip().splitlines()
    if dec.returncode or res["decode_errors"]:
        fails.append("完整解码出现错误")

    frames = gray_frames(a.video)
    res["frames_decoded"] = len(frames)
    if exp_dur and exp_fps:
        want = int(round(exp_dur * exp_fps))
        res["frames_expected"] = want
        if len(frames) != want:
            fails.append(f"解码帧数 {len(frames)} ≠ 预期 {want}")
    if exp_dur and abs(dur - exp_dur) > 1.0 / (exp_fps or fps) + 0.03:
        fails.append(f"时长 {dur:.3f} 与预期 {exp_dur} 偏差过大")

    flat = [i for i, f in enumerate(frames) if stats(f)[1] < 1.5]
    res["flat_frames"] = len(flat)
    if flat:
        notes.append(f"纯色帧 {len(flat)} 个，首个在第 {flat[0]} 帧（片头片尾淡入淡出可能正常）")
    diffs = [diff(frames[i - 1], frames[i]) for i in range(1, len(frames))]
    run_len = best = 0
    for d in diffs:
        run_len = run_len + 1 if d < 0.3 else 0
        best = max(best, run_len)
    res["longest_static_s"] = round(best / fps, 3)
    if best / fps > a.static_warn:
        notes.append(f"最长静止 {best / fps:.2f} 秒，请人工确认是否有意为之")

    cues = rep.get("cues", [])
    if a.sync_tol is None:
        a.sync_tol = round(2.0 / fps, 4)   # 默认允许两帧：重叠的长音和起音缓慢的声音会让检测有一两帧误差
    res["sync_tol_s"] = a.sync_tol
    stem = a.audio_stem or rep.get("audio_stem")
    if au:
        env, rate = envelope(stem if stem else a.video)
        res["onset_source"] = stem or "成片音轨"
        if cues:
            errs = []
            for c in cues:
                start = c.get("start", c["t"])   # 声音起点；带同步点的音效 start 早于画面事件 t
                if c["t"] - start > 0.15:
                    # 铺垫类声音：同步点在中后段，检查能量峰值是否落在画面事件附近
                    i0, i1 = max(0, int((c["t"] - 0.3) * rate)), min(len(env), int((c["t"] + 0.15) * rate))
                    seg = env[i0:i1]
                    onset = (i0 + seg.index(max(seg))) / rate if seg and max(seg) >= 200 else None
                    e = None if onset is None else (0.0 if c["t"] - 0.3 <= onset <= c["t"] + a.sync_tol else round(abs(onset - c["t"]), 4))
                    fi = int(round(c["t"] * fps)); win = diffs[max(0, fi - 3):fi + 3]
                    errs.append({"t": c["t"], "start": start, "onset": None if onset is None else round(onset, 4), "kind": "铺垫峰值",
                                 "sync_error_s": e, "visual_change_near_cue": round(max(win), 2) if win else None})
                    continue
                onset = local_onset(env, rate, start)
                if onset is None:
                    e = None
                elif start - a.sync_tol <= onset <= c["t"] + a.sync_tol:
                    e = 0.0                      # 起音落在“声音起点到画面事件”之间，视为对齐
                else:
                    e = round(min(abs(onset - start), abs(onset - c["t"])), 4)
                fi = int(round(c["t"] * fps))
                win = diffs[max(0, fi - 3):fi + 3]
                errs.append({"t": c["t"], "start": start, "onset": None if onset is None else round(onset, 4),
                             "sync_error_s": e, "visual_change_near_cue": round(max(win), 2) if win else None})
            res["cue_check"] = errs
            missing = [x["t"] for x in errs if x["sync_error_s"] is None]
            worst = max([x["sync_error_s"] for x in errs if x["sync_error_s"] is not None] or [0])
            res["max_sync_error_s"] = worst
            if missing:
                fails.append(f"这些提示时刻附近没有检测到声音：{missing}")
            if worst > a.sync_tol:
                fails.append(f"音频起音与提示时间偏差 {worst} 秒，超过 {a.sync_tol}")
            quiet_cues = [x["t"] for x in errs if (x["visual_change_near_cue"] or 0) < 0.3]
            if quiet_cues:
                notes.append(f"这些提示时刻附近画面几乎无变化：{quiet_cues}")
    elif cues:
        fails.append("报告中有声音提示，但成片没有音轨")

    if a.sheet:
        n = 12
        r = run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vf",
                 f"fps={n}/{dur:.4f},scale=480:-2,tile=4x3:padding=6:margin=6:color=gray",
                 "-frames:v", "1", a.sheet])
        res["sheet"] = a.sheet if r.returncode == 0 else f"生成失败：{r.stderr.strip()}"

    res["fails"], res["notes"] = fails, notes
    print(json.dumps(res, ensure_ascii=False, indent=2))
    print("结论：" + ("通过" if not fails else "未通过"), file=sys.stderr)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
