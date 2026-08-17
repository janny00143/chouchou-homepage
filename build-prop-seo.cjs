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

function block(key) {
  const L = LANG[key];
  const act = ALL.filter(p => !p.sold);

  const items = act.map((p, i) => {
    const d = L.pick(p);
    const url = BASE + L.detail + "?id=" + encodeURIComponent(p.id);
    const price = yen(p.price);
    const item = {
      "@type": "ListItem", position: i + 1, name: d.title, url,
      item: {
        "@type": "Accommodation", name: d.title, url,
        address: { "@type": "PostalAddress", addressCountry: "JP", streetAddress: d.loc || undefined }
      }
    };
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
    return '<li><a href="' + L.detail + "?id=" + encodeURIComponent(p.id) + '">' + esc(d.title) + "</a>"
      + (p.price ? " — " + esc(String(p.price).split("\n")[0]) : "")
      + (d.loc ? "（" + esc(d.loc) + "）" : "") + "</li>";
  }).join("");

  return MARK_S + "\n"
    + '<script type="application/ld+json">' + JSON.stringify(ld) + "</script>\n"
    + "<noscript><section><h2>" + esc(L.heading) + "</h2><p>" + esc(L.note) + "</p><ul>"
    + rows + "</ul></section></noscript>\n" + MARK_E;
}

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
console.log("物件專區 SEO 區塊已寫入", n, "頁（在售", ALL.filter(p => !p.sold).length, "件）");
