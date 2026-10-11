#!/usr/bin/env python3
"""自家圖片浮水印：右下角小字「周周・日本房仲」。
用法：python3 watermark.py            # 只處理還沒處理過的（新圖）
      python3 watermark.py --check    # 只列出尚未加浮水印的檔案
範圍：prop/ 全部（物件照片、間取圖、完成預想圖）。資訊圖／封面有文字排版到邊緣、Pexels 等外部圖不加。
已處理清單存在 watermark-done.json（檔名→處理後的 sha1），避免重複疊字。
未加浮水印的乾淨原檔仍在 git 歷史中，需要時可從歷史取回。"""
import sys, glob, json, hashlib, os
from PIL import Image, ImageDraw, ImageFont
TEXT = "周周・日本房仲"
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
MAN = "watermark-done.json"
def sha(p):
    return hashlib.sha1(open(p, "rb").read()).hexdigest()
def targets():
    fs = glob.glob("prop/*.webp")
    return sorted(set(fs))
def mark(path):
    im = Image.open(path)
    fmt = im.format
    im = im.convert("RGBA")
    W, H = im.size
    size = max(13, round(min(W, H * 1.6) * 0.034))
    font = ImageFont.truetype(FONT, size)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    bb = d.textbbox((0, 0), TEXT, font=font, stroke_width=max(1, size // 14))
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    m = max(8, round(W * 0.018))
    x, y = W - tw - m - bb[0], H - th - m - bb[1]
    # 底色亮（間取圖的白底）就用深色字，底色暗就用白字，兩種都看得清楚
    reg = im.convert("L").crop((max(0, int(x)), max(0, int(y)), min(W, int(x + tw)), min(H, int(y + th))))
    px = list(reg.get_flattened_data()) if hasattr(reg, "get_flattened_data") else list(reg.getdata())
    bright = (sum(px) / len(px)) > 150 if px else False
    fill, edge = ((40, 40, 40, 175), (255, 255, 255, 110)) if bright else ((255, 255, 255, 165), (0, 0, 0, 110))
    d.text((x, y), TEXT, font=font, fill=fill,
           stroke_width=max(1, size // 14), stroke_fill=edge)
    out = Image.alpha_composite(im, layer).convert("RGB")
    out.save(path, "WEBP", quality=86, method=4)
if __name__ == "__main__":
    man = json.load(open(MAN)) if os.path.exists(MAN) else {}
    todo = [p for p in targets() if man.get(p) != sha(p)]
    if "--check" in sys.argv:
        print("\n".join(todo) or "全部已處理"); sys.exit(0)
    for p in todo:
        mark(p); man[p] = sha(p)
    json.dump(man, open(MAN, "w"), ensure_ascii=False, indent=0)
    print("已加浮水印：", len(todo), "張")
