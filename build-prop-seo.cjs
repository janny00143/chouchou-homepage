/* build-prop-seo.cjs ─ 物件專區（properties*.html）的 SEO 補強
   ------------------------------------------------------------
   目的（周周 2026-08-17 指示）：
     「不用每一個物件都生成獨立靜態網頁，但主頁的物件專區那一頁要能被搜到。」

   物件專區的物件卡片是由 properties.js 用 JS 渲染出來的，
   搜尋引擎如果沒有執行 JS，那頁其實幾乎沒有可讀內容。
   所以這支程式在建置時，把「目前在售物件」寫成兩份靜態內容塞進頁尾：

     1. JSON-LD（CollectionPage ＋ ItemList）── 給搜尋引擎讀的結構化資料
     2. <noscript> 純 HTML 清單 ────────────── 沒有 JS 也看得到的物件列表

   ⚠️ 這支要在 generate-pages / build-cn / build-ja 之後最後跑，
      因為 properties-cn.html 是 build-cn 從 properties.html 產生的。
   ⚠️ 已成約（sold:true）的物件不寫進去。
   ⚠️ 內容一律從 properties.js／properties-ja.js 讀，不要手改頁尾那段。
   ============================================================ */
const fs = require("fs");
const ROOT = __dirname;
const BASE = "https://chouchouinjapan.com/";
const MARK_S = "<!--PROP-SEO-->";
const MARK_E = "<!--/PROP-SEO-->";

global.window = {};
require(ROOT + "/properties.js");
require(ROOT + "/properties-ja.js");
const ALL = window.PROPERTIES || [];
const JA = window.PROPERTIES_JA || {};

// 簡中：沿用站上既有的 OpenCC 轉換表（沒有就原樣輸出，不影響正確性）
let toCn = s => s;
try {
  const opencc = require(ROOT + "/opencc-t2cn.js");
  const api = opencc || global.window.OpenCC;
  if (api && api.Converter) { const cc = api.Converter({ from: "tw", to: "cn" }); toCn = s => cc(String(s || "")); }
} catch (e) { /* 轉不動就維持繁中，頁面仍然正確 */ }

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 「1億2,340万円」→ 123400000（取不到就回 0，不寫價格）
function yen(p) {
  const m = String(p || "").match(/(?:([\d.]+)[億亿])?(?:([\d,]+)[万萬])?[円]/);
  if (!m || (!m[1] && !m[2])) return 0;
  return ((m[1] ? parseFloat(m[1]) * 1e4 : 0) + (m[2] ? parseInt(m[2].replace(/,/g, ""), 10) : 0)) * 1e4;
}

// 圖片給搜尋引擎讀：封面＋間取圖優先，最多 4 張，一律絕對網址
// （properties.js 的 photos 已把 -plan 排在第 2 張，所以直接取前幾張就對）
function pics(p) {
  return (p.photos || [])
    .filter(x => x && !/^https?:/i.test(x))
    .slice(0, 4)
    .map(x => BASE + x);
}

/* 物件獨立頁（提案 2・2026-10-03）：property.html?id= 是 noindex 殼頁，
   JSON-LD 與 noscript 清單一律改指可被收錄的靜態頁，讓內部連結有權重可傳。
   靜態頁不存在時（例如還沒跑過 generate-pages）退回殼頁，頁面不會壞。 */
const propStatic = (key, id) => {
  const suf = key === "cn" ? "-cn" : key === "ja" ? "-ja" : "";
  const f = "prop-" + id + suf + ".html";
  return fs.existsSync(ROOT + "/" + f) ? f : null;
};

const LANG = {
  tw: { file: "properties.html", detail: "property.html", page: "properties.html",
        name: "物件專區｜周周・日本房仲", heading: "目前在售物件一覽",
        note: "以下為目前在售物件。實際條件以現況及重要事項說明書為準，詳情歡迎加 LINE 詢問。",
        pick: p => ({ title: p.title_cn || p.title, loc: p.location, st: p.station }) },
  cn: { file: "properties-cn.html", detail: "property-cn.html", page: "properties-cn.html",
        name: "物件专区｜周周・日本房仲", heading: "目前在售物件一览",
        note: "以下为目前在售物件。实际条件以现况及重要事项说明书为准，详情欢迎加 LINE 询问。",
        pick: p => ({ title: toCn(p.title_cn || p.title), loc: toCn(p.location), st: toCn(p.station) }) },
  ja: { file: "properties-ja.html", detail: "property-ja.html", page: "properties-ja.html",
        name: "物件情報｜周周・日本の不動産", heading: "販売中の物件一覧",
        note: "販売中の物件一覧です。最終条件は現況および重要事項説明書をご確認ください。",
        pick: p => { const j = JA[p.id] || {}; return { title: p.title, loc: j.location || p.location, st: j.station || p.station }; } }
};

/* 清單上的價格字串跟著語言走：日文用 properties-ja.js 換好的（含稅→税込），簡中轉簡體 */
function priceText(key, p) {
  if (key === "ja") return (JA[p.id] && JA[p.id].price) || p.price;
  if (key === "cn") return toCn(String(p.price));
  return p.price;
}

function block(key) {
  const L = LANG[key];
  const act = ALL.filter(p => !p.sold && p.status === "在售");

  const items = act.map((p, i) => {
    const d = L.pick(p);
    const st = propStatic(key, p.id);
    const url = st ? BASE + st : BASE + L.detail + "?id=" + encodeURIComponent(p.id);
    const price = yen(p.price);
    const item = {
      "@type": "ListItem", position: i + 1, name: d.title, url,
      item: {
        "@type": "Accommodation", name: d.title, url,
        address: { "@type": "PostalAddress", addressCountry: "JP", streetAddress: d.loc || undefined }
      }
    };
    const imgs = pics(p);
    if (imgs.length) item.item.image = imgs;
    if (price > 0) item.item.offers = { "@type": "Offer", price, priceCurrency: "JPY", availability: "https://schema.org/InStock" };
    return item;
  });

  const ld = {
    "@context": "https://schema.org", "@type": "CollectionPage",
    name: L.name, url: BASE + L.page, inLanguage: key === "ja" ? "ja" : (key === "cn" ? "zh-Hans" : "zh-Hant"),
    isPartOf: { "@type": "WebSite", name: L.name, url: BASE },
    mainEntity: { "@type": "ItemList", numberOfItems: items.length, itemListElement: items }
  };

  const rows = act.map(p => {
    const d = L.pick(p);
    const st = propStatic(key, p.id);
    const href = st || (L.detail + "?id=" + encodeURIComponent(p.id));
    return '<li><a href="' + href + '">' + esc(d.title) + "</a>"
      + (p.price ? " — " + esc(String(priceText(key, p)).split("\n")[0]) : "")
      + (d.loc ? "（" + esc(d.loc) + "）" : "") + "</li>";
  }).join("");

  return MARK_S + "\n"
    + '<script type="application/ld+json">' + JSON.stringify(ld) + "</script>\n"
    + "<noscript><section><h2>" + esc(L.heading) + "</h2><p>" + esc(L.note) + "</p><ul>"
    + rows + "</ul></section></noscript>\n" + MARK_E;
}

/* ── 首頁「周周精選物件」（周周 2026-10-31：「物件專區幫我在首頁可以做得更明顯一點」）──
   首頁不載入 properties.js（250KB），所以在這裡直接產生靜態卡片，塞進
   index.html／index-cn.html／ja.html 的 <!--HOME-PROPS--> 區塊。
   挑法：pin 大的在前（周周指定置頂的），再來是最新上架，取 6 件有照片的。
   ⚠️ 必須在 build-cn、build-ja-home 之後跑（它們會重新產生 index-cn.html／ja.html）。 */
const HM_S = "<!--HOME-PROPS-->", HM_E = "<!--/HOME-PROPS-->";
const HOME = {
  tw: { file: "index.html", list: "properties.html", head: "🏠 周周精選物件", count: n => "目前在售 " + n + " 件",
        all: "看全部物件 →", map: "🗺 用地圖找", sub: "東京 23 區自住・投資，獨家物件也在這裡。看到喜歡的直接點進去，或加 LINE 跟我說你的條件。",
        walk: "徒步", min: "分", ask: "價格請洽詢" },
  cn: { file: "index-cn.html", list: "properties-cn.html", head: "🏠 周周精选物件", count: n => "目前在售 " + n + " 件",
        all: "看全部物件 →", map: "🗺 用地图找", sub: "东京 23 区自住・投资，独家物件也在这里。看到喜欢的直接点进去，或加 LINE 跟我说你的条件。",
        walk: "徒步", min: "分", ask: "价格请洽询" },
  ja: { file: "ja.html", list: "properties-ja.html", head: "🏠 おすすめ物件", count: n => "販売中 " + n + " 件",
        all: "すべての物件を見る →", map: "🗺 地図で探す", sub: "東京23区の自宅用・投資用物件をご紹介しております。気になる物件はそのまま詳細をご覧いただけます。",
        walk: "徒歩", min: "分", ask: "価格はお問い合わせください" }
};
const listedTs = p => Date.parse(p.listed || "") || 0;
const walkMin = st => { let best = 0, m; const re = /[徒]\s*[步歩]\s*約?(\d+)\s*分/g; while ((m = re.exec(String(st || "")))) { const v = +m[1]; if (!best || v < best) best = v; } return best; };
const wardOf = loc => { const m = String(loc || "").match(/([^\s都道府縣県]{1,4}?[區区市])/); return m ? m[1] : ""; };
function homeBlock(key) {
  const H = HOME[key], L = LANG[key];
  const act = ALL.filter(p => !p.sold && p.status === "在售");
  const pick = act.filter(p => (p.photos || []).length && !/^https?:/i.test(p.photos[0]) && !(p.group && p.group !== "jisha"))
    .sort((a, b) => ((b.pin || 0) - (a.pin || 0)) || (listedTs(b) - listedTs(a))).slice(0, 6);
  const cards = pick.map(p => {
    const d = L.pick(p);
    const j = JA[p.id] || {};
    const st = propStatic(key, p.id);
    const href = st || (L.detail + "?id=" + encodeURIComponent(p.id));
    let price = key === "ja" ? (j.priceShort || j.price || p.priceShort || p.price) : (p.priceShort || p.price);
    price = String(price || H.ask).split("\n")[0].replace(/[（(]\s*(皆?含稅|税込)\s*[）)]/g, "");
    if (key === "cn") price = toCn(price);
    const w = walkMin(d.st), ward = wardOf(d.loc);
    const img = p.thumb || p.photos[0];
    return '<a class="hp-card" href="' + href + '"><div class="hp-ph"><img src="' + esc(img) + '" alt="' + esc(d.title) + '" loading="lazy" width="400" height="300"></div>'
      + '<div class="hp-b"><b>' + esc(d.title) + '</b><div class="hp-pr">' + esc(price) + '</div>'
      + '<div class="hp-st">' + esc(ward) + (w ? "・🚉 " + H.walk + " " + w + " " + H.min : "") + '</div></div></a>';
  }).join("");
  return HM_S + "\n"
    + '<style>.herob .b-prop{background:#f4547a;color:#fff;border-color:#f4547a}.hpsec{max-width:1100px;margin:34px auto 6px;padding:0 16px}.hp-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}.hp-hd h2{font-size:clamp(22px,2.6vw,28px);margin:0}.hp-cnt{display:inline-block;margin-left:10px;font-size:14px;font-weight:800;color:#e11d48;background:#fff1f2;border:1px solid #fecdd3;border-radius:999px;padding:3px 12px;vertical-align:middle}.hp-sub{color:#78716c;font-size:14.5px;line-height:1.8;margin:0 0 16px}.hp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.hp-card{display:block;background:#fff;border:1px solid #eee9e7;border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:0 4px 14px rgba(0,0,0,.06);transition:transform .15s,box-shadow .15s}.hp-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.1)}.hp-ph{aspect-ratio:4/3;background:#f5f5f4;overflow:hidden}.hp-ph img{width:100%;height:100%;object-fit:cover;display:block}.hp-b{padding:12px 14px 14px}.hp-b b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:15px;line-height:1.5;min-height:3em}.hp-pr{color:#e11d48;font-weight:900;font-size:18px;margin:6px 0 2px}.hp-st{font-size:13px;color:#78716c}.hp-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:20px 0 4px}.hp-btns a{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:12px 26px;font-weight:800;font-size:15px;text-decoration:none}.hp-all{background:#f4547a;color:#fff;box-shadow:0 6px 16px rgba(244,84,122,.3)}.hp-map{background:#fff;color:#e11d48;border:2px solid #f6adbe}@media(max-width:820px){.hp-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.hp-grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding-bottom:6px}.hp-card{flex:0 0 76%;scroll-snap-align:start}}</style>\n'
    + '<section class="hpsec"><div class="hp-hd"><h2>' + esc(H.head) + '<span class="hp-cnt">' + esc(H.count(act.length)) + '</span></h2></div>'
    + '<p class="hp-sub">' + esc(H.sub) + '</p><div class="hp-grid">' + cards + '</div>'
    + '<div class="hp-btns"><a class="hp-all" href="' + H.list + '">' + esc(H.all) + '</a><a class="hp-map" href="' + H.list + '#pmapSec">' + esc(H.map) + '</a></div></section>\n'
    + HM_E;
}
let hn = 0;
for (const key of Object.keys(HOME)) {
  const f = ROOT + "/" + HOME[key].file;
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, "utf8");
  const re = new RegExp(HM_S + "[\\s\\S]*?" + HM_E);
  if (!re.test(s)) { console.log("首頁沒有 HOME-PROPS 標記，跳過：", HOME[key].file); continue; }
  fs.writeFileSync(f, s.replace(re, homeBlock(key)));
  hn++;
}
console.log("首頁精選物件已寫入", hn, "頁");

let n = 0;
for (const key of Object.keys(LANG)) {
  const f = ROOT + "/" + LANG[key].file;
  if (!fs.existsSync(f)) { console.log("跳過（找不到）:", LANG[key].file); continue; }
  let s = fs.readFileSync(f, "utf8");
  const b = block(key);
  const re = new RegExp(MARK_S + "[\\s\\S]*?" + MARK_E);
  if (re.test(s)) s = s.replace(re, b);            // 已有 → 整段換掉
  else s = s.replace("</body>", b + "\n</body>");  // 沒有 → 插在 </body> 前
  fs.writeFileSync(f, s);
  n++;
}
console.log("物件專區 SEO 區塊已寫入", n, "頁（在售", ALL.filter(p => !p.sold && p.status === "在售").length, "件）");
