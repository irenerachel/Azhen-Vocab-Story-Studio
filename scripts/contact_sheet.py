"""抠图联系表 + 身高刻度：把 项目/assets/cut/ 下的透明图铺在洋红底上，每张画 5% 一格的刻度线。
用途一：看抠图有没有残留绿边、缺块；放大检查手持道具的结构（柄是否连续、两只手是否握在同一件东西上）。
用途二：量身高系数 FACT。读出主角色头顶所在的刻度 p（例如头顶在 7% 处，脚在 100%），
        这张图里人占的高度比例 = (脚刻度 - 头顶刻度) / 100；FACT = 该角色相对主角的身高 ÷ 这个比例。
用法：~/.venvs/vocab-story/bin/python contact_sheet.py 项目目录 [文件名 ...]     输出 项目/build/联系表-抠图.jpg"""
import pathlib, sys
from PIL import Image, ImageDraw

root = pathlib.Path(sys.argv[1]).resolve(); cut = root / "assets/cut"
files = [cut / n for n in sys.argv[2:]] or sorted(cut.glob("*.png"))
if not files: sys.exit(f"{cut} 里没有图")
TH, COLS, PAD = 460, 5, 14
tiles = []
for f in files:
    c = Image.open(f).convert("RGBA"); bg = Image.new("RGBA", c.size, (200, 60, 200, 255)); bg.alpha_composite(c)
    s = TH / bg.height; im = bg.convert("RGB").resize((max(1, round(bg.width * s)), TH), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for i in range(1, 20):
        y = round(TH * i / 20); major = i % 2 == 0
        d.line([(0, y), (im.width, y)], fill=(255, 255, 255) if major else (240, 190, 240), width=1)
        if major: d.text((3, y - 11), str(i * 5), fill=(255, 255, 255))
    d.rectangle([0, 0, 8 * len(f.stem) + 10, 16], fill=(0, 0, 0)); d.text((4, 2), f.stem, fill=(255, 255, 0))
    tiles.append(im)
rows = [tiles[i:i + COLS] for i in range(0, len(tiles), COLS)]
Wd = max(sum(t.width for t in r) + PAD * (len(r) + 1) for r in rows); Hd = len(rows) * (TH + PAD) + PAD
sheet = Image.new("RGB", (Wd, Hd), (30, 30, 30)); y = PAD
for r in rows:
    x = PAD
    for t in r: sheet.paste(t, (x, y)); x += t.width + PAD
    y += TH + PAD
out = root / "build/联系表-抠图.jpg"; out.parent.mkdir(exist_ok=True); sheet.save(out, quality=88)
print(f"{out}  {len(files)} 张")
