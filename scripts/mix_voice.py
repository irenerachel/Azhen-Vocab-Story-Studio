"""把英文配音按时间轴混进渲染器输出的“音乐+音效”混音，两遍 loudnorm 到 -14 LUFS，封装成片；同时导出双语 SRT（与成片同名）。
时间轴来自 export_timeline.mjs 写出的 项目/build/voice-timeline.json；配音文件路径相对项目目录。
用法：python3 mix_voice.py 项目目录 <渲染出的 mp4> <渲染出的 mix-page.wav> <输出 mp4>"""
import json, pathlib, subprocess, sys
ROOT = pathlib.Path(sys.argv[1]).resolve()
video, mix, out = sys.argv[2:5]
tl = json.loads((ROOT / "build/voice-timeline.json").read_text())
args = ["ffmpeg", "-v", "error", "-y", "-i", mix]
for v in tl["voice"]:
    args += ["-i", str(ROOT / v["file"])]
parts = []
for i, v in enumerate(tl["voice"], 1):
    parts.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=2.5dB,adelay={round(v['start']*1000)}:all=1[v{i}]")
n = len(tl["voice"])
parts.append("".join(f"[v{i}]" for i in range(1, n + 1)) + f"amix=inputs={n}:normalize=0[vo]")
parts.append("[0:a][vo]amix=inputs=2:normalize=0,atrim=0:%.3f[out]" % tl["duration"])
pre = ROOT / "build/mix-voice-pre.wav"
subprocess.run(args + ["-filter_complex", ";".join(parts), "-map", "[out]", str(pre)], check=True)
m = subprocess.run(["ffmpeg", "-i", str(pre), "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
fin = ROOT / "build/mix-voice.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pre), "-af",
  f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:linear=true,aresample=48000",
  str(fin)], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", str(fin), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
def ts(x):
    ms = round(x * 1000); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
srt = "\n".join(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['en']}\n{s['zh']}\n" for i, s in enumerate(tl["subs"], 1))
pathlib.Path(out).with_suffix(".srt").write_text(srt, encoding="utf-8")
print("完成", out)
