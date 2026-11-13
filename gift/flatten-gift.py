"""見面禮 PDF 轉成「圖片版」（2026-11-13 周周：手機打開 pdf 沒東西）
原因：Chromium 印 PDF 時，Google Fonts 的網頁字型會被嵌成 Type3 字型，
部分手機內建檢視器（Gmail／LINE 內建瀏覽器等）畫不出來 → 整頁空白。
做法：每頁轉成高解析圖片再組回 PDF（任何檢視器都看得到），並在 LINE 那行補上可點的連結。
用法：node gift/mk-gift.cjs 之後執行  python3 gift/flatten-gift.py
"""
import fitz, os
D = os.path.dirname(os.path.abspath(__file__))
for name in ["tokyo-buying-checklist.pdf", "tokyo-buying-checklist-cn.pdf"]:
    src = fitz.open(os.path.join(D, name))
    out = fitz.open()
    for pg in src:
        pix = pg.get_pixmap(dpi=170)
        np = out.new_page(width=pg.rect.width, height=pg.rect.height)
        np.insert_image(np.rect, stream=pix.tobytes("jpeg", jpg_quality=82))
        for r in pg.search_for("lin.ee/RscRWCp") + pg.search_for("@202dzwok"):
            np.insert_link({"kind": fitz.LINK_URI, "from": r + (-4, -4, 4, 4), "uri": "https://lin.ee/RscRWCp"})
        for r in pg.search_for("chouchouinjapan.com"):
            np.insert_link({"kind": fitz.LINK_URI, "from": r + (-2, -2, 2, 2), "uri": "https://chouchouinjapan.com/"})
    out.set_metadata({"title": "外國人在東京買房：從看屋到交屋 10 步清單", "author": "周周・日本房仲（株式会社アンドプラス）"})
    src.close()
    tmp = os.path.join(D, name + ".tmp")
    out.save(tmp, garbage=4, deflate=True); out.close()
    os.replace(tmp, os.path.join(D, name))
    print("ok", name, os.path.getsize(os.path.join(D, name)))
