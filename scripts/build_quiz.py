"""用 quiz-template.html + quiz-data.json 生成生词挑战网页，并按页面实际用字截取寒蝉圆黑体（OFL）内嵌为 woff2。
生成前检查数据和素材文件，有问题直接报错并说明怎么改。

用法：~/.venvs/vocab-story/bin/python build_quiz.py web/quiz-data.json web/index.html [--local] [--no-file-check]
  --local          另存一份 _local.html（开头补了 charset 和 viewport，平台发布时会自动加，本地预览要自己加）；测完删掉，不要发布
  --no-file-check  素材还没准备好时先生成网页（默认会检查 story.mp4、封面、题图、配音都在输出目录里）
依赖：fonttools、brotli
素材由 web_assets.py 放到输出目录：story.mp4、img/poster.jpg、img/<词>.webp、audio/<句>.mp3"""
import argparse, base64, html, json, pathlib, re, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument("data"); ap.add_argument("out")
ap.add_argument("--template", default=str(HERE.parent / "assets/quiz-template.html"))
ap.add_argument("--fonts", default=str(HERE.parent / "assets/fonts/ChillRoundGothic"))
ap.add_argument("--local", action="store_true"); ap.add_argument("--no-file-check", action="store_true")
a = ap.parse_args()
out = pathlib.Path(a.out)

d = json.loads(pathlib.Path(a.data).read_text())
errs = []
need = ["slug", "title", "enTitle", "seconds", "footer", "lines", "words", "picHint", "constellation"]
miss = [k for k in need if k not in d]
if miss: sys.exit(f"quiz-data.json 缺少字段：{miss}")
slug = lambda w: re.sub(r"[^a-z0-9]+", "-", w.lower()).strip("-")
word_re = lambda w: re.compile(r"(?<![A-Za-z])" + re.escape(w) + r"(?![A-Za-z])", re.I)
words = d["words"]
if len(words) < 4: errs.append(f"只有 {len(words)} 个生词，每题要 4 个选项，至少需要 4 个生词")
seen = set()
for w in words:
    lost = [k for k in ("w", "pos", "m", "line", "type") if not w.get(k)]
    if lost: errs.append(f"生词 {w.get('w', '?')} 缺少字段 {lost}"); continue
    if w["w"].lower() in seen: errs.append(f"生词 {w['w']} 重复了")
    seen.add(w["w"].lower())
    if w["type"] not in ("pic", "mean", "fill"): errs.append(f"生词 {w['w']} 的题型 {w['type']} 无效，只能是 pic / mean / fill")
    if w["line"] not in d["lines"]: errs.append(f"生词 {w['w']} 引用的句子 {w['line']} 不存在"); continue
    if not word_re(w["w"]).search(d["lines"][w["line"]][0]): errs.append(f"生词 {w['w']} 没有出现在它引用的原句 {w['line']} 里（答完题要高亮原句里的这个词）")
    if w["type"] == "pic" and w["w"] not in d["picHint"]: errs.append(f"看图题 {w['w']} 缺少 picHint 提问")
if len({w.get("m") for w in words}) < min(4, len(words)): errs.append("中文释义重复太多，凑不出 4 个不同的选项")
slugs = [slug(w["w"]) for w in words if w.get("type") == "pic"]
if len(set(slugs)) != len(slugs): errs.append("有两道看图题的文件名相同（只有符号或大小写不同），改一下其中一个词的写法")
types = {w.get("type") for w in words}
if len(words) >= 6 and types != {"pic", "mean", "fill"}: errs.append(f"三种题型都要有，现在只有 {sorted(types)}")
if len(d["constellation"]["points"]) != len(words):
    errs.append(f"星位数 {len(d['constellation']['points'])} 与生词数 {len(words)} 不一致，用 constellation.py 按生词数重新取点")
if not a.no_file_check:
    files = ["story.mp4", "img/poster.jpg"] + [f"audio/{k}.mp3" for k in d["lines"]] + [f"img/{s}.webp" for s in slugs]
    gone = [f for f in files if not (out.parent / f).exists()]
    if gone: errs.append(f"输出目录里缺这些素材：{gone}（先运行 web_assets.py，或加 --no-file-check 暂时跳过）")
    elif (out.parent / "story.mp4").stat().st_size > 15e6: errs.append("story.mp4 超过 15 MB，发布会失败")
if errs: sys.exit("quiz-data.json 有问题：\n  - " + "\n  - ".join(errs))

s = pathlib.Path(a.template).read_text()
page_data = {k: v for k, v in d.items() if k != "picSrc"}
rep = {"__TITLE__": html.escape(d["title"]), "__EN_TITLE__": html.escape(d["enTitle"]), "__N__": str(len(words)),
       "__SECONDS__": str(round(d["seconds"])), "__FOOTER__": html.escape(d["footer"]),
       "__DATA_JSON__": json.dumps(page_data, ensure_ascii=False).replace("</", "<\\/")}
for k, v in rep.items(): s = s.replace(k, v)

# 按页面用字截取字体（不含字体数据本身）
body = s.replace("__FONT_MEDIUM__", "").replace("__FONT_BOLD__", "")
chars = set(body) | {chr(c) for c in range(32, 127)} | set("，。！？“”（）、：；·—…《》①②")
tmp = pathlib.Path(tempfile.mkdtemp())
(tmp / "chars.txt").write_text("".join(sorted(c for c in chars if c.isprintable())))
pyft = pathlib.Path(sys.executable).parent / "pyftsubset"
for w, key in (("Medium", "__FONT_MEDIUM__"), ("Bold", "__FONT_BOLD__")):
    f = tmp / f"{w}.woff2"
    subprocess.run([str(pyft) if pyft.exists() else "pyftsubset", str(pathlib.Path(a.fonts) / f"ChillRoundGothic_{w}.ttf"),
                    f"--text-file={tmp/'chars.txt'}", "--flavor=woff2", "--layout-features=*", "--name-IDs=*", "--name-legacy",
                    "--name-languages=*", f"--output-file={f}"], check=True)
    s = s.replace(key, base64.b64encode(f.read_bytes()).decode())
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(s)
print(f"生成 {out}：{len(words)} 题，{len(s)//1024} KB，截取 {len(chars)} 个字")
if a.local:
    loc = out.with_name("_local.html")
    loc.write_text('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + s)
    print(f"本地预览副本 {loc}：cd {out.parent} && python3 -m http.server 8765，打开 http://localhost:8765/_local.html；测完删掉")
