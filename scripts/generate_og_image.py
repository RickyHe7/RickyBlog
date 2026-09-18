#!/usr/bin/env python3
"""
生成站点默认的社交分享图（OG Image）: public/og-default.png  (1200x630)

这是一个**可选的一次性工具**。产物已经提交到仓库，日常开发与构建
（npm run dev / npm run build）完全不需要 Python，也不需要 Pillow。

什么时候需要重跑：
  - 改了站名、副标题或口号
  - 想换配色

用法：
  python scripts/generate_og_image.py

依赖：Pillow（仅本脚本需要）
  pip install pillow
"""

from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630

# 秋叶配色（与 src/styles/global.css 的 @theme 保持一致）
PAPER = (251, 246, 238)
GINKGO = (232, 192, 90)
MAPLE = (226, 112, 31)
CRIMSON = (192, 57, 43)
BARK = (46, 33, 22)
BARK_SOFT = (122, 101, 82)

# 枫叶轮廓：与 src/components/MapleLeaf.astro 同源。
# 那边的 SVG 用的是二次贝塞尔曲线；Pillow 只能画多边形，所以这里是该曲线按
# 12 段/段采样后的点列（125 个点，肉眼已看不出折线）。改叶子形状时两处都要同步。
LEAF_POINTS = [
    (12.00, 0.60), (12.16, 1.05), (12.32, 1.54), (12.47, 2.08), (12.62, 2.66),
    (12.76, 3.29), (12.90, 3.96), (13.03, 4.68), (13.16, 5.44), (13.28, 6.25),
    (13.40, 7.10), (13.52, 8.00), (13.63, 8.95), (14.30, 8.54), (14.94, 8.17),
    (15.56, 7.82), (16.15, 7.50), (16.71, 7.20), (17.26, 6.94), (17.77, 6.70),
    (18.26, 6.49), (18.73, 6.30), (19.17, 6.15), (19.58, 6.02), (19.97, 5.92),
    (19.80, 6.28), (19.60, 6.66), (19.37, 7.07), (19.11, 7.50), (18.82, 7.94),
    (18.49, 8.41), (18.13, 8.89), (17.75, 9.40), (17.33, 9.93), (16.88, 10.48),
    (16.39, 11.04), (15.88, 11.63), (16.59, 11.87), (17.27, 12.11), (17.91, 12.35),
    (18.51, 12.58), (19.08, 12.81), (19.61, 13.04), (20.11, 13.27), (20.57, 13.49),
    (20.99, 13.71), (21.38, 13.94), (21.73, 14.15), (22.05, 14.37), (21.67, 14.70),
    (21.26, 15.01), (20.82, 15.31), (20.34, 15.58), (19.82, 15.84), (19.27, 16.09),
    (18.68, 16.31), (18.06, 16.52), (17.40, 16.71), (16.71, 16.89), (15.98, 17.05),
    (15.21, 17.19), (12.90, 19.40), (12.90, 23.40), (11.10, 23.40), (11.10, 19.40),
    (8.79, 17.19), (8.02, 17.05), (7.29, 16.89), (6.60, 16.71), (5.94, 16.52),
    (5.32, 16.31), (4.73, 16.09), (4.18, 15.84), (3.66, 15.58), (3.18, 15.31),
    (2.74, 15.01), (2.33, 14.70), (1.95, 14.37), (2.27, 14.15), (2.62, 13.94),
    (3.01, 13.71), (3.43, 13.49), (3.89, 13.27), (4.39, 13.04), (4.92, 12.81),
    (5.49, 12.58), (6.09, 12.35), (6.73, 12.11), (7.41, 11.87), (8.12, 11.63),
    (7.61, 11.04), (7.12, 10.48), (6.67, 9.93), (6.25, 9.40), (5.87, 8.89),
    (5.51, 8.41), (5.18, 7.94), (4.89, 7.50), (4.63, 7.07), (4.40, 6.66),
    (4.20, 6.28), (4.03, 5.92), (4.42, 6.02), (4.83, 6.15), (5.27, 6.30),
    (5.74, 6.49), (6.23, 6.70), (6.74, 6.94), (7.29, 7.20), (7.85, 7.50),
    (8.44, 7.82), (9.06, 8.17), (9.70, 8.54), (10.37, 8.95), (10.48, 8.00),
    (10.60, 7.10), (10.72, 6.25), (10.84, 5.44), (10.97, 4.68), (11.10, 3.96),
    (11.24, 3.29), (11.38, 2.66), (11.53, 2.08), (11.68, 1.54), (11.84, 1.05),
]

FONT_BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",      # 微软雅黑 Bold
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
]
FONT_REGULAR_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]


def load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    print("警告：没找到可用的中文字体，回退到 Pillow 默认字体（中文会变成方块）", file=sys.stderr)
    return ImageFont.load_default()


def vertical_gradient(size: tuple[int, int], top: tuple, bottom: tuple) -> Image.Image:
    """先画 1 像素宽的渐变再拉伸，比逐像素快得多。"""
    w, h = size
    strip = Image.new("RGB", (1, h))
    px = strip.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return strip.resize((w, h), Image.BICUBIC)


def soft_blob(size: tuple[int, int], center: tuple[int, int], radius: int,
              color: tuple, opacity: int) -> Image.Image:
    """一个带高斯模糊的圆形光斑，用来做氛围。"""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    draw.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        fill=(*color, opacity),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.45))


def leaf(size: int, color: tuple, opacity: int) -> Image.Image:
    """渲染一枚枫叶。"""
    scale = size / 24.0
    points = [(x * scale, y * scale) for x, y in LEAF_POINTS]
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(img).polygon(points, fill=(*color, opacity))
    return img


def paste_rotated(base: Image.Image, overlay: Image.Image, xy: tuple[int, int],
                  angle: float) -> None:
    rotated = overlay.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.alpha_composite(rotated, xy)


def main() -> int:
    canvas = vertical_gradient((W, H), PAPER, (250, 232, 208)).convert("RGBA")

    # 氛围光斑
    canvas.alpha_composite(soft_blob((W, H), (140, 60), 300, GINKGO, 95))
    canvas.alpha_composite(soft_blob((W, H), (1040, 120), 340, MAPLE, 80))
    canvas.alpha_composite(soft_blob((W, H), (880, 600), 300, CRIMSON, 46))

    # 右侧枫叶装饰。
    # 注意：rotate(expand=True) 会把画布撑大（方形旋转 14° 后 bbox 约 ×1.21），
    # 所以坐标要按放大后的尺寸留边，否则叶子会被画布边缘裁掉。
    paste_rotated(canvas, leaf(340, MAPLE, 40), (790, 150), -14)
    paste_rotated(canvas, leaf(160, CRIMSON, 52), (950, 385), 24)
    paste_rotated(canvas, leaf(110, GINKGO, 85), (690, 40), 40)

    draw = ImageDraw.Draw(canvas)

    font_title = load_font(FONT_BOLD_CANDIDATES, 96)
    font_tagline = load_font(FONT_BOLD_CANDIDATES, 42)
    font_sub = load_font(FONT_REGULAR_CANDIDATES, 28)
    font_meta = load_font(FONT_REGULAR_CANDIDATES, 24)

    left = 96
    draw.text((left, 176), "Ricky's Blog", font=font_title, fill=BARK)
    draw.text((left, 300), "艰难依然坚持", font=font_tagline, fill=(158, 70, 19))
    draw.text((left, 372), "小技巧 · 读书笔记 · 生活记录", font=font_sub, fill=BARK_SOFT)

    # 秋色渐变条
    bar_w, bar_h = 220, 6
    bar = Image.new("RGBA", (bar_w, bar_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    for x in range(bar_w):
        t = x / (bar_w - 1)
        if t < 0.5:
            tt = t / 0.5
            color = tuple(round(GINKGO[i] + (MAPLE[i] - GINKGO[i]) * tt) for i in range(3))
        else:
            tt = (t - 0.5) / 0.5
            color = tuple(round(MAPLE[i] + (CRIMSON[i] - MAPLE[i]) * tt) for i in range(3))
        bd.line([(x, 0), (x, bar_h)], fill=(*color, 255))
    canvas.alpha_composite(bar, (left, 448))

    draw.text((left, 500), "ricky7.he@qq.com   ·   github.com/RickyHe7", font=font_meta, fill=BARK_SOFT)

    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "public", "og-default.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    print(f"已生成: {out}  ({os.path.getsize(out) / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
