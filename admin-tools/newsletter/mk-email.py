"""周周房市新報 寄信版（Brevo 用）— 周周 2026-11-22 定版：
① 本月主打 1 間 ② 精選 3 間 ③ 實用小知識 ④ 行情數字 ⑤ 周周一句話＋LINE ⑥ 翻頁看雜誌。
信件只能用 table＋inline style（Gmail／LINE 不跑 JS、不吃外部字型），圖一律用正式站絕對網址。
用法：python3 mk-email.py        → nl/周周房市新報-2026-11-email.html（貼進 Brevo）
      python3 mk-email.py art    → mail-art/email.html（Artifact 試看，圖改相對路徑）"""
import os, sys, shutil, json
MODE = sys.argv[1] if len(sys.argv) > 1 else "mail"
SP = os.environ.get("NL_OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))  # 預覽與寄信檔的輸出夾（不進網站）
REPO = "/home/user/chouchou-homepage/"
SITE = "https://chouchouinjapan.com/"
ISSUE = "2026-11"
LINE = "https://lin.ee/RscRWCp"
USED = []

def utm(path, content):
    return f"{SITE}{path}?utm_source=newsletter&utm_medium=email&utm_campaign={ISSUE}&utm_content={content}"
def img(pid, n):
    f = f"prop/prop-{pid}-{n}.webp"; USED.append(f)
    return f if MODE == "art" else SITE + f
def man(v):
    if v >= 10000:
        y, r = divmod(v, 10000)
        return f"{y}億{r:,}萬円" if r else f"{y}億円"
    return f"{v:,}萬円"

INK = "#3a2f27"; BROWN = "#4a3b30"; GOLD = "#9a7b4c"; RED = "#a3262f"; MUT = "#6f6256"; RULE = "#ddd2c2"; PAPER = "#fbf8f2"; DESK = "#efe9df"
SERIF = "'Noto Serif TC','Songti TC','PMingLiU',serif"
SANS = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',Arial,sans-serif"

HERO = dict(id="higashigaoka1-p2", n=16, kicker="本月主打｜新築一戶建", name="目黑區・東が丘 1 丁目",
    one="駒澤大學站徒步 13 分的低層住宅區，2 層樓、LDK 約 26 帖，附車庫、耐震等級 3。已經完工，可即時交屋。",
    price=24980, deal="売主（自社物件）")
PICKS = [
    dict(id="citytower-azabujuban2211", n=1, area="港區・麻布十番站 5 分", d="38 層制震塔樓 22 樓・東南向 1LDK 57.01㎡・全新翻新", price=21800, deal="仲介"),
    dict(id="nishishinagawa2-p5", n=2, area="品川區・西品川", d="新築一戶建・大崎站 12 分・LDK 約 26.8 帖・已完工", price=20480, deal="売主（自社物件）"),
    dict(id="greenpark-higashinihonbashi503", n=1, area="中央區・東日本橋站 1 分", d="東南角間 1LDK＋WIC 40.71㎡・2013 年築・全新翻新", price=8498, deal="仲介"),
]

def btn(href, label, bg=BROWN, fg="#ffffff"):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="{bg}" style="border-radius:999px;">'
            f'<a href="{href}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:{SANS};font-size:15px;font-weight:700;color:{fg};text-decoration:none;border-radius:999px;">{label}</a></td></tr></table>')

def section_title(en, zh):
    return (f'<tr><td style="padding:26px 28px 10px;"><div style="font-family:Georgia,serif;font-size:11px;letter-spacing:3px;color:{GOLD};">{en}</div>'
            f'<div style="font-family:{SERIF};font-size:20px;font-weight:700;color:{BROWN};padding-top:2px;">{zh}</div></td></tr>')

def pick(p):
    href = utm(f"prop-{p['id']}.html", p["id"])
    return f'''<tr><td style="padding:0 28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid {RULE};"><tr>
<td width="42%" valign="top" style="padding:0 0 14px;"><a href="{href}" target="_blank"><img src="{img(p['id'], p['n'])}" width="220" alt="{p['area']}" style="display:block;width:100%;max-width:220px;height:auto;border:0;"></a></td>
<td valign="top" style="padding:0 0 14px 14px;font-family:{SANS};">
<div style="font-family:{SERIF};font-size:16px;font-weight:700;color:{INK};line-height:1.4;">{p['area']}</div>
<div style="font-size:13px;color:{MUT};line-height:1.6;padding-top:3px;">{p['d']}</div>
<div style="font-family:{SERIF};font-size:19px;font-weight:700;color:{RED};padding-top:5px;">{man(p['price'])}<span style="font-family:{SANS};font-size:11px;font-weight:400;color:{MUT};">（含稅）</span></div>
<div style="font-size:11px;color:{MUT};padding-top:1px;">取引態様：{p['deal']}</div>
<div style="padding-top:6px;"><a href="{href}" target="_blank" style="font-size:13px;font-weight:700;color:{BROWN};">看照片與格局 →</a></div>
</td></tr></table></td></tr>'''

hero_href = utm(f"prop-{HERO['id']}.html", HERO["id"])
mag_href = utm(f"magazine-{ISSUE}.html", "magazine")
tax_href = utm("japan-property-tax-guide.html", "tip-tax")
all_href = utm("properties.html", "all")

BODY = f'''<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:{DESK};">本月主打：目黑區東が丘 新築一戶建，已完工可即時交屋。另有麻布十番、西品川、東日本橋精選 3 間。</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{DESK}" style="background:{DESK};"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="{PAPER}" style="width:100%;max-width:600px;background:{PAPER};border:1px solid {RULE};">

<tr><td align="center" style="padding:26px 28px 12px;">
<div style="font-family:Georgia,serif;font-size:10px;letter-spacing:4px;color:{GOLD};">THE TOKYO PROPERTY TIMES</div>
<div style="font-family:{SERIF};font-size:32px;font-weight:900;letter-spacing:6px;color:{BROWN};padding-top:4px;">周周房市新報</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1.5px solid {BROWN};border-bottom:1px solid {BROWN};margin-top:10px;"><tr>
<td style="font-family:{SANS};font-size:12px;color:{MUT};padding:5px 0;">2026 年 11 月號</td>
<td align="right" style="font-family:{SANS};font-size:12px;color:{MUT};padding:5px 0;">會員限定</td></tr></table>
</td></tr>

<tr><td style="padding:6px 28px 14px;font-family:{SANS};font-size:15px;line-height:1.8;color:{INK};">
{{{{ contact.FIRSTNAME | default : '' }}}} 你好，我是周周。<br>這個月挑了幾間「已經蓋好、翻新好，可以直接看」的房子給你。
</td></tr>

<tr><td style="padding:0 28px;"><a href="{hero_href}" target="_blank"><img src="{img(HERO['id'], HERO['n'])}" width="544" alt="東が丘 新築一戶建 客廳" style="display:block;width:100%;max-width:544px;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:14px 28px 4px;font-family:{SANS};">
<div style="font-family:Georgia,serif;font-size:11px;letter-spacing:2px;color:{GOLD};">{HERO['kicker']}</div>
<div style="font-family:{SERIF};font-size:24px;font-weight:900;color:{BROWN};padding-top:3px;">{HERO['name']}</div>
<div style="font-size:15px;line-height:1.8;color:{INK};padding-top:6px;">{HERO['one']}</div>
<div style="font-family:{SERIF};font-size:26px;font-weight:900;color:{RED};padding-top:8px;">{man(HERO['price'])}<span style="font-family:{SANS};font-size:12px;font-weight:400;color:{MUT};">（含稅）</span></div>
<div style="font-size:11px;color:{MUT};">取引態様：{HERO['deal']}</div>
</td></tr>
<tr><td style="padding:12px 28px 6px;">{btn(hero_href, "看照片與格局 →")}</td></tr>

{section_title("SELECTION", "周周精選 3 間")}
{"".join(pick(p) for p in PICKS)}
<tr><td align="right" style="padding:0 28px 6px;font-family:{SANS};"><a href="{all_href}" target="_blank" style="font-size:13px;font-weight:700;color:{BROWN};">看全部在售物件 →</a></td></tr>

{section_title("TIPS", "年底買房，固定資產稅誰繳？")}
<tr><td style="padding:0 28px 6px;font-family:{SANS};font-size:14.5px;line-height:1.85;color:{INK};">
日本的固定資產稅，是由<b>每年 1 月 1 日登記的所有人</b>繳整年份。所以年底前交屋，明年的稅單會寄到你手上；1 月初才交屋，稅單還是寄給賣方。<br>
實務上買賣雙方通常會在契約裡約定，依交屋日把當年度的稅「按日分攤」，不會有人多繳。具體怎麼算，交屋前我都會幫你核對清楚。<br>
<a href="{tax_href}" target="_blank" style="color:{BROWN};font-weight:700;">日本買房要繳哪些稅？一次看懂 →</a>
</td></tr>

{section_title("MARKET", "本月數字")}
<tr><td style="padding:0 28px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:3px double {BROWN};"><tr>
<td width="50%" valign="top" style="padding:12px 8px 4px 0;font-family:{SANS};"><div style="font-size:12px;font-weight:700;color:{INK};">Flat35 房貸利率</div><div style="font-family:{SERIF};font-size:26px;font-weight:900;color:{BROWN};">3.81%</div><div style="font-size:11px;color:{MUT};">2026 年 11 月最頻利率</div></td>
<td width="50%" valign="top" style="padding:12px 0 4px 8px;font-family:{SANS};"><div style="font-size:12px;font-weight:700;color:{INK};">日圓 → 台幣</div><div style="font-family:{SERIF};font-size:26px;font-weight:900;color:{BROWN};">0.2094</div><div style="font-size:11px;color:{MUT};">臺灣銀行即期賣出（11/9）</div></td>
</tr></table></td></tr>

<tr><td style="padding:22px 28px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1ebe0" style="background:#f1ebe0;border-left:4px solid {GOLD};"><tr><td style="padding:16px 18px;font-family:{SANS};">
<div style="font-family:{SERIF};font-size:17px;font-weight:700;color:{BROWN};">喜歡哪一間，傳個訊息給周周就好</div>
<div style="font-size:13.5px;line-height:1.7;color:{MUT};padding:4px 0 12px;">預算、想住的區告訴我，我從手上的物件幫你挑 3 間。在其他網站看到的物件，也可以直接貼給我。</div>
{btn(LINE, "加 LINE 問周周", bg="#06c755")}
</td></tr></table></td></tr>

<tr><td align="center" style="padding:16px 28px 22px;font-family:{SANS};">
<div style="font-size:13px;color:{MUT};padding-bottom:8px;">想看更多照片？這個月的完整版做成可以翻頁的電子雜誌</div>
{btn(mag_href, "翻頁看本月電子雜誌 →", bg="#ffffff", fg=BROWN).replace('bgcolor="#ffffff" style="border-radius:999px;"', 'bgcolor="#ffffff" style="border-radius:999px;border:1.5px solid ' + BROWN + ';"')}
</td></tr>

<tr><td style="padding:16px 28px 22px;border-top:1px solid {RULE};font-family:{SANS};font-size:11px;line-height:1.75;color:{MUT};">
<b style="font-family:{SERIF};font-size:12.5px;color:{BROWN};">周周・日本房仲</b>　株式会社アンドプラス 住宅営業部<br>
東京都渋谷区鶯谷町3-1 ＳＵビル301号｜宅地建物取引業 東京都知事(2)第102938号<br>
<a href="{SITE}" style="color:{MUT};">chouchouinjapan.com</a>｜<a href="{LINE}" style="color:{MUT};">LINE</a><br><br>
價格含稅，為 2026/11/22 時點，物件可能已售出或變動，以最新資料為準。照片為實景拍攝，家具為展示用、不含在售價內。
能不能貸款、可貸成數依銀行審查為準；稅額請由稅理士確認，登記與契約由司法書士・宅地建物取引士確認。<br><br>
這封信寄給在周周網站註冊會員、並同意收到電子報的你。不想再收到的話，可以<a href="{{{{ unsubscribe }}}}" style="color:{MUT};">按這裡取消訂閱</a>。
</td></tr>

</table></td></tr></table>'''

if MODE == "art":
    out = SP + "/mail-art/email.html"
    html = '<title>電子報寄信版 11 月號</title>\n<style>body{margin:0;background:' + DESK + '}</style>\n' + BODY.replace("{{ contact.FIRSTNAME | default : '' }}", '（會員名字）').replace('{{ unsubscribe }}', '#')
    os.makedirs(SP + "/mail-art/prop", exist_ok=True)
    for f in set(USED):
        shutil.copy(REPO + f, SP + "/mail-art/" + f)
    json.dump({f: f for f in sorted(set(USED))}, open(SP + "/mail-art/files.json", "w"))
else:
    out = SP + f"/周周房市新報-{ISSUE}-email.html"
    html = f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>周周房市新報 2026 年 11 月號</title></head><body style="margin:0;padding:0;background:{DESK};">{BODY}</body></html>'''
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write(html)
print("ok", out, len(set(USED)), "images")
