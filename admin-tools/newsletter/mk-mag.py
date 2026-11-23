"""周周房市新報 電子雜誌版（翻頁）v2
周周 2026-11-22：「像電子書／雜誌，可以左右翻頁，圖要多，最多 4P」「一戶建 1 大、公寓 1 大、其他精選」
「有些圖被切掉了」→ 只用橫式照片、固定 3:2 框；「黑底看不清字」→ 全部淺色；「P1 跟 234 不同大小」→ 四頁同尺寸。
用法：python3 mk-mag.py site  → repo/magazine-2026-11.html（放根目錄，圖用 prop/ 乾淨原圖＋imgguard.js：看的時候沒浮水印，另存才是浮水印版）
      python3 mk-mag.py art   → scratchpad/mag-art/magazine.html（Artifact 試看版）"""
import os, sys
MODE = sys.argv[1] if len(sys.argv) > 1 else "site"
SITE = "https://chouchouinjapan.com/"
SP = os.environ.get("NL_OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))  # 預覽與寄信檔的輸出夾（不進網站）
if MODE == "site":
    OUT = "/home/user/chouchou-homepage/magazine-2026-11.html"; IMG = ""; LINKB = ""
else:
    OUT = SP + "/mag-art/magazine.html"; IMG = ""; LINKB = SITE
LINE = "https://lin.ee/RscRWCp"
USED = []

def man(v):
    if v >= 10000:
        y, r = divmod(v, 10000)
        return f"{y}億{r:,}萬円" if r else f"{y}億円"
    return f"{v:,}萬円"
def ph(pid, n):
    USED.append(f"prop/prop-{pid}-{n}.webp"); return f"{IMG}prop/prop-{pid}-{n}.webp"
def href(pid): return f"{LINKB}prop-{pid}.html"

HOUSE = dict(id="higashigaoka1-p2", kicker="HOUSE　一戶建", ward="目黑區", name="東が丘 1 丁目", sub="新築一戶建・已完工", hero=1, grid=[17, 18, 19, 21, 6, 5],
    one="駒澤大學站徒步 13 分的第一種低層住宅區，2 層樓、LDK 約 26 帖，附車庫、耐震等級 3。已經完工，看完喜歡就能談交屋時程。",
    facts=[("交通", "東急田園都市線「駒澤大學」站 徒步約 13 分"), ("面積", "土地 115.60㎡・建物 169.62㎡"), ("格局", "2 層樓・LDK 約 26.0 帖・附車庫"), ("交屋", "已完工・可即時交屋"), ("取引", "売主（自社物件）")],
    price=24980)
FLAT = dict(id="citytower-azabujuban2211", kicker="MANSION　公寓", ward="港區", name="麻布十番 22 樓", sub="塔樓公寓・全新翻新", hero=1, grid=[4, 7, 9, 2, 8, 10],
    one="麻布十番站徒步 5 分、地上 38 層制震塔樓的 22 樓東南向，LDK 約 16.5 帖。2025 年 12 月全新翻新完工，現況空屋、可即時交屋。",
    facts=[("交通", "大江戶線・南北線「麻布十番」站 徒步 5 分"), ("面積", "專有 57.01㎡・陽台 5.52㎡"), ("格局", "1LDK（LDK 約 16.5 帖＋洋室約 6 帖）"), ("屋齡", "2009 年築・全新翻新・可即時交屋"), ("取引", "仲介")],
    price=21800)
PICKS = [
    dict(id="nishishinagawa2-p5", n=2, area="品川・西品川", d="新築一戶建｜大崎站 12 分", price=20480, deal="売主"),
    dict(id="yutaka4-p3", n=2, area="品川・豐町", d="新築一戶建｜下神明站 6 分", price=18980, deal="売主"),
    dict(id="komaba1", n=2, area="目黑・駒場", d="新築一戶建｜駒場東大前站 2 分", price=33980, deal="売主"),
    dict(id="yokohamafronttower2112", n=1, area="橫濱・橫濱站 3 分", d="2023 年築 21 樓 2LDK｜天橋直通", price=14200, deal="仲介"),
    dict(id="clevia-hatchobori404", n=1, area="中央・八丁堀站 4 分", d="2019 年築 2LDK｜內廊下・LD 地暖", price=12800, deal="仲介"),
    dict(id="parkhouse-suginamitakaido424", n=1, area="杉並・高井戶站 5 分", d="頂樓東南向 2LDK 63.76㎡", price=9999, deal="仲介"),
    dict(id="lamerpalais-nishiogi301", n=1, area="杉並・西荻窪站 5 分", d="三面採光角間 3LDK 61.66㎡", price=9999, deal="仲介"),
    dict(id="greenpark-higashinihonbashi503", n=1, area="中央・東日本橋站 1 分", d="東南角間 1LDK＋WIC｜2013 年築", price=8498, deal="仲介"),
]
QUOTES = [("Flat35 房貸利率", "3.81%", "2026 年 11 月最頻利率"), ("日圓 → 台幣", "0.2100", "臺銀即期賣出 11/23"),
          ("港區 60〜80㎡", "2.79 億", "SUUMO 中古開價中位數"), ("足立區 60〜80㎡", "4,333 萬", "同上・23 區最低")]

CSS = """
/* 雜誌版：全部淺色（周周 11/22：黑底看不清字）。紙＝米白，外框＝淺灰米 */
:root{--ink:#3a2f27;--paper:#fbf8f2;--brown:#4a3b30;--gold:#9a7b4c;--red:#a3262f;--mut:#6f6256;--rule:#ddd2c2;--desk:#e9e3d8;--serif:'Noto Serif TC','Songti TC',serif;--sans:'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif;color-scheme:light}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--desk)}
body{font-family:var(--sans);color:var(--ink);overflow:hidden}
a{color:inherit;text-decoration:none}
img{display:block;width:100%;max-width:100%;object-fit:cover;object-position:center;background:#ece5d9}
.ph{aspect-ratio:3/2}
.top{height:50px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 max(14px,env(safe-area-inset-right,0px)) 0 max(14px,env(safe-area-inset-left,0px));color:var(--brown);font-size:13px;background:var(--paper);border-bottom:1px solid var(--rule)}
.top b{font-family:var(--serif);font-size:16px;letter-spacing:.1em}
.top .cnt{font-variant-numeric:tabular-nums;color:var(--mut)}
.top a.ln{background:#06c755;color:#fff;border-radius:999px;padding:7px 14px;font-weight:700}
.book{height:calc(100% - 50px - 60px);display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none}
.book::-webkit-scrollbar{display:none}
.pg{flex:0 0 100%;height:100%;scroll-snap-align:center;overflow-y:auto;display:flex;justify-content:center;align-items:flex-start;padding:18px 0 28px}
.sheet{width:100%;max-width:920px;background:var(--paper);justify-content:space-between;box-shadow:0 2px 14px rgba(74,59,48,.16);border:1px solid var(--rule);display:flex;flex-direction:column}
.nav{position:fixed;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:1px solid var(--rule);background:#fff;color:var(--brown);font-size:24px;line-height:1;cursor:pointer;z-index:9;box-shadow:0 2px 8px rgba(74,59,48,.18)}
.nav.l{left:max(10px,env(safe-area-inset-left,0px))}.nav.r{right:max(10px,env(safe-area-inset-right,0px))}.nav[disabled]{opacity:.3;cursor:default}
.nav:focus-visible,a:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.gold{font-family:Georgia,serif;font-size:11px;letter-spacing:.3em;color:var(--gold)}
.price{font-family:var(--serif);font-weight:900;color:var(--red)}
/* P1 封面 */
.cover{position:relative;flex:1;display:flex;flex-direction:column}
.mast{padding:30px 34px 18px;text-align:center}
.mast .t{font-family:var(--serif);font-weight:900;font-size:clamp(38px,7vw,62px);letter-spacing:.16em;line-height:1.05;color:var(--brown)}
.mast .i{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--mut);border-top:1.5px solid var(--brown);border-bottom:1px solid var(--brown);margin-top:12px;padding:5px 0}
.cimg{position:relative;margin:0 34px}
.cimg img{aspect-ratio:3/2}
.cimg .cap{position:absolute;left:0;bottom:0;background:rgba(251,248,242,.92);padding:8px 14px;font-family:var(--serif);font-size:14px;color:var(--brown)}
.toc{padding:18px 34px 6px}
.toc .rows{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:8px}
.toc a{display:block;border-left:2px solid var(--gold);padding-left:10px}
.toc small{display:block;font-family:Georgia,serif;font-size:10.5px;letter-spacing:.2em;color:var(--gold)}
.toc b{font-family:var(--serif);font-size:16px;line-height:1.35}
.toc .mk{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;padding-top:10px;border-top:1px solid var(--rule);font-size:12.5px;color:var(--mut)}
.toc .mk b{font-size:16px;color:var(--ink);margin-left:4px}
/* P2・P3 大特輯 */
.hd{display:grid;grid-template-columns:.8fr 1.7fr;align-items:stretch}
.lft{padding:26px 22px 18px 30px;display:flex;flex-direction:column;gap:14px}
.badge{display:inline-block;align-self:flex-start;border:1.5px solid var(--brown);color:var(--brown);font-family:var(--serif);font-weight:700;font-size:13px;letter-spacing:.12em;padding:5px 12px}
.cname{font-family:var(--serif);font-weight:900;font-size:30px;letter-spacing:.08em;color:var(--brown);line-height:1.25;text-wrap:balance}
.csub{font-size:12.5px;color:var(--mut);margin-top:4px;letter-spacing:.06em}
.lft .price{font-size:28px;line-height:1.2;margin-top:auto}
.lft .price small{display:block;font-family:var(--sans);font-size:11px;font-weight:400;color:var(--mut)}
.hero{aspect-ratio:3/2}
.one{font-family:var(--serif);font-size:15.5px;font-weight:700;padding:16px 30px 12px;line-height:1.75}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 30px}
.facts{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;padding:14px 30px 16px;flex-wrap:wrap}
.facts ul{list-style:none;font-size:13px;line-height:1.9}
.facts li span{display:inline-block;width:46px;color:var(--gold);font-weight:700}
.more{display:inline-block;border:1.5px solid var(--brown);color:var(--brown);font-weight:700;font-size:13.5px;padding:9px 18px;border-radius:999px}
.more:hover{background:var(--brown);color:#fbf8f2}
/* P4 精選 */
.picks{padding:24px 30px 0}
.picks h3{font-family:var(--serif);font-size:22px;color:var(--brown);margin:2px 0 4px}
.picks .lead{font-size:13px;color:var(--mut);margin-bottom:12px}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px 14px}
.pgrid .ph{aspect-ratio:4/3}
.pick{min-width:0}
.pick b{display:block;font-family:var(--serif);font-size:17px;margin-top:8px;line-height:1.35}
.pick i{display:block;font-style:normal;font-size:13px;color:var(--mut);line-height:1.6}
.pick .price{font-size:19px}
.deal{display:block;font-size:11px;color:var(--mut);margin-top:1px}
.all{text-align:right;margin-top:10px}.all a{font-weight:800;font-size:13px;color:var(--brown)}
.mkt{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 30px 0;padding-top:12px;border-top:3px double var(--brown)}
.mkt .q span{display:block;font-size:11.5px;font-weight:700}
.mkt .q b{font-family:var(--serif);font-size:24px;font-weight:900;color:var(--brown);line-height:1.2}
.mkt .q small{font-size:10.5px;color:var(--mut)}
.cta{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:18px 30px 0;padding:18px 20px;background:#f1ebe0;border:1px solid var(--rule);border-left:4px solid var(--gold)}
.cta b{font-family:var(--serif);font-size:19px;color:var(--brown)}
.cta p{font-size:13.5px;color:var(--mut);margin-top:3px}
.btn{display:inline-block;background:#06c755;color:#fff;font-weight:800;border-radius:999px;padding:11px 20px;white-space:nowrap}
.src{font-size:10px;color:var(--mut);line-height:1.6;margin:12px 30px 0}
.foot{padding:12px 30px 14px;font-size:10px;color:var(--mut);line-height:1.7;display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--rule)}
.foot b{font-family:var(--serif);font-size:12px;color:var(--brown)}
.sp{display:none}
/* 底部翻頁列：電腦用滑鼠點也能翻（周周 11/22） */
.pager{position:fixed;left:0;right:0;bottom:0;height:60px;display:flex;align-items:center;justify-content:center;gap:14px;background:var(--paper);border-top:1px solid var(--rule);padding:0 12px env(safe-area-inset-bottom,0px);z-index:10}
.pbtn{font:700 14px var(--sans);color:var(--brown);background:#fff;border:1.5px solid var(--brown);border-radius:999px;padding:9px 18px;cursor:pointer;white-space:nowrap}
.pbtn:hover:not([disabled]){background:var(--brown);color:#fbf8f2}
.pbtn[disabled]{opacity:.3;cursor:default}
.dots{display:flex;gap:6px}
.dot{font:700 12px var(--sans);width:30px;height:30px;border-radius:50%;border:1px solid var(--rule);background:#fff;color:var(--mut);cursor:pointer}
.dot[aria-current="true"]{background:var(--brown);border-color:var(--brown);color:#fbf8f2}
.pbtn:focus-visible,.dot:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.note{margin:16px 34px 0;padding:14px 18px;border:1px solid var(--rule);background:#f6f1e8;font-size:14px;line-height:1.85}
.note b{display:block;font-family:var(--serif);font-size:15px;color:var(--brown);margin-bottom:2px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 30px 0}
.steps div{border-top:2px solid var(--gold);padding-top:10px;font-size:14px;line-height:1.75}
.steps b{display:block;font-family:var(--serif);font-size:16px;color:var(--brown)}
@media(max-width:760px){
 .nav{display:none}
 .pager{gap:8px}.pbtn{padding:8px 12px;font-size:13px}.dot{width:26px;height:26px}
 .pg{padding:0}
 .sheet{border:none;box-shadow:none}
 .mast{padding:22px 16px 12px}.cimg{margin:0 16px}
 .note{margin:14px 16px 0}.steps{margin:14px 16px 0;grid-template-columns:1fr}
 .toc{padding:14px 16px 4px}.toc .rows{grid-template-columns:1fr;gap:10px}
 .hd{grid-template-columns:1fr}.hd>a{order:-1}
 .lft{padding:14px 16px 0;gap:8px}
 .cname{font-size:24px}.lft .price{font-size:24px;margin-top:4px}
 .one{padding:10px 16px;font-size:14.5px}
 .grid{padding:0 16px;gap:5px}
 .facts{padding:12px 16px 14px}
 .picks{padding:18px 16px 0}.pgrid{grid-template-columns:1fr 1fr;gap:14px 10px}.pgrid .ph{aspect-ratio:3/2}
 .pick b{font-size:15px}.pick i{font-size:12px}.pick .price{font-size:16px}
 .mkt{grid-template-columns:1fr 1fr;margin:14px 16px 0}
 .cta{margin:14px 16px 0;flex-direction:column;align-items:flex-start}
 .src{margin:10px 16px 0}
 .foot{padding:12px 16px;flex-direction:column}
}
"""

def foot(n):
    return (f'<div class="foot"><div><b>周周・日本房仲</b>　株式会社アンドプラス 住宅営業部<br>'
            f'宅地建物取引業 東京都知事(2)第102938号｜東京都渋谷区鶯谷町3-1 ＳＵビル301号<br>照片為實景拍攝，家具為展示用、不含在售價內。價格含稅（2026/11/22 時點）。能不能貸款、可貸成數依銀行審查為準。</div>'
            f'<div style="white-space:nowrap">2026 年 11 月號　P.{n}</div></div>')

def feat(c, n):
    imgs = "".join(f'<a href="{href(c["id"])}"><img class="ph" src="{ph(c["id"], k)}" alt="" loading="lazy"></a>' for k in c["grid"])
    facts = "".join(f"<li><span>{k}</span>{v}</li>" for k, v in c["facts"])
    return f'''<section class="pg" id="p{n}"><div class="sheet"><div class="hd">
<div class="lft"><div class="gold">{c["kicker"]}</div><span class="badge">周周推薦</span>
<div><div class="cname">{c["name"]}</div><div class="csub">東京都{c["ward"]}／{c["sub"]}</div></div>
<div class="price">{man(c["price"])}<small>含稅</small></div></div>
<a href="{href(c["id"])}"><img class="hero" src="{ph(c["id"], c["hero"])}" alt=""></a></div>
<p class="one">{c["one"]}</p>
<div class="grid">{imgs}</div>
<div class="facts"><ul>{facts}</ul><a class="more" href="{href(c["id"])}">看物件詳情 →</a></div>
<div class="sp"></div>{foot(n)}</div></section>'''

def p1():
    return f'''<section class="pg" id="p1"><div class="sheet"><div class="cover">
<div class="mast"><div class="gold">THE TOKYO PROPERTY TIMES</div><div class="t">周周房市新報</div>
<div class="i"><span>2026 年 11 月號｜第 1 期</span><span>會員限定・免費</span></div></div>
<div class="cimg"><a href="{href('higashigaoka1-p2')}"><img src="{ph('higashigaoka1-p2', 16)}" alt="東が丘 新築一戶建 LDK"></a><span class="cap">目黑區・東が丘 新築一戶建｜LDK 約 26 帖</span></div>
<div class="toc"><div class="gold">CONTENTS</div><div class="rows">
 <a href="#p2"><small>P.2　一戶建</small><b>目黑・東が丘 新築</b></a>
 <a href="#p3"><small>P.3　公寓</small><b>麻布十番 塔樓 22 樓</b></a>
 <a href="#p4"><small>P.4　精選</small><b>新築與翻新 8 間</b></a></div>
<div class="mk"><span>Flat35 房貸利率<b>3.81%</b></span><span>日圓→台幣<b>0.2100</b></span><span>港區 60〜80㎡ 中古開價<b>2.79 億</b></span></div></div>
<div class="note"><b>周周的話</b>這個月想讓大家看的，是「已經蓋好、可以直接看」的房子。東が丘、西品川、豐町、駒場四間一戶建都已完工，麻布十番和其他公寓也都翻新好、現況空屋。照片看喜歡，傳個 LINE 給我，我幫你排看屋。</div>
</div>{foot(1)}</div></section>'''

def p4():
    cards = "".join(f'<a class="pick" href="{href(p["id"])}"><img class="ph" src="{ph(p["id"], p["n"])}" alt="" loading="lazy"><b>{p["area"]}</b><i>{p["d"]}</i><span class="price">{man(p["price"])}</span><small class="deal">取引態様：{p["deal"]}</small></a>' for p in PICKS)
    qs = "".join(f'<div class="q"><span>{a}</span><b>{b}</b><small>{c}</small></div>' for a, b, c in QUOTES)
    return f'''<section class="pg" id="p4"><div class="sheet">
<div class="picks"><div class="gold">SELECTION</div><h3>周周精選｜新築一戶建與翻新公寓</h3>
<p class="lead">每一間都可以直接看屋，點照片看格局與更多照片。在其他網站看到的物件，也可以傳給我幫你看。</p>
<div class="pgrid">{cards}</div>
<div class="all"><a href="{LINKB}properties.html">看全部在售物件 →</a></div></div>
<div class="mkt">{qs}</div>
<div class="steps"><div><b>① 告訴我條件</b>LINE 傳預算、想住的區，或直接貼物件網址。</div><div><b>② 我幫你挑、排看屋</b>從手上的物件幫你篩，約好時間一起去看。</div><div><b>③ 一路中文陪你</b>貸款、契約、交屋，每一步我都會提醒你。</div></div>
<div class="cta"><div><b>喜歡哪一間，傳個訊息給周周就好</b><p>預算、想住的區告訴我，我從手上的物件幫你挑 3 間。</p></div><a class="btn" href="{LINE}" target="_blank" rel="noopener">加 LINE 問周周</a></div>
<p class="src">資料來源：住宅金融支援機構 Flat35（2026 年 11 月）／臺灣銀行牌告匯率（2026/11/23 07:51 掛牌）／SUUMO 中古マンション価格相場（2026/11/12 集計）。稅務請由稅理士確認，登記與契約由司法書士・宅地建物取引士確認。物件價格與狀態以最新資料為準。</p>
<div class="sp"></div>{foot(4)}</div></section>'''

JS = """
(function(){var b=document.getElementById('book'),ps=b.querySelectorAll('.pg'),ss=b.querySelectorAll('.sheet'),n=ps.length,c=document.getElementById('cnt'),L=document.getElementById('pv'),R=document.getElementById('nx');
/* 四頁同尺寸：以最高的那頁為準（周周 11/22：P1 跟 234 不同大小） */
function eq(){var m=0;ss.forEach(function(s){s.style.height='auto'});if(innerWidth<=760)return;ss.forEach(function(s){m=Math.max(m,s.offsetHeight)});ss.forEach(function(s){s.style.height=m+'px'});}
function cur(){return Math.round(b.scrollLeft/b.clientWidth)}
function go(i){i=Math.max(0,Math.min(n-1,i));b.scrollTo({left:i*b.clientWidth,behavior:'smooth'});ps[i].scrollTop=0;setTimeout(upd,450);}
var L2=document.getElementById('pv2'),R2=document.getElementById('nx2'),D=document.getElementById('dots'),ds=[];
for(var k=0;k<n;k++){(function(k){var d=document.createElement('button');d.className='dot';d.textContent=k+1;d.setAttribute('aria-label','第 '+(k+1)+' 頁');d.onclick=function(){go(k)};D.appendChild(d);ds.push(d);})(k)}
function upd(){var i=cur();c.textContent=(i+1)+' / '+n;L.disabled=L2.disabled=i===0;R.disabled=R2.disabled=i===n-1;ds.forEach(function(d,k){d.setAttribute('aria-current',k===i?'true':'false')});}
L.onclick=L2.onclick=function(){go(cur()-1)};R.onclick=R2.onclick=function(){go(cur()+1)};
b.addEventListener('scroll',function(){clearTimeout(b._t);b._t=setTimeout(upd,60)},{passive:true});
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')go(cur()+1);if(e.key==='ArrowLeft')go(cur()-1);});
document.querySelectorAll('a[href^="#p"]').forEach(function(a){a.onclick=function(e){e.preventDefault();go(+a.getAttribute('href').slice(2)-1)}});
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){var i=cur();eq();b.scrollLeft=i*b.clientWidth;},120)});
eq();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(eq);window.addEventListener('load',eq);upd();
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a&&typeof gtag==='function'){gtag('event','mag_click',{href:a.getAttribute('href'),page:cur()+1});}});
})();
"""

BODY = f'''<div class="top"><b>周周房市新報</b><span class="cnt" id="cnt">1 / 4</span><a class="ln" href="{LINE}" target="_blank" rel="noopener">加 LINE</a></div>
<button class="nav l" id="pv" aria-label="上一頁">‹</button><button class="nav r" id="nx" aria-label="下一頁">›</button>
<nav class="pager" aria-label="翻頁"><button class="pbtn" id="pv2">‹ 上一頁</button><span class="dots" id="dots"></span><button class="pbtn" id="nx2">下一頁 ›</button></nav>
<main class="book" id="book">{p1()}{feat(HOUSE, 2)}{feat(FLAT, 3)}{p4()}</main>
<script>{JS}</script>'''
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;800&family=Noto+Serif+TC:wght@700;900&display=swap" rel="stylesheet">'
if MODE == "site":
    html = f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>周周房市新報 2026 年 11 月號｜周周・日本房仲</title><meta name="robots" content="noindex">
<meta name="description" content="周周房市新報 2026 年 11 月號：周周推薦目黑區東が丘新築一戶建、麻布十番塔樓 22 樓，以及西品川、豐町、駒場、橫濱等本月精選 8 間，可以左右翻頁的電子雜誌。">
<meta property="og:type" content="article"><meta property="og:title" content="周周房市新報 2026 年 11 月號"><meta property="og:description" content="周周推薦：目黑區東が丘新築一戶建、麻布十番塔樓公寓，與本月精選 8 間。可以左右翻頁的電子雜誌。"><meta property="og:url" content="{SITE}magazine-2026-11.html"><meta property="og:image" content="{SITE}prop/prop-higashigaoka1-p2-16.webp"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">{FONTS}<style>{CSS}</style></head><body>{BODY}<script src="imgguard.js" defer></script></body></html>'''
else:
    html = f'''<title>周周房市新報 11 月號</title>
{FONTS}<style>{CSS}</style>
{BODY}'''
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write(html)
if MODE == "art":
    import json, shutil
    os.makedirs(SP + "/mag-art/prop", exist_ok=True)
    for f in sorted(set(USED)):
        shutil.copy("/home/user/chouchou-homepage/" + f, SP + "/mag-art/" + f)
    json.dump({f: f for f in sorted(set(USED))}, open(SP + "/mag-art/files.json", "w"))
print("ok", OUT, len(set(USED)), "images")
