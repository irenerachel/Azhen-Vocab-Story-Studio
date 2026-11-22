"""准备生词挑战网页的素材：压缩视频、截封面、把看图题的配图转成 webp、复制配音。
输入：成片 mp4；项目/web/quiz-data.json（看图题 type=pic 的词要在 picSrc 里写明用哪张抠图，例如 {"laundry": "C04"}）
输出：项目/web/story.mp4（1280 宽，超过 15 MB 会自动加大压缩）、img/poster.jpg、img/<词>.webp、audio/<句>.mp3
用法：~/.venvs/vocab-story/bin/python web_assets.py 项目目录 成片.mp4 [--poster-at 1.2]"""
import argparse, json, pathlib, re, shutil, subprocess, sys
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument("project"); ap.add_argument("video"); ap.add_argument("--poster-at", default="1.2")
a = ap.parse_args()
root = pathlib.Path(a.project).resolve(); web = root / "web"
d = json.loads((web / "quiz-data.json").read_text())
slug = lambda w: re.sub(r"[^a-z0-9]+", "-", w.lower()).strip("-")
(web / "img").mkdir(parents=True, exist_ok=True); (web / "audio").mkdir(exist_ok=True)
for crf in (27, 30, 33):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "112k", "-movflags", "+faststart", str(web / "story.mp4")], check=True)
    mb = (web / "story.mp4").stat().st_size / 1e6
    if mb <= 15: break
print(f"story.mp4 {mb:.1f} MB (crf {crf})")
if mb > 15: sys.exit("视频压到 crf 33 还超过 15 MB，发布会失败：缩短视频或手动降分辨率")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", a.poster_at, "-i", a.video, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", str(web / "img/poster.jpg")], check=True)
src = d.get("picSrc", {})
for w in d["words"]:
    if w["type"] != "pic": continue
    if w["w"] not in src: sys.exit(f"看图题 {w['w']} 没有在 picSrc 里指定配图")
    f = root / "assets/cut" / f"{src[w['w']]}.png"
    if not f.exists(): sys.exit(f"找不到 {f}")
    im = Image.open(f); im.thumbnail((520, 520)); im.save(web / "img" / f"{slug(w['w'])}.webp", "WEBP", quality=82)
for line in d["lines"]:
    f = root / "assets/voice" / f"{line}.mp3"
    if not f.exists(): sys.exit(f"找不到配音 {f}")
    shutil.copy(f, web / "audio" / f.name)
print("封面、", sum(w["type"] == "pic" for w in d["words"]), "张题图、", len(d["lines"]), "段配音已就位")
