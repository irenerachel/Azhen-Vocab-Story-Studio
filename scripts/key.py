"""绿幕抠图：把纯绿底 (#00FF00) 的角色图抠成透明 PNG，裁到内容并限制最长边。
做法：按“绿色优势度” g - max(r,b) 求 alpha，软边过渡；去绿溢色；只保留与主体相连的大块，去掉零星噪点。
用法：python3 key.py 原图目录 输出目录 [文件名 ...]      （不给文件名时处理目录里所有 C*.png）
依赖：numpy、Pillow、scipy"""
import pathlib, sys
import numpy as np
from PIL import Image
from scipy import ndimage

MAXSIDE = 1400


def key(src: pathlib.Path, out_dir: pathlib.Path):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    dom = g - np.maximum(r, b)
    a = 1 - np.clip((dom - 40) / (110 - 40), 0, 1)      # dom<40 不透明，>110 全透明
    solid = a > 0.5
    lab, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.where(sizes >= max(sizes.max() * 0.004, 400))[0])
        a = a * ndimage.binary_dilation(keep, iterations=3)
    lim = np.maximum(r, b)
    g2 = np.where(g > lim, lim + (g - lim) * 0.15, g)  # 去溢色
    img = Image.fromarray(np.dstack([r, g2, b, a * 255]).clip(0, 255).astype(np.uint8), "RGBA")
    img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    s = MAXSIDE / max(img.size)
    if s < 1:
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    img.save(out_dir / src.name, optimize=True)
    print(f"{src.name}: {img.size}")


if __name__ == "__main__":
    raw, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    names = sys.argv[3:] or sorted(p.name for p in raw.glob("C*.png"))
    for nm in names:
        key(raw / nm, out)
