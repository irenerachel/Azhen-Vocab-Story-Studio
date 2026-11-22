"""把一张含两个角色的透明图拆成左右两个独立图层，方便分别缩放和动画；可顺手去掉画面顶部的小装饰（如插图自带的怒气烟）。
按连通块分配：每块的重心在分界线左边归左图，右边归右图。
用法：python3 split_sprite.py 输入.png 左.png 右.png [--split 0.58] [--drop-top 0.16]
  --split     分界线位置（占宽度的比例）
  --drop-top  重心在顶部这一比例内、且面积小于总面积 6% 的块会被删掉；设为 0 则保留
依赖：numpy、Pillow、scipy"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("left"); ap.add_argument("right")
ap.add_argument("--split", type=float, default=0.58); ap.add_argument("--drop-top", type=float, default=0.16)
a = ap.parse_args()
im = Image.open(a.src).convert("RGBA"); arr = np.asarray(im); alpha = arr[..., 3] > 20
H, W = alpha.shape
lab, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=2))
parts = [np.zeros_like(alpha), np.zeros_like(alpha)]
for i in range(1, n + 1):
    m = lab == i; ys, xs = np.nonzero(m); area = m.sum()
    if area < 0.002 * alpha.sum():
        continue
    if a.drop_top and ys.mean() < a.drop_top * H and area < 0.06 * alpha.sum():
        continue
    parts[0 if xs.mean() < a.split * W else 1] |= m
for m, path in zip(parts, (a.left, a.right)):
    out = arr.copy(); out[..., 3] = np.where(m, out[..., 3], 0)
    img = Image.fromarray(out, "RGBA"); img = img.crop(img.getchannel("A").getbbox()); img.save(path)
    print(path, img.size)
