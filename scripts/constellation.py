"""从一张透明底插图（故事的主线物件）提取外轮廓，沿轮廓按弧长均匀取 N 个点，作为“星座进度”的星位。
输出 JSON：{"name": 星座名, "aspect": 宽/高, "points": [[x, y], ...]}，坐标归一化到 0~1（以较长边为 1，保持原比例）。
用法：python3 constellation.py 物件.png N 输出.json [--name 玻璃鞋座] [--jitter 0.015]
依赖：numpy、Pillow、scikit-image"""
import argparse, json, math
import numpy as np
from PIL import Image
from skimage import measure

ap = argparse.ArgumentParser()
ap.add_argument("image"); ap.add_argument("n", type=int); ap.add_argument("out")
ap.add_argument("--name", default="")
ap.add_argument("--jitter", type=float, default=0.012, help="让星位略微错落，避免像描边；0 关闭")
a = ap.parse_args()

im = Image.open(a.image).convert("RGBA")
im.thumbnail((600, 600))
alpha = (np.asarray(im)[..., 3] > 40).astype(float)
alpha = np.pad(alpha, 2)
contours = measure.find_contours(alpha, 0.5)
c = max(contours, key=len)                      # 最长的那条就是外轮廓
c = measure.approximate_polygon(c, tolerance=1.5)
seg = np.r_[0, np.cumsum(np.hypot(*np.diff(c, axis=0).T))]
total = seg[-1]
pts = []
for k in range(a.n):
    d = total * k / a.n
    i = np.searchsorted(seg, d) - 1; i = max(0, min(i, len(c) - 2))
    t = (d - seg[i]) / max(1e-9, seg[i + 1] - seg[i])
    y, x = c[i] + (c[i + 1] - c[i]) * t
    pts.append([x, y])
pts = np.array(pts)
pts -= pts.min(axis=0)
span = pts.max(axis=0)
scale = span.max()
pts /= scale
rng = np.random.default_rng(7)
if a.jitter:
    pts += rng.normal(0, a.jitter, pts.shape)
# 从最左上的点开始，保持轮廓顺序
start = int(np.argmin(pts[:, 0] + pts[:, 1]))
pts = np.roll(pts, -start, axis=0)
out = {"name": a.name, "aspect": float(span[0] / span[1]), "points": [[round(float(x), 4), round(float(y), 4)] for x, y in pts]}
open(a.out, "w").write(json.dumps(out, ensure_ascii=False))
print(json.dumps(out, ensure_ascii=False))
