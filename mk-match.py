# 買房定位分析頁面產生器（tokyo-home-match.html／-ja.html；-cn 由 build-cn 轉）。改文案改這裡，跑 python3 mk-match.py，再跑六支產生器。利率在 flat35-rate.js。
import json, re
R = '/home/user/chouchou-homepage/'
SLUG = 'tokyo-home-match'

CSS = r"""
.mhero{text-align:center;padding:30px 0 6px;position:relative}
.mhero .kick{display:inline-block;background:var(--rose-l);color:var(--rose-d);font-weight:700;font-size:13px;padding:5px 14px;border-radius:999px;margin-bottom:12px}
.mhero h1{font-size:30px;font-weight:900;line-height:1.35}.mhero h1 span{background:linear-gradient(90deg,#f43f5e,#f97316,#eab308);-webkit-background-clip:text;background-clip:text;color:transparent}
.mhero p{color:var(--mut);max-width:680px;margin:10px auto 0;font-size:15px}
.mhero .stars{position:absolute;inset:0;pointer-events:none;overflow:hidden}.mhero .stars i{position:absolute;width:6px;height:6px;border-radius:50%;background:#fbbf24;opacity:.0;animation:tw 3.2s infinite}
@keyframes tw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:.85;transform:scale(1)}}
.mform{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px;margin-top:18px;box-shadow:0 6px 24px rgba(0,0,0,.05)}
.mrow{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:14px 0;border-bottom:1px dashed #eee7e5}.mrow:last-of-type{border-bottom:0}
.mrow>label{font-weight:800;font-size:15px;line-height:1.5}.mrow>label small{display:block;font-weight:500;font-size:12px;color:var(--mut)}
.mbud{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mbud input{width:150px;border:1.5px solid var(--line);border-radius:12px;padding:9px 12px;font-size:16px;font-family:inherit}.mbud span{color:var(--mut);font-size:14px}
.mchips{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
.mc{border:1.5px solid var(--line);background:#fafaf9;color:#44403c;border-radius:999px;padding:6px 13px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
.mc:hover{border-color:#fda4af}.mc.on{background:var(--rose-d);border-color:var(--rose-d);color:#fff;box-shadow:0 3px 10px rgba(225,29,72,.25)}
.mz{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px}.mzl{font-size:12px;color:var(--mut);min-width:64px}
.madv{margin-top:6px}.madv summary{cursor:pointer;font-weight:700;color:var(--rose-d);font-size:14px;padding:8px 0}
.mact{display:flex;align-items:center;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.mgo{background:linear-gradient(135deg,#f43f5e,#f97316);color:#fff;border:0;border-radius:999px;padding:13px 34px;font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 8px 22px rgba(244,63,94,.35);animation:pulse 2.4s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.mreset{background:none;border:0;color:var(--mut);text-decoration:underline;cursor:pointer;font-family:inherit;font-size:13.5px}
#mCount{font-size:13px;color:var(--mut)}
#mOut{margin-top:22px;scroll-margin-top:72px}
.mload{text-align:center;padding:40px 0}.mload p{margin-top:16px;font-weight:700;color:#7c3aed}
.orb{width:92px;height:92px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#e9d5ff 35%,#a78bfa 70%,#6d28d9);box-shadow:0 0 40px rgba(167,139,250,.7);position:relative;animation:float 1.4s ease-in-out infinite}
.orb i{position:absolute;width:8px;height:8px;border-radius:50%;background:#fde68a;top:50%;left:50%;animation:orbit 1.5s linear infinite}.orb i:nth-child(2){animation-delay:-.5s;background:#fbcfe8}.orb i:nth-child(3){animation-delay:-1s;background:#a7f3d0}
@keyframes orbit{from{transform:rotate(0) translateX(62px)}to{transform:rotate(360deg) translateX(62px)}}@keyframes float{50%{transform:translateY(-8px)}}
.mhead{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px}.mhead span{font-size:13px;color:var(--mut)}.mhead b{background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:13.5px}
.msec{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:14px;box-shadow:0 3px 12px rgba(0,0,0,.04);opacity:0;transform:translateY(14px)}
.msec.in{animation:rise .55s forwards}@keyframes rise{to{opacity:1;transform:none}}
.msec h3{font-size:18px;font-weight:900;margin-bottom:4px}.msub{font-size:13.5px;color:var(--mut);line-height:1.75}.mnote{font-size:12.5px;color:var(--mut);margin-top:10px;line-height:1.7}
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:9px;margin-top:12px}
.mtile{border-radius:14px;padding:11px 13px;color:#1c1917;border:1px solid rgba(0,0,0,.04)}.mtile b{display:block;font-size:14.5px}.mtile .big{display:block;font-size:19px;font-weight:900;margin:2px 0}.mtile small{font-size:12px;opacity:.85}
.mtile.off{background:#f5f5f4;color:#a8a29e}
.z-core{background:#ffe4e6}.z-sub{background:#ffedd5}.z-south{background:#ede9fe}.z-east{background:#e0f2fe}.z-north{background:#dcfce7}
.mbars .bw i.z-core{background:#be123c}.mbars .bw i.z-sub{background:#ea580c}.mbars .bw i.z-south{background:#7c3aed}.mbars .bw i.z-east{background:#0284c7}.mbars .bw i.z-north{background:#059669}
.mzb{font-size:11.5px;font-weight:800;border-radius:999px;padding:2px 9px}
.mward{border-top:1px solid #f1eeec;padding-top:12px;margin-top:12px}.mward:first-of-type{border-top:0;margin-top:6px}
.mwh{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:8px}.mwh b{font-size:17px}.mkv{font-size:13px;color:#57534e}
.mtab{width:100%;border-collapse:collapse;font-size:14px}.mtab th,.mtab td{padding:8px 6px;border-bottom:1px solid #f1eeec;text-align:left}.mtab th{font-size:12.5px;color:var(--mut);font-weight:700}
.mtab .num{font-variant-numeric:tabular-nums;font-weight:700}.mtab .rng{font-weight:500;color:#57534e}.mtab tr.hl td{background:#fff7ed}.ok{color:#059669;font-weight:900}.ng{color:#d6d3d1}
.mst{margin-top:10px;font-size:13.5px;color:#44403c}.mst span{display:inline-block;background:#f5f5f4;border-radius:999px;padding:3px 10px;margin:4px 6px 0 0}
.mbars{display:grid;gap:5px;margin-top:10px}.mbar{display:grid;grid-template-columns:100px 1fr 96px;gap:8px;align-items:center;font-size:13.5px}.mbar.dim{opacity:.38}
.mbar .bw{background:#f5f5f4;border-radius:6px;height:14px;overflow:hidden}.mbar .bw i{display:block;height:100%;border-radius:6px}.mbar .v{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.mverdict{text-align:center;border-width:2px}.mvl{font-size:13px;color:var(--mut);font-weight:700;letter-spacing:2px}.mvt{font-size:32px;font-weight:900;margin:2px 0 6px}
.mverdict.v0{border-color:#86efac;background:linear-gradient(180deg,#f0fdf4,#fff)}.mverdict.v0 .mvt{color:#059669}
.mverdict.v1{border-color:#93c5fd;background:linear-gradient(180deg,#eff6ff,#fff)}.mverdict.v1 .mvt{color:#2563eb}
.mverdict.v2{border-color:#fcd34d;background:linear-gradient(180deg,#fffbeb,#fff)}.mverdict.v2 .mvt{color:#d97706}
.mverdict.v3{border-color:#fda4af;background:linear-gradient(180deg,#fff1f2,#fff)}.mverdict.v3 .mvt{color:#e11d48}
.mverdict p{font-size:14.5px;max-width:620px;margin:0 auto}
.mmeter{height:12px;background:#f1f5f9;border-radius:999px;max-width:420px;margin:14px auto 6px;overflow:hidden}.mmeter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#f43f5e,#f97316,#eab308,#22c55e);transition:width 1.2s}
.madj{text-align:left;max-width:560px;margin:10px auto 0;font-size:14px;line-height:1.85;padding-left:20px}
.mprops{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:12px}
.mprop{display:block;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;transition:transform .15s,box-shadow .15s}.mprop:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.08)}
.mprop img,.mprop .noimg{width:100%;height:150px;object-fit:cover;background:#fdf2f4;display:flex;align-items:center;justify-content:center;font-size:30px}
.mpb{padding:10px 12px 12px}.mpb b{display:block;font-size:14px;line-height:1.5}.mpb .pr{display:block;color:var(--rose-d);font-weight:900;font-size:16px;margin-top:4px}.mpb .mt{display:block;font-size:12.5px;color:var(--mut)}
.mpb .why.st{color:#c2410c;background:#fff7ed}.mpb .why.iv{color:#047857;background:#ecfdf5;margin-right:4px}
.mstick{position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(255,255,255,.97);border-top:1px solid #e7e5e4;box-shadow:0 -6px 20px rgba(0,0,0,.06);padding:10px 16px calc(10px + env(safe-area-inset-bottom));display:flex;gap:12px;align-items:center;justify-content:center;transform:translateY(120%);transition:transform .3s}
.mstick.on{transform:none}.mstick span{font-size:13.5px;color:#44403c;font-weight:700;line-height:1.4}.mstick button{background:#06c755;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-weight:800;font-size:14.5px;white-space:nowrap;cursor:pointer;font-family:inherit}
.mtab .num{white-space:nowrap}.mtab .rng{white-space:normal}.mtab td:first-child{white-space:nowrap}.mtab th:last-child{white-space:nowrap}
.mpb .why{display:inline-block;margin-top:6px;font-size:11.5px;font-weight:700;color:#7c3aed;background:#f5f3ff;border-radius:999px;padding:2px 9px}
.mfate{background:linear-gradient(135deg,#1e1b4b,#4c1d95 55%,#831843);border:0;color:#f5f3ff;perspective:1200px}
.mfcard{position:relative;min-height:220px;cursor:pointer}
.mff{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:opacity .6s,transform .8s;text-align:center}
.mff .mfs{font-size:46px;color:#fde68a;animation:spin 6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.mff b{font-size:22px}.mff small{opacity:.75}
.mfb{opacity:0;transform:rotateY(90deg);transition:opacity .6s .3s,transform .8s .2s}
.mfcard.open .mff{opacity:0;transform:rotateY(-90deg);pointer-events:none}.mfcard.open .mfb{opacity:1;transform:none}
.mfname{font-size:26px;font-weight:900;background:linear-gradient(90deg,#fde68a,#fbcfe8,#a7f3d0);-webkit-background-clip:text;background-clip:text;color:transparent;text-align:center;margin-bottom:4px}
.mfb>p{text-align:center;opacity:.9;font-size:14.5px}
.mfrow{display:grid;grid-template-columns:120px 1fr;gap:10px;margin-top:12px;background:rgba(255,255,255,.07);border-radius:12px;padding:10px 12px}.mfrow span{font-weight:800;color:#fde68a;font-size:14px}.mfrow p{font-size:14px;line-height:1.75}
.mfnote{font-size:12px;opacity:.65;text-align:center;margin-top:12px}
.mcta{text-align:center;background:linear-gradient(135deg,#f0fdf4,#ecfeff)}.mcta p{font-size:14.5px;color:#44403c;max-width:600px;margin:6px auto 0}
.mline{margin-top:14px;background:#06c755;color:#fff;border:0;border-radius:999px;padding:12px 28px;font-weight:900;font-size:16px;cursor:pointer;font-family:inherit;box-shadow:0 8px 20px rgba(6,199,85,.3)}
.mlinks{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}.mlinks a{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:13.5px;font-weight:700;color:var(--rose-d)}
.msrc{font-size:12px;color:var(--mut);line-height:1.8;margin:18px 0 40px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px}.msrc a{color:var(--rose-d)}
.mskip{text-align:center;font-size:13.5px;color:var(--mut);margin-top:12px}.mskip a{color:#06c755;font-weight:800}
.mlk{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-top:10px}.mlk a{display:flex;justify-content:space-between;align-items:center;border:1.5px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:10px 13px;font-size:14px}.mlk a span{color:#15803d;font-weight:800;font-size:12.5px}.mlk a:hover{background:#dcfce7}
.mconf{position:fixed;inset:0;pointer-events:none;z-index:500}
.mtile.maybe{opacity:.62;border:1.5px dashed rgba(0,0,0,.18)}
.mlow{text-align:center;background:linear-gradient(135deg,#fff7ed,#fff1f2)}.mlow p{font-size:14.5px;color:#44403c;max-width:620px;margin:6px auto 0;line-height:1.8}
a.mlinea{display:inline-block;color:#fff;text-decoration:none;margin-top:14px}
.mfx{display:block;font-size:11.5px;color:#78716c;font-weight:500;line-height:1.5}
.mtab .mfx{font-size:11px}#mBudgetFx{display:inline;margin-left:2px}
.mpb .mpm{display:block;font-size:12.5px;color:#0f766e;font-weight:700}
.mloan{border:1.5px dashed #fda4af;border-radius:14px;padding:2px 14px;margin:6px 0 2px;background:#fffafa}
.mloan .mrow{grid-template-columns:136px 1fr;padding:9px 0}
.mloanout{margin:6px 0 12px;padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#fff7ed,#fef2f2)}
.mlo-p{font-size:15.5px;font-weight:800}.mlo-p b{color:var(--rose-d);font-size:21px}.mlo-p .mfx{display:inline}
.mlo-s{font-size:13px;color:#57534e;margin-top:2px}
.mlo-b{margin-top:8px;background:var(--rose-d);color:#fff;border:0;border-radius:999px;padding:7px 16px;font-weight:800;cursor:pointer;font-family:inherit;font-size:14px}
.mlo-ok{display:inline-block;margin-top:8px;color:#059669;font-weight:800;font-size:13.5px}.mlo-hint{font-size:13.5px;color:var(--mut)}
.mloansec{background:linear-gradient(180deg,#fff7ed,#fff)}
.mlgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}
.mls{background:#fff;border:1px solid #fed7aa;border-radius:14px;padding:11px 13px}.mls>small{display:block;font-size:12px;color:var(--mut)}.mls b{display:block;font-size:20px;font-weight:900;color:#c2410c}
.mlnote{font-size:12.5px;color:#57534e;line-height:1.75;margin:12px 0 0;padding-left:18px}
.mlcta{margin-top:10px;font-size:14px;font-weight:700;color:#065f46;background:#ecfdf5;border-radius:12px;padding:10px 12px}
.mvm{margin-top:8px;font-size:14.5px;font-weight:800;color:#0f766e}.mvm .mfx{display:inline}
.mmap{width:100%;height:auto;max-height:760px;display:block;margin:10px auto 0}.mz.mzo .mc{border-style:dashed}
.mmp path{stroke:#fff;stroke-width:1.4;cursor:pointer}.mmsel path{fill:none;stroke:#7c3aed;stroke-width:3.4;stroke-linejoin:round;pointer-events:none}.mmhv{fill:none;stroke:#1c1917;stroke-width:2.8;stroke-linejoin:round;pointer-events:none}
.mmt text{font-size:15px;font-weight:800;fill:#1c1917;text-anchor:middle;dominant-baseline:middle;pointer-events:none;paint-order:stroke;stroke:rgba(255,255,255,.85);stroke-width:3px}
.mmleg{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:8px;font-size:12.5px}.mmleg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:4px;vertical-align:-1px}
.mminfo{text-align:center;margin-top:8px;font-size:14px;font-weight:700;color:#44403c;min-height:22px}
.mshare{text-align:center;margin-top:16px}.mshare button{background:linear-gradient(135deg,#fde68a,#fbcfe8);color:#4c1d95;border:0;border-radius:999px;padding:11px 24px;font-weight:900;font-size:15px;cursor:pointer;font-family:inherit;box-shadow:0 6px 18px rgba(0,0,0,.25)}
@media(max-width:640px){.mmap{width:calc(100% + 24px);max-width:none;margin:10px -12px 0}.mmt text{font-size:24px!important}.mz{margin-bottom:10px}.mzl{flex-basis:100%;min-width:0;margin-bottom:-2px}.mtab{font-size:12.5px}.mtab th,.mtab td{padding:7px 4px}.mtab th{font-size:11.5px}.mstick span{font-size:12.5px}.mlgrid{grid-template-columns:1fr 1fr}.mloan .mrow{grid-template-columns:1fr;gap:6px}.mmt text{font-size:20px}.mrow{grid-template-columns:1fr;gap:6px}.mhero h1{font-size:24px}.mbar{grid-template-columns:78px 1fr 84px;font-size:12.5px}.mfrow{grid-template-columns:1fr}.mvt{font-size:26px}}
"""

BODY = """<div class="wrap">
  <section class="mhero"><div class="stars">{stars}</div>
    <span class="kick">{kick}</span>
    <h1>{h1}</h1>
    <p>{lead}</p>
  </section>

  <div class="mform">
    <div class="mrow"><label>{lType}<small>{lTypeS}</small></label><div class="mchips" id="mType"></div></div>
    <div class="mrow"><label>{lUse}<small>{lUseS}</small></label><div class="mchips" id="mUse"></div></div>
    <div class="mrow"><label>{lBudget}<small>{lBudgetS}</small></label><div><div class="mbud"><input id="mBudget" inputmode="numeric" placeholder="{phBudget}"><span>{man}</span><small class="mfx" id="mBudgetFx"></small></div><div class="mchips" id="mBudgetQ"></div></div></div>
    <div class="mrow"><label>{lWard}<small>{lWardS}</small></label><div id="mWards"></div></div>
    <div class="mrow"><label>{lSize}<small id="mBandS">{lSizeS}</small></label><div class="mchips" id="mBand"></div></div>
    <div class="mrow" id="mAgeRow"><label>{lAge}<small>{lAgeS}</small></label><div class="mchips" id="mAge"></div></div>
    <details class="madv"><summary>{advSum}</summary>
      <div class="mrow"><label>{lPeople}</label><div class="mchips" id="mPeople"></div></div>
      <div class="mrow"><label>{lPet}</label><div class="mchips" id="mPet"></div></div>
    </details>
    <div class="mact"><button type="button" class="mgo" id="mGo"></button><span id="mCount"></span><button type="button" class="mreset" id="mReset">{reset}</button></div>
  </div>

  <p class="mskip">{skip} <a href="https://lin.ee/RscRWCp" target="_blank" rel="noopener">{skipA}</a></p>
  <div id="mOut"></div>
</div>
"""

STARS = ''.join('<i style="left:%d%%;top:%d%%;animation-delay:%.1fs"></i>' % (x, y, d) for x, y, d in [(8, 20, 0), (18, 70, 1.1), (30, 12, .6), (72, 18, 1.8), (85, 62, .3), (92, 28, 2.4), (60, 80, 1.4), (45, 8, 2.0)])

LINKS_TW = [["🗺️ 東京23區行情與地圖", "tokyo-area-guide.html"], ["🏠 看周周的在售物件", "properties.html"], ["💰 23區預算怎麼抓", "tokyo-23-wards-budget-guide.html"], ["🧾 買房要準備多少錢", "japan-property-purchase-costs.html"], ["🏦 房貸月付試算", "tool-loan.html"], ["✨ 買房人格測驗", "quiz.html"]]
LINKS_JA = [["🗺️ 東京23区エリアガイド", "tokyo-area-guide-ja.html"], ["🏠 物件情報を見る", "properties-ja.html"], ["💰 23区の予算の目安", "tokyo-23-wards-budget-guide-ja.html"], ["🧾 購入時の諸費用", "japan-property-purchase-costs-ja.html"], ["🏦 住宅ローン試算", "tool-loan-ja.html"]]

JA_NAMES = ['千代田', '中央', '港', '新宿', '文京', '台東', '墨田', '江東', '品川', '目黒', '大田', '世田谷', '渋谷', '中野', '杉並', '豊島', '北', '荒川', '板橋', '練馬', '足立', '葛飾', '江戸川']
TW_FIX = {'目黒': '目黑', '渋谷': '澀谷', '豊島': '豐島', '江戸川': '江戶川'}
CODES = [str(13101 + i) for i in range(23)]

TW = dict(
  lang="tw", sfx="", man="萬円", oku="億",
  wardNames={c: TW_FIX.get(n, n) + "區" for c, n in zip(CODES, JA_NAMES)},
  wardJa={c: n + "区" for c, n in zip(CODES, JA_NAMES)},
  zones={"core": "都心", "sub": "副都心", "south": "城南・城西", "east": "城東", "north": "城北"}, outerZone="23區以外", outerNames={"kng": "橫濱・川崎（神奈川）", "oth": "東京都下・埼玉・千葉", "kan": "大阪・京都"}, secOuter="📍 23區以外：周周手上的物件", secOuterSub="23 區以外的城市，行情差異很大，用平均數反而會誤導，所以這裡不做行情分析，直接列出周周手上符合你條件的物件。想找哪一帶，LINE 跟我說，我用實際成交行情幫你看。", outerNone="這一帶目前沒有公開中的物件，不過周周可以幫你找——LINE 告訴我想要的地點和預算就好。", sumOuter="23區以外：",
  bands=["約40㎡以下（1R〜1LDK）", "40〜60㎡（1LDK〜2LDK）", "60〜80㎡（2LDK〜3LDK）", "80〜100㎡（3LDK〜4LDK）", "100㎡以上（4LDK〜）"],
  bandShort=["〜40㎡", "40〜60㎡", "60〜80㎡", "80〜100㎡", "100㎡〜"],
  ages=["新築", "屋齡10年內", "屋齡20年內", "屋齡30年內", "屋齡不拘"],
  people=["1人", "2人", "3人", "4人以上"], pet=["有養／想養", "沒有"],
  budgetQuick=[1500, 2000, 3000, 5000, 8000, 10000, 15000, 20000],
  go="開始分析 🔮", goFull="打開我的買房命盤 ✨", filled="已填 {n}／4 項（不填也可以）", needOne="至少選一個條件，周周才知道從哪裡幫你看喔～",
  loading=["周周正在翻 23 區的行情…", "正在比對 23 區、5 種大小的中央值…", "水晶球轉一下，馬上好…"],
  yourInput="你的條件：",
  secBudget="💰 這個預算，在每一區大概買得到多大？", secBudgetSub="以 SUUMO 刊登{noun}的開價中央值來看，{b} 在各區「買得到的最大面積帶」。顏色＝五大區域。",
  medAt="中央值約 {m}", outOfReach="最小的面積帶也超出預算",
  secWard="📍 你選的區域行情（{noun}）", landLine="地價 {p}萬円/㎡（一年 +{c}%）", popLine="人口 {p}萬",
  thSize="大小", thMed="價格中央值", thRange="常見價格帶", thFit="預算內", fewData="資料太少",
  stationsIn="{band}・預算內比較好入手的車站：", stationsCheap="{band}・相對好入手的車站：",
  secSize="📏 想要「{band}」，各區要多少？", secSizeSub="23 區由低到高排序（SUUMO 刊登{noun}的開價中央值）。顏色＝五大區域。", sizeBudgetNote="顏色變淡的區＝中央值超過你的預算 {b}。",
  secAge="🏗️ 想要「{a}」", unitCase="件", ageNote="↑ 周周目前在售物件裡符合這個屋齡的件數與價格帶（依區域分）。",
  ageNone="目前在售物件裡沒有剛好符合的，加 LINE 跟我說，我幫你從其他管道找。",
  ageTips=["新築的好處是設備最新、保固完整、貸款條件通常最好談；代價是價格最高，而且一交屋就會有「新築溢價」消失的落差。",
           "屋齡10年內的公寓，設備還很新、管理制度也成熟，是自住族最熱門的區間，價格通常落在新築與一般中古之間。",
           "屋齡20年內是 CP 值甜蜜帶：價格比新築親民不少、多半有過一次大規模修繕，挑管理好的大樓就很穩。",
           "屋齡30年內選擇最多、總價最有彈性；重點是確認是不是新耐震（1981年6月以後的建築確認）、修繕基金存得夠不夠。",
           "不拘屋齡選擇最廣，預算可以換到更好的地段或更大的空間；周周會幫你把關耐震、管理與修繕狀況。"],
  vLabel="你 的 買 房 定 位", verdicts=["預算很有餘裕", "剛剛好，可以出手", "有點緊，但有機會", "需要調整條件"],
  verdictTxt=["{b} 想買 {band}，在你考慮的 {t} 個區裡有 {n} 區落在預算內，最寬裕的是 {w}。可以把標準拉高一點：更好的地段、更新的屋齡，或多留一點裝修與家具預算。",
              "{b} 想買 {band}，你考慮的 {t} 個區裡有 {n} 區剛好在預算附近，最有機會的是 {w}。這是很健康的定位，看到喜歡的就可以認真談了。",
              "{b} 想買 {band}，大部分區域的中央值比預算高一點，最接近的是 {w}。換個車站、放寬一點屋齡，或稍微縮小面積，機會就出來了。",
              "{b} 想買 {band}，在你考慮的區域裡目前還有一段差距（最接近的是 {w}）。別灰心，換區、換大小或換屋齡，都能找到適合你的組合——下面有建議。"],
  meter="你考慮的區域中，約 {p}% 的區在預算範圍內",
  adjust=["換到同一條線上再往外 2〜3 站的車站，價格常常差一截", "放寬屋齡（例如 20 年內 → 30 年內），同區同大小選擇會多很多", "大小降一級，或改看建築條件付土地／中古一戶建", "先抓房貸能借多少，預算的上限可能比你想的還高（能不能貸、可貸成數依銀行審查為準）"],
  secProps="🏠 周周的在售物件裡，最接近你條件的", secPropsSub="依預算、區域、大小、屋齡自動配對；同區、大小剛好但超出預算一點點的也會列出來——頭期款或價格都還有空間談，點進去看照片和周周的看法。", noProps="目前在售物件裡沒有剛好符合的，但周周手上還有很多沒公開的物件，加 LINE 跟我說你的條件就好。",
  whyBudget="預算內", whyBudgetNear="略超預算", whyStretch="再加 {d} 就買得到", uses=["自住", "投資收租"], sumUse="用途：", yieldTag="投資・表面約{y}", meterMaybe="中央值都比預算高一點，但有 {n} 個區有一部分物件落在預算內（下面有列出來）", stickyTxt="把這份結果傳給周周，幫你找物件", stickyBtn="💬 LINE 傳給周周", whyWard="你選的區", whySize="大小剛好", whyAge="屋齡符合", landTotal="（土地＋建物參考總額）", newBuild="新築", ageY="屋齡{y}年",
  fateTitle="你的買房命盤", fateTap="點一下翻開", fateLabel="",
  fateName={"core": "都心菁英格", "sub": "交通樞紐格", "south": "城南綠意格", "east": "下町人情格", "north": "務實安居格"},
  fateDesc={"core": "重視資產價值與地段稀缺性，你買的不只是房子，是東京的門面。", "sub": "效率至上，轉乘一次到哪都快，出租也好租，是攻守兼備的命格。", "south": "喜歡安靜、綠意與生活質感，住得舒服比什麼都重要。", "east": "愛熱鬧也愛人情味，CP 值與生活感兼顧，越住越有味道。", "north": "務實派代表，用合理的預算住進23區，生活機能一樣不打折。"},
  fsLabel="風水小提醒", fengshui={"core": "都心大樓多，挑採光面開闊、玄關不直對電梯的戶型，氣比較穩。", "sub": "交通樞紐車流大，選高一點的樓層、窗外有綠意或開闊視野，可以把熱鬧擋在外面。", "south": "城南坡道多，住在坡上視野好、採光足；客廳朝南或東南最旺。", "east": "下町離河川近，選擇地勢與防災條件好的物件，臥室避開正對大馬路。", "north": "城北住宅區安靜，客廳朝南、廚房保持明亮整潔，家運最穩。"},
  furnLabel="家具擺得下", furnTxt="{band} 大概擺得下：",
  furniture=["雙人床、2人座沙發、2人餐桌、工作桌一張。", "雙人床＋小書房、3人座沙發、4人餐桌，還有地方放跑步機。", "主臥＋兒童房、L型沙發、4〜6人餐桌、獨立書桌。", "主臥＋兩間小孩房、6人餐桌、大型L型沙發，招待朋友沒問題。", "每人一間房還有客房、鋼琴或家庭劇院、大型收納間。"],
  petLabel="毛孩", petYes="公寓要先確認管理規約「可養寵物（ペット可）」以及隻數、大小限制；一戶建自由度最高。挑物件時周周會先幫你問。", petNo="沒有寵物的話，選擇最廣，連「不可養寵物」的安靜大樓都可以考慮。",
  luckyLabel="幸運區", luckyTxt="這次的分析裡，和你最有緣的是 {w}——有空可以去附近散步，感受一下生活感。",
  fateNote="※ 命盤與風水是趣味參考，不是買房建議。真正的判斷還是要看物件本身，交給周周幫你把關。",
  ctaTitle="把分析結果傳給周周", ctaTxt="一鍵把你的條件和分析結果傳到周周的 LINE，我會用真實成交行情幫你再看一次，並推薦還沒公開的物件。全程中文、免費諮詢。",
  ctaBtn="💬 用 LINE 傳給周周", copied="分析結果已複製！接下來會打開周周的 LINE，貼上傳給我就可以了。",
  links=LINKS_TW,
  sources="📚 資料來源：中古公寓價格＝SUUMO 中古マンション価格相場（SUUMO 刊登物件的開價中央值，各站徒步15分內，{d} 擷取）；一戶建與土地＝SUUMO 新築／中古一戸建て・土地價格相場（同日擷取）；利率預設值＝住宅金融支援機構 Flat35 {ym}最頻金利（貸款比例9成以下）；匯率＝open.er-api.com 參考匯率；地價＝東京都財務局「令和8年地價公示」；人口＝東京都統計部「東京都的人口（推計）」2026年10月1日。開價不等於成交價，實際行情請以最新成交資料為準；能不能貸、可貸成數依個案與銀行審查為準；稅務請由稅理士確認。本分析為一般性參考，不構成投資建議。",
  secLinks="🔎 看看有哪些可以選擇", secLinksSub="依你的條件（預算、大小、屋齡）直接打開 SUUMO 的搜尋結果，看目前市面上有哪些{noun}。", linksBtn="在 SUUMO 看", linksNote="看到喜歡的，直接把網址用 LINE 傳給周周——我幫你聯絡、看屋、談價，全程中文，你不用自己跟日本仲介溝通。",
  sumHead="【買房定位分析】", sumBudget="預算：", sumWard="地區：", sumSize="大小：", sumAge="屋齡：", sumPeople="人數：", sumPet="寵物：", sumVerdict="結論：", notSet="未填",
)
TW.update(
  wardShort={c: TW_FIX.get(n, n) for c, n in zip(CODES, JA_NAMES)},
  typeNames={"ms": "公寓", "hnew": "新築一戶建", "hused": "中古一戶建", "land": "土地"},
  typeNoun={"ms": "中古公寓", "hnew": "新築一戶建", "hused": "中古一戶建", "land": "土地"},
  bandsT={"ms": TW["bands"], "hnew": ["約80㎡以下", "80〜100㎡", "100〜120㎡", "120㎡以上"], "hused": ["約80㎡以下", "80〜100㎡", "100〜120㎡", "120㎡以上"],
          "land": ["60㎡以下（約18坪以下）", "60〜80㎡（約18〜24坪）", "80〜100㎡（約24〜30坪）", "100〜120㎡（約30〜36坪）", "120㎡以上（約36坪〜）"]},
  shortT={"ms": TW["bandShort"], "hnew": ["〜80㎡", "80〜100㎡", "100〜120㎡", "120㎡〜"], "hused": ["〜80㎡", "80〜100㎡", "100〜120㎡", "120㎡〜"], "land": ["〜60㎡", "60〜80㎡", "80〜100㎡", "100〜120㎡", "120㎡〜"]},
  sizeSubT={"ms": "專有面積", "hnew": "建物面積", "hused": "建物面積", "land": "土地面積"},
  thSizeT={"ms": "大小", "hnew": "建物面積", "hused": "建物面積", "land": "土地面積"},
  secBudgetLand="💰 這個預算，在每一區買得到多大的土地？", secBudgetLandSub="用 SUUMO 土地行情的「坪單價」換算：{b} 在各區大概買得到幾坪（由便宜到貴排序）。",
  tsuboBig="約 {t} 坪", tsuboAt="坪單價約 {t}萬円・約 {m}㎡", tsuboAt2="坪單價 {t}萬", landAll="土地坪單價 {t}萬円/坪（{n}件）", thMedLand="估計總價", thRangeLand="坪單價",
  landNote="※ 土地的估計總價＝坪單價 × 該面積帶的代表面積，只是抓個大概；蓋房子還要另外準備建築費。想買地蓋房，周周可以幫你把「土地＋建築」一起抓預算。",
  fxTW="≈ 新台幣 {v} 萬", fxCN="≈ 人民幣 {v} 萬元",
  monthly="月付約 {m}", monthlyNote="※ 月付以「貸款 9 成・35 年・利率 {r}%」試算，只是參考。", monthlyNoteOwn="※ 月付依你填的自備款與年齡（{y} 年・利率 {r}%）試算，只是參考。",
  verdictMonthly="{b} 的物件 → {m}",
  rateDef=3.81, ymFmt="{y}年{m}月", rateLbl="預設＝Flat35 {ym}",
  loanNeedInc="填年收入（萬円）就會自動推算你買得起的總價。",
  loanTooOld="依 Flat35 基準要在 80 歲前還完，這個年齡能借的年數比較短；可以加 LINE 讓周周幫你看其他方式（例如多準備自備款、親子接力還款）。",
  loanNeedDown="住在海外／非永住的情況，銀行通常會要求一定比例的自備款——填一下自備款，才算得出來。",
  loanOut="推算買得起的總價約 <b>{p}</b>", loanOutSub="可借約 {l}・自備 {d}・月付約 {m}・{y} 年・利率 {r}%", loanApply="用這個當預算 →", loanApplied="✓ 已套用為預算",
  secLoan="🏦 你的買房力（試算）", secLoanSub="依你填的年收入、自備款與年齡推算的「大概上限」，不是銀行的核貸結果。",
  kPrice="推算總價上限", kLoan="可借金額", kMonthly="每月還款", kYears="還款年數", yearsU="{y} 年", rateU="利率 {r}%",
  loanAssume=["還款負擔率：年收 400 萬円以下抓 30%、400 萬円以上抓 35%（Flat35 的「總還款負擔率」基準）。",
              "還款期間：最長 35 年，而且要在 80 歲前還完（Flat35 基準）。",
              "利率 {r}%、全期固定試算（預設值＝Flat35 {ym}最多人適用的利率，貸款比例 9 成以下）。實際利率依銀行與方案而不同，可以改成你拿到的數字再算一次。",
              "購屋雜費抓物件價格約 7%（仲介費、登記、稅金、火災保險等，實際依物件而定）。"],
  loanRes1="非永住者：Flat35 需要永住資格，要改用一般銀行房貸；很多銀行會要求比較多的自備款，這裡以「最多貸 7〜8 成」試算（試算假設）。",
  loanRes2="住在海外：一樣可以買日本房，但貸款條件比較嚴格，通常要準備海外收入與資產證明，可貸成數常見約 6.5〜7 成，這裡就以「最多貸 6.5〜7 成」試算（試算假設）。",
  loanRangeNote="可貸成數抓一個範圍，所以總價也是範圍；按「用這個當預算」時會用比較保守的 {p} 來分析。",
  loanCapDown="目前的上限卡在「自備款」：多準備一點自備款，能買的總價就會往上。",
  loanCta="能不能貸、可貸成數依個案與銀行審查為準。每家銀行看法差很多——加 LINE，周周可以先幫你問過幾家，再決定怎麼出手。",
  mapTitle="🗺️ 23 區可負擔地圖", mapSub="用你的預算 {b} 和各區「{band}」的價格中央值比：越綠越寬裕，滑過或點一下看各區。",
  mapLeg=["很寬裕", "剛剛好", "有點緊", "差一段", "資料不足"], mapTip="{w}：{band} 中央值 {m}（是你預算的 {p}%）", mapTipLand="{w}：坪單價 {p}萬円 → 預算約買 {t} 坪",
  mapTipNA="{w}：這個條件的資料不足", mapHint="👆 滑過或點一下地圖上的區",
  shareBtn="📸 存成圖卡，分享到 IG／Threads", shareText="我的東京買房命盤出爐了！你也來測：", cardBrand="周周・日本房仲｜東京買房定位分析",
  cardBudget="預算", cardType="類型", cardWard="地區", cardSize="大小", cardVerdict="定位", cardLucky="幸運區", cardFoot="免費測測看，你的預算能買哪一區 👇",
  sumType="類型：", sumLoan="年收 {i}／自備 {d}／{a} 歲／{r}",
  res=["住日本・永住者", "住日本・非永住", "住在海外"], sai="歲",
)
TW.update(
  lowTitle="💬 1,000萬円以下，在東京 23 區比較難", lowTxt="以目前的行情來看，東京 23 區內 1,000萬円以下的公寓非常少，多半是很小的套房或屋齡很高的物件。建議把預算提高到 1,500萬円以上再試一次；或直接加 LINE 跟周周聊，我幫你看看有沒有適合的選擇。",
  lineBtn="💬 加 LINE 問周周", chanceAt="部分物件 {m} 起", chanceNote="淡色的區＝價格中央值超過預算，但有一部分物件落在你的預算內，值得一起找找看。",
  noResult="這個條件從行情數據裡比較難直接找到答案——加 LINE 告訴周周你的需求，我幫你一對一找。",
)
JA = dict(TW)
JA.update(
  lang="ja", sfx="-ja", man="万円", oku="億",
  wardNames={c: n + "区" for c, n in zip(CODES, JA_NAMES)},
  zones={"core": "都心", "sub": "副都心", "south": "城南・城西", "east": "城東", "north": "城北"}, outerZone="23区外", outerNames={"kng": "横浜・川崎（神奈川）", "oth": "東京都下・埼玉・千葉", "kan": "大阪・京都"}, secOuter="📍 23区外：周周の掲載物件", secOuterSub="23区外は市ごとに相場の差が大きく、平均値ではかえって誤解を招くため、相場診断は行わず、ご条件に合う掲載物件をご紹介しています。ご希望のエリアはLINEでお知らせください。実際の成約データをもとにお調べいたします。", outerNone="このエリアは現在公開中の物件がございません。ご希望の場所とご予算をLINEでお知らせいただければ、お探しいたします。", sumOuter="23区外：",
  bands=["約40㎡以下（1R〜1LDK）", "40〜60㎡（1LDK〜2LDK）", "60〜80㎡（2LDK〜3LDK）", "80〜100㎡（3LDK〜4LDK）", "100㎡以上（4LDK〜）"],
  ages=["新築", "築10年以内", "築20年以内", "築30年以内", "築年数こだわらない"],
  people=["1人", "2人", "3人", "4人以上"], pet=["飼っている／飼いたい", "なし"],
  go="診断スタート 🔮", goFull="住まい選びの「運命盤」を開く ✨", filled="入力 {n}／4 項目（未入力でも可）", needOne="条件をひとつ以上お選びください。",
  loading=["23区の相場を確認しています…", "23区×5つの広さの中央値を比較しています…", "水晶玉が回っています…"],
  yourInput="ご入力条件：",
  secBudget="💰 このご予算で、各区どのくらいの広さが狙える？", secBudgetSub="SUUMO掲載の中古マンション価格中央値から、{b} で各区で狙える最大の面積帯を表示しています。色は5大エリアです。",
  medAt="中央値 約{m}", outOfReach="最小の面積帯でも予算超過",
  secWard="📍 選択エリアの相場", landLine="地価 {p}万円/㎡（前年比 +{c}%）", popLine="人口 {p}万人",
  thSize="広さ", thMed="価格中央値", thRange="主な価格帯", thFit="予算内", fewData="データ僅少",
  stationsIn="{band}・ご予算内で狙いやすい駅：", stationsCheap="{band}・比較的手頃な駅：",
  secSize="📏 「{band}」を希望の場合、各区の相場は？", secSizeSub="23区を低い順に並べています（SUUMO掲載価格の中央値）。色は5大エリアです。", sizeBudgetNote="色が薄い区は、中央値がご予算 {b} を超えています。",
  secAge="🏗️ 「{a}」をご希望の場合", unitCase="件", ageNote="↑ 当サイト掲載中の物件のうち、この築年数に該当する件数と価格帯（エリア別）です。",
  ageNone="該当する掲載物件は現在ございません。LINEでご希望をお知らせいただければ、他のルートからもお探しいたします。",
  ageTips=["新築は最新設備と充実した保証、住宅ローン条件の組みやすさが魅力です。一方で価格は最も高く、入居後に「新築プレミアム」がはがれる点にご留意ください。",
           "築10年以内は設備がまだ新しく、管理体制も整っている人気のゾーン。価格は新築と一般的な中古の中間に位置することが多いです。",
           "築20年以内はコストパフォーマンスの良いゾーン。大規模修繕を一度経ていることも多く、管理の良い建物を選べば安心です。",
           "築30年以内は選択肢が最も多く、総額にも幅があります。新耐震基準（1981年6月以降の建築確認）と修繕積立金の状況を必ずご確認ください。",
           "築年数を問わなければ、ご予算をより良い立地や広さに振り向けられます。耐震性・管理・修繕状況は当方でしっかり確認いたします。"],
  vLabel="あ な た の 住 ま い 診 断", verdicts=["予算に余裕あり", "ちょうど良いバランス", "やや厳しいがチャンスあり", "条件の見直しがおすすめ"],
  verdictTxt=["{b} で {band} をご希望の場合、ご検討の {t} 区のうち {n} 区がご予算内です。最も余裕があるのは {w}。立地や築年数のグレードアップも狙えます。",
              "{b} で {band} をご希望の場合、ご検討の {t} 区のうち {n} 区がご予算前後です。最も狙いやすいのは {w}。気に入った物件があれば、ぜひ具体的にご検討ください。",
              "{b} で {band} をご希望の場合、多くの区で中央値がご予算をやや上回ります。最も近いのは {w}。駅や築年数、広さを少し調整すると選択肢が広がります。",
              "{b} で {band} をご希望の場合、ご検討エリアではまだ差があります（最も近いのは {w}）。エリア・広さ・築年数の組み合わせを変えれば、ぴったりの住まいが見つかります。"],
  meter="ご検討エリアのうち約 {p}% の区がご予算の範囲内です",
  adjust=["同じ路線で2〜3駅外側に広げると、価格が大きく変わることがあります", "築年数の条件を少し広げる（例：20年以内→30年以内）と、選択肢が増えます", "広さを一段階下げる、または建築条件付売地・中古戸建もご検討ください", "まずは借入可能額の確認を。ご予算の上限が想定より上がることもあります（融資可否・金額は金融機関の審査によります）"],
  secProps="🏠 掲載中の物件から、ご条件に近いもの", secPropsSub="ご予算・エリア・広さ・築年数から自動でマッチングしています。同じエリア・広さでご予算を少し上回る物件も、ご参考までに表示しています。", noProps="現在の掲載物件にはぴったりのものがございません。未公開物件もございますので、LINEでご条件をお知らせください。",
  whyBudget="予算内", whyBudgetNear="予算やや超", whyStretch="あと{d}でご検討可", uses=["ご自宅用", "投資用"], sumUse="ご用途：", yieldTag="投資用・表面約{y}", meterMaybe="中央値はご予算を上回りますが、{n}区ではご予算内の物件も一部ございます（下記参照）", stickyTxt="診断結果を周周にお送りいただけます", stickyBtn="💬 LINEで送る", whyWard="ご希望エリア", whySize="広さが合う", whyAge="築年数が合う", landTotal="（土地＋建物参考総額）", newBuild="新築", ageY="築{y}年",
  fateTitle="あなたの住まい運命盤", fateTap="タップして開く",
  fateName={"core": "都心エリート型", "sub": "交通ハブ型", "south": "城南グリーン型", "east": "下町ぬくもり型", "north": "堅実くらし型"},
  fateDesc={"core": "資産価値と立地の希少性を重視するタイプ。東京の「顔」となる住まいがお似合いです。", "sub": "効率重視。どこへでも一回の乗換えで行け、賃貸需要も強い攻守のバランス型です。", "south": "静けさと緑、暮らしの質を大切にするタイプ。住み心地を最優先に。", "east": "にぎわいと人情を愛するタイプ。コスパと生活感を両立できます。", "north": "堅実派。手頃な予算で23区に住み、生活利便性も妥協しません。"},
  fsLabel="風水ひとこと", fengshui={"core": "都心のマンションは、採光の良い開けた向きで、玄関がエレベーターと正対しない間取りが落ち着きます。", "sub": "交通量の多いエリアは、高めの階や緑・眺望の開けた窓辺で、にぎわいを和らげましょう。", "south": "坂の多い城南は、高台で眺望と日当たりを。リビングは南〜南東向きが吉。", "east": "川に近い下町は、地盤やハザードを確認し、寝室が大通りに面さない配置を。", "north": "静かな住宅地の城北は、南向きリビングと明るく整ったキッチンで家運安定。"},
  furnLabel="置ける家具", furnTxt="{band} なら目安として：",
  furniture=["ダブルベッド、2人掛けソファ、2人用ダイニング、デスク1台。", "ダブルベッド＋小さな書斎、3人掛けソファ、4人用ダイニング、ランニングマシンも。", "主寝室＋子ども部屋、L字ソファ、4〜6人用ダイニング、独立デスク。", "主寝室＋子ども部屋2室、6人用ダイニング、大型L字ソファでおもてなしも。", "家族一人ひと部屋に客間、ピアノやホームシアター、大型収納も。"],
  petLabel="ペット", petYes="マンションは管理規約の「ペット可」と頭数・大きさの制限を必ずご確認ください。戸建は自由度が高いです。物件ごとに当方で確認いたします。", petNo="ペットがいなければ選択肢は最も広く、「ペット不可」の静かな建物もご検討いただけます。",
  luckyLabel="ラッキーエリア", luckyTxt="今回の診断で最もご縁があるのは {w}。ぜひ周辺を散策して、街の雰囲気を感じてみてください。",
  fateNote="※ 運命盤・風水はお楽しみ要素です。物件の判断は、実際の物件内容をもとに当方がしっかりサポートいたします。",
  ctaTitle="診断結果を周周に送る", ctaTxt="ご条件と診断結果をワンタップでLINEに送信できます。最新の成約データをもとに改めて確認し、未公開物件もご紹介いたします。ご相談は無料です。",
  ctaBtn="💬 LINEで周周に送る", copied="診断結果をコピーしました。LINEが開きますので、貼り付けて送信してください。",
  links=LINKS_JA,
  sources="📚 データ出典：中古マンション価格＝SUUMO 中古マンション価格相場（SUUMO掲載物件の価格中央値、各駅徒歩15分以内、{d}取得）、地価＝東京都財務局「令和8年地価公示」、人口＝東京都総務局統計部「東京都の人口（推計）」令和8年10月1日現在。掲載価格は成約価格とは異なります。融資の可否・金額は金融機関の審査によります。税務は税理士にご確認ください。本診断は一般的な参考情報であり、投資助言ではありません。",
  secLinks="🔎 どんな選択肢がある？", secLinksSub="ご条件（予算・広さ・築年数）でSUUMOの検索結果を開き、現在販売中の中古マンションをご覧いただけます。", linksBtn="SUUMOで見る", linksNote="気になる物件があればURLをLINEでお送りください。ご案内・内見・条件交渉まで当方でサポートいたします。",
  sumHead="【住まい診断】", sumBudget="予算：", sumWard="エリア：", sumSize="広さ：", sumAge="築年数：", sumPeople="人数：", sumPet="ペット：", sumVerdict="診断：", notSet="未入力",
)

JA.update(
  wardShort={c: n for c, n in zip(CODES, JA_NAMES)},
  typeNames={"ms": "マンション", "hnew": "新築一戸建て", "hused": "中古一戸建て", "land": "土地"},
  typeNoun={"ms": "中古マンション", "hnew": "新築一戸建て", "hused": "中古一戸建て", "land": "土地"},
  bandsT={"ms": JA["bands"], "hnew": ["約80㎡以下", "80〜100㎡", "100〜120㎡", "120㎡以上"], "hused": ["約80㎡以下", "80〜100㎡", "100〜120㎡", "120㎡以上"],
          "land": ["60㎡未満（約18坪未満）", "60〜80㎡（約18〜24坪）", "80〜100㎡（約24〜30坪）", "100〜120㎡（約30〜36坪）", "120㎡以上（約36坪〜）"]},
  shortT={"ms": JA["bandShort"], "hnew": ["〜80㎡", "80〜100㎡", "100〜120㎡", "120㎡〜"], "hused": ["〜80㎡", "80〜100㎡", "100〜120㎡", "120㎡〜"], "land": ["〜60㎡", "60〜80㎡", "80〜100㎡", "100〜120㎡", "120㎡〜"]},
  sizeSubT={"ms": "専有面積", "hnew": "建物面積", "hused": "建物面積", "land": "土地面積"},
  thSizeT={"ms": "広さ", "hnew": "建物面積", "hused": "建物面積", "land": "土地面積"},
  secBudget="💰 このご予算で、各区どのくらいの広さが狙える？", secBudgetSub="SUUMO掲載の{noun}価格中央値から、{b} で各区で狙える最大の面積帯を表示しています。色は5大エリアです。",
  secWard="📍 選択エリアの相場（{noun}）", secSizeSub="23区を低い順に並べています（SUUMO掲載{noun}価格の中央値）。色は5大エリアです。",
  secLinksSub="ご条件（予算・広さ・築年数）でSUUMOの検索結果を開き、現在販売中の{noun}をご覧いただけます。",
  secBudgetLand="💰 このご予算で、各区どのくらいの土地が狙える？", secBudgetLandSub="SUUMO土地相場の坪単価から、{b} で各区で購入できる土地の広さの目安を表示しています（坪単価の安い順）。",
  tsuboBig="約{t}坪", tsuboAt="坪単価 約{t}万円・約{m}㎡", tsuboAt2="坪単価 {t}万", landAll="土地坪単価 {t}万円/坪（{n}件）", thMedLand="想定総額", thRangeLand="坪単価",
  landNote="※ 土地の想定総額は「坪単価×各面積帯の代表面積」による概算です。建物を建てる場合は別途建築費が必要です。土地＋建物の総予算も一緒に検討いたします。",
  monthly="月々約{m}", monthlyNote="※ 月々の返済額は「借入9割・35年・金利{r}%」での試算です。", monthlyNoteOwn="※ 月々の返済額はご入力の自己資金・年齢（{y}年・金利{r}%）による試算です。",
  verdictMonthly="{b} の物件なら → {m}",
  loanNeedInc="年収（万円）を入力すると、購入可能額の目安を自動で試算します。",
  loanTooOld="フラット35は完済時80歳までが基準のため、借入期間が短くなります。自己資金の積み増しや親子リレー返済など、LINEで個別にご相談ください。",
  loanNeedDown="海外在住・永住許可がない場合は、一定の自己資金を求められるのが一般的です。自己資金をご入力ください。",
  loanOut="購入可能額の目安：<b>{p}</b>", loanOutSub="借入 約{l}・自己資金 {d}・月々 約{m}・{y}年・金利{r}%", loanApply="この金額を予算に設定 →", loanApplied="✓ 予算に設定しました",
  secLoan="🏦 購入可能額の目安（試算）", secLoanSub="ご入力の年収・自己資金・年齢から算出した上限の目安です。金融機関の審査結果ではありません。",
  kPrice="購入可能額の目安", kLoan="借入可能額", kMonthly="月々の返済", kYears="返済期間", yearsU="{y}年", rateU="金利 {r}%",
  loanAssume=["返済負担率：年収400万円未満は30%、400万円以上は35%（フラット35の総返済負担率の基準）。",
              "返済期間：最長35年、かつ完済時80歳まで（フラット35の基準）。",
              "金利{r}%・全期間固定で試算（初期値はフラット35 {ym}の最頻金利、融資率9割以下）。実際の金利は金融機関・商品により異なります。",
              "諸費用は物件価格の約7%で概算（仲介手数料・登記費用・税金・火災保険など。物件により異なります）。"],
  loanRes1="永住許可なし：フラット35は永住許可が要件のため、民間金融機関の住宅ローンが前提です。自己資金を多めに求められることが多く、ここでは「借入は最大7〜8割」で試算しています（試算上の仮定）。",
  loanRes2="海外在住：購入は可能ですが融資条件は厳しく、海外の収入・資産の証明が必要になるのが一般的です。ここでは「借入は最大6.5〜7割」で試算しています（試算上の仮定）。",
  loanRangeNote="融資割合を幅で試算しているため、購入可能額も幅で表示しています。予算に設定する際は控えめな {p} を使用します。",
  loanCapDown="現在は自己資金が上限を決めています。自己資金を増やすと購入可能額が上がります。",
  loanCta="融資の可否・金額は金融機関の審査によります。金融機関ごとに判断が大きく異なるため、複数行への事前打診も当方でサポートいたします。",
  mapTitle="🗺️ 23区 購入しやすさマップ", mapSub="ご予算 {b} と各区の「{band}」価格中央値を比較しています。緑ほど余裕があります。各区にカーソルを合わせる／タップで詳細。",
  mapLeg=["余裕あり", "ちょうど良い", "やや厳しい", "差がある", "データ不足"], mapTip="{w}：{band} 中央値 {m}（ご予算の{p}%）", mapTipLand="{w}：坪単価 {p}万円 → ご予算で約{t}坪",
  mapTipNA="{w}：この条件のデータが不足しています", mapHint="👆 地図の区にカーソルを合わせる／タップ",
  shareBtn="📸 画像で保存してシェア", shareText="東京の住まい運命盤が出ました！あなたも診断：", cardBrand="周周・東京の住まい診断",
  cardBudget="予算", cardType="種別", cardWard="エリア", cardSize="広さ", cardVerdict="診断", cardLucky="ラッキー区", cardFoot="あなたのご予算で狙えるエリアを無料診断 👇",
  sumType="種別：", sumLoan="年収 {i}／自己資金 {d}／{a}歳／{r}",
  res=["日本在住・永住者", "日本在住・永住許可なし", "海外在住"], sai="歳",
  rateLbl="初期値＝フラット35 {ym}",
  sources="📚 データ出典：中古マンション価格＝SUUMO 中古マンション価格相場（SUUMO掲載物件の価格中央値、各駅徒歩15分以内、{d}取得）、戸建・土地＝SUUMO 新築／中古一戸建て・土地価格相場（同日取得）、金利初期値＝住宅金融支援機構 フラット35 {ym}最頻金利（融資率9割以下）、地価＝東京都財務局「令和8年地価公示」、人口＝東京都総務局統計部「東京都の人口（推計）」令和8年10月1日現在。掲載価格は成約価格とは異なります。融資の可否・金額は金融機関の審査によります。税務は税理士にご確認ください。本診断は一般的な参考情報であり、投資助言ではありません。",
)

JA.update(
  lowTitle="💬 1,000万円以下は、東京23区内では難しい状況です", lowTxt="現在の相場では、東京23区内で1,000万円以下の物件は非常に少なく、多くはコンパクトなお部屋や築年数の古い物件です。ご予算を1,500万円以上に設定して再度お試しいただくか、LINEで直接ご相談ください。ご希望に合う選択肢をお探しいたします。",
  lineBtn="💬 LINEで相談する", chanceAt="一部の物件は{m}から", chanceNote="色の薄い区は、価格中央値はご予算を超えますが、ご予算内の物件も一部ございます。",
  noResult="このご条件は相場データだけでは判断が難しいため、LINEでご希望をお知らせください。個別にお探しいたします。",
)

PAGE = {
 'tw': dict(src='tokyo-area-guide.html', out=SLUG + '.html',
   title='東京買房定位分析｜你的預算能買哪一區、多大的房子？｜周周・日本房仲',
   desc='輸入預算、地區、大小或屋齡，任填一項就能分析：這個預算在東京23區各區買得到多大、各區行情中央值，並自動配對周周的在售物件；全部填寫還有趣味的「買房命盤」。資料來自SUUMO相場與官方地價公示。',
   ogt='東京買房定位分析｜周周・日本房仲',
   kick='🔮 免費・買房定位分析', h1='我的預算，在東京能買<span>什麼樣的房子</span>？',
   lead='預算、地區、大小、屋齡——<b>任填一項</b>就能開始分析；公寓、一戶建、土地都可以。全部填寫，還能打開你的「買房命盤」。用 SUUMO 相場與官方地價公示做底，再幫你從周周的在售物件裡配對。',
   lType='🏠 想買什麼', lTypeS='不選＝用公寓行情分析', lUse='🎯 用途', lUseS='自住還是投資收租？可不選', loanSum='💴 不知道預算多少？用年收入幫你推算 →', lInc='💴 年收入', lIncS='稅前・夫妻可合計', phInc='例如 800', lDown='👛 自備款', lDownS='能拿出來的現金', phDown='例如 1000', lAgeP='🎂 年齡', phAgeP='例如 35', lRes='🛂 身分', lRate='📈 試算利率', lRateS='預設＝Flat35 當月利率', lBudget='💰 預算', lBudgetS='總價（萬円）', phBudget='例如 8000', lWard='📍 地區', lWardS='可複選', lSize='📏 大小', lSizeS='專有面積', lAge='🏗️ 屋齡', lAgeS='', advSum='＋ 進階（趣味命盤用，可不填）', lPeople='👨‍👩‍👧 幾個人住', lPet='🐾 毛孩', reset='全部清除', skip='不想填表？', skipA='直接加 LINE 問周周 →', T=TW),
 'ja': dict(src='tokyo-area-guide-ja.html', out=SLUG + '-ja.html',
   title='東京の住まい診断｜ご予算で狙える区と広さがわかる｜周周・日本の不動産',
   desc='ご予算・エリア・広さ・築年数のいずれか一つから診断できます。東京23区各区で狙える広さや相場の中央値を表示し、掲載中の物件から自動でマッチング。すべて入力すると「住まい運命盤」も。SUUMO相場と公的な地価公示をもとにしています。',
   ogt='東京の住まい診断｜周周・日本の不動産',
   kick='🔮 無料・住まい診断', h1='このご予算で、東京で<span>どんな住まい</span>が狙える？',
   lead='ご予算・エリア・広さ・築年数——<b>どれか一つ</b>から診断できます。マンション・一戸建て・土地に対応しています。すべて入力すると「住まい運命盤」も。SUUMO相場と地価公示をもとに、掲載物件からもマッチングいたします。',
   lType='🏠 種別', lTypeS='未選択はマンション相場で診断', lUse='🎯 ご用途', lUseS='ご自宅用・投資用（任意）', loanSum='💴 ご予算が分からない方は、年収から試算 →', lInc='💴 年収', lIncS='税込・ご夫婦合算可', phInc='例：800', lDown='👛 自己資金', lDownS='頭金に充てられる現金', phDown='例：1000', lAgeP='🎂 年齢', phAgeP='例：35', lRes='🛂 お立場', lRate='📈 試算金利', lRateS='初期値＝フラット35 当月金利', lBudget='💰 ご予算', lBudgetS='総額（万円）', phBudget='例：8000', lWard='📍 エリア', lWardS='複数選択可', lSize='📏 広さ', lSizeS='専有面積', lAge='🏗️ 築年数', lAgeS='', advSum='＋ 詳細（運命盤用・任意）', lPeople='👨‍👩‍👧 ご家族の人数', lPet='🐾 ペット', reset='すべてクリア', skip='入力が面倒な方は', skipA='LINEで直接ご相談ください →', T=JA),
}

for lang, P in PAGE.items():
    s = open(R + P['src'], encoding='utf-8').read()
    head = s[:s.index('<style>')]
    head = head.replace('tokyo-area-guide', SLUG)
    head = head.replace('img/og-area-guide', 'img/og-home-match')   # 分享預覽圖（2026-11-13）
    head = re.sub(r'<title>[^<]*</title>', '<title>' + P['title'] + '</title>', head, count=1)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + P['desc'] + '">', head, count=1)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + P['ogt'] + '">', head, count=1)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="' + P['desc'] + '">', head, count=1)
    head = head.replace('<meta property="og:type" content="article">', '<meta property="og:type" content="website">')
    head = '<!-- 周周・東京買房定位分析（match.js＋souba.js＋wards-data.js＋properties.js）。由 scratchpad 的 mk_match.py 產生的手寫頁；文字在 window.MATCH_T。 -->\n' + head[head.index('-->') + 4:]
    style = s[s.index('<style>'):s.index('</style>')] + CSS + '</style>'
    hdr = s[s.index('<header>'):s.index('</header>') + 9]
    tail = s[s.index('<!--langswitch-->'):]
    body = BODY.format(stars=STARS, man=P['T']['man'], sai=P['T']['sai'], **{k: v for k, v in P.items() if k not in ('src', 'out', 'title', 'desc', 'ogt', 'T')})
    T = dict(P['T'])
    scripts = ('<script src="souba.js"></script>\n<script src="wards-data.js"></script>\n<script src="properties.js"></script>\n' +
               ('<script src="properties-ja.js"></script>\n' if lang == 'ja' else '') +
               '<script src="area-viz.js"></script>\n<script src="flat35-rate.js"></script>\n<script>window.MATCH_T=' + json.dumps(T, ensure_ascii=False) + ';</script>\n<script src="match.js" defer></script>\n')
    out = head + style + '\n</head>\n<body>\n' + hdr + '\n' + body + scripts + tail
    open(R + P['out'], 'w', encoding='utf-8').write(out)
    print('ok', P['out'], len(out))
