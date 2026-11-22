"""按 urls.txt（每行：名字 网址）下载 LibTV 生成的插图。B 开头当背景：按画幅转成 1920×1080 或 1080×1920 的 JPG（画幅读 page/aspect.txt，没有就按横版）；C 开头当透明元素：校验并保留原始 Alpha 通道。
已处理过的跳过，可以边出图边反复运行。
用法：python3 fetch_assets.py 项目目录          （读 项目/assets/urls.txt，写 assets/raw、assets/bg、assets/cut）
依赖：Pillow"""
import pathlib, sys, urllib.request, shutil
from PIL import Image



root = pathlib.Path(sys.argv[1]).resolve()
raw, bg, cut = root / "assets/raw", root / "assets/bg", root / "assets/cut"
asp = (root / "page/aspect.txt").read_text().strip() if (root / "page/aspect.txt").exists() else "16:9"
SIZE = {"16:9": (1920, 1080), "9:16": (1080, 1920)}[asp]
for d in (raw, bg, cut):
    d.mkdir(parents=True, exist_ok=True)
for line in (root / "assets/urls.txt").read_text().splitlines():
    if not line.strip() or line.startswith("#"):
        continue
    name, url = line.split()
    src = raw / f"{name}.png"
    if not src.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        src.write_bytes(urllib.request.urlopen(req, timeout=120).read())
        print("下载", name)
    if name.startswith("B") and not (bg / f"{name}.jpg").exists():
        from PIL import ImageOps
        ImageOps.fit(Image.open(src).convert("RGB"), SIZE, Image.LANCZOS).save(bg / f"{name}.jpg", quality=92)   # 比例不符时居中裁切，不拉伸
    elif name.startswith("C") and not (cut / f"{name}.png").exists():
        with Image.open(src) as img:
            if img.format != "PNG" or ("A" not in img.getbands() and "transparency" not in img.info):
                sys.exit(f"{name} 需要直接生成带透明通道的 PNG。")
            lo, hi = img.convert("RGBA").getchannel("A").getextrema()
            if lo != 0 or hi == 0:
                sys.exit(f"{name} 需要同时包含透明背景和可见主体，请重新生成。")
        shutil.copyfile(src, cut / f"{name}.png")
