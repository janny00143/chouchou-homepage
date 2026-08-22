/* 產生簡體中文版頁面（-cn.html）。先跑 node generate-pages.cjs，再跑 node build-cn.cjs。
   作法：OpenCC 繁→簡，保護中文圖檔名，內部連結改為 -cn，調整 canonical/lang/og，並更新 sitemap。 */
const fs = require("fs");
const OpenCC = require("opencc-js");
const conv = OpenCC.Converter({ from: "tw", to: "cn" });
const ROOT = __dirname;
const BASE = "https://chouchouinjapan.com/";

// 從 index.html 取出文章 slug
const idx = fs.readFileSync(ROOT + "/index.html", "utf8");
const slugMatch = idx.match(/SLUG=\{([^}]*)\}/);
const slugs = [...slugMatch[1].matchAll(/"a\d+":"([^"]+)"/g)].map(m => m[1]);

// 需要產生 -cn 的內部頁面（會被互相連結的都要做，否則 404）
const staticPages = ["index.html","properties.html","property.html","minpaku.html","translate.html","feedback.html","videos.html","tools.html","partners.html","quiz.html","property-types.html","tokyo-area-guide.html",
  "about.html","privacy.html","tool-loan.html","tool-cost.html","tool-agent.html","tool-yield.html","tool-fx.html","tool-area.html","tool-convert.html"];
const internal = [...staticPages, ...slugs.map(s => s + ".html")].filter(f => fs.existsSync(ROOT + "/" + f));
const cn = f => f.replace(/\.html$/, "-cn.html");

function convertFile(file) {
  let s = fs.readFileSync(ROOT + "/" + file, "utf8");

  // 1) 保護圖檔/資產檔名（含中文檔名），避免被簡轉破壞
  const store = [];
  s = s.replace(/[^\s"'`()<>]+\.(?:jpg|jpeg|png|gif|svg|webp|ico|mp4)/gi, m => {
    store.push(m); return "@@A" + (store.length - 1) + "@@";
  });

  // 1b) 保護法定登記資訊（CLAUDE.md §7 例外：公司登記名稱、免許番号、地址、姓名拼音
  //     必須與正式文件一致，不可簡體化）
  const KEEP = [
    "東京都知事 (2) 第102938号",
    "株式会社アンドプラス 住宅営業部",
    "株式会社アンドプラス",
    "宅地建物取引業者免許番号",
    "〒150-0032 東京都渋谷区鶯谷町3-1 ＳＵビル301号",
    "鶯谷町3-1 ＳＵビル301号",
    "東京都知事",
    "シュウ シンユウ"
  ];
  const keep = [];
  for (const K of KEEP) {
    s = s.split(K).join("@@K" + keep.length + "@@");
    keep.push(K);
  }

  // 1c) 保護 hreflang 的 <link rel="alternate">：這些網址是「刻意」指向繁中／日文版的，
  //     下面第 4b 步會把站內絕對網址一律改成 -cn，會誤傷 hreflang，所以先收起來。
  const hre = [];
  s = s.replace(/<link[^>]+rel=["']alternate["'][^>]*>/gi, m => {
    hre.push(m); return "@@H" + (hre.length - 1) + "@@";
  });

  // 2) 繁→簡
  s = conv(s);

  // 3) 還原檔名與法定登記資訊
  s = s.replace(/@@A(\d+)@@/g, (_, i) => store[+i]);
  s = s.replace(/@@K(\d+)@@/g, (_, i) => keep[+i]);

  // 4) 內部連結改 -cn（相對連結，ja.html 與外部/資產不動）
  for (const P of internal) {
    s = s.split('="' + P + '"').join('="' + cn(P) + '"');
    s = s.split("='" + P + "'").join("='" + cn(P) + "'");
  }

  // 4a) <meta http-equiv="refresh" content="0;url=xxx.html"> 的轉址目標
  //     （轉址殼頁如 tools.html／tool-convert.html 用的是這個，不是 href，第 4 步吃不到，
  //      沒改的話簡中使用者會被丟到繁中頁）
  for (const P of internal) {
    s = s.split("url=" + P).join("url=" + cn(P));
  }

  // 4b) 站內「絕對網址」一律改成 -cn：canonical 指向別頁、og:url、JSON-LD 裡的 url 都算。
  //     hreflang 已在第 1c 步收起來，不會被誤改。
  for (const P of internal) {
    s = s.split(BASE + P).join(BASE + cn(P));
  }

  // 4c) 分享按鈕（Facebook／Threads／複製連結）裡的網址是 URL-encoded 的，
  //     第 4b 步的字串比對吃不到，沒改的話簡中讀者分享出去的是繁中網址。
  const encBase = encodeURIComponent(BASE);   // https%3A%2F%2Fchouchouinjapan.com%2F
  for (const P of internal) {
    s = s.split(encBase + P).join(encBase + cn(P));
  }

  // 5) canonical / og:url 指向自己的 -cn
  if (file === "index.html") {
    s = s.replace('rel="canonical" href="' + BASE + '"', 'rel="canonical" href="' + BASE + 'index-cn.html"');
    s = s.replace('property="og:url" content="' + BASE + '"', 'property="og:url" content="' + BASE + 'index-cn.html"');
  } else {
    const u = BASE + file, ucn = BASE + cn(file);
    s = s.split('rel="canonical" href="' + u + '"').join('rel="canonical" href="' + ucn + '"');
    s = s.split('property="og:url" content="' + u + '"').join('property="og:url" content="' + ucn + '"');
  }

  // 6b) og:locale zh_TW -> zh_CN
  s = s.split('content="zh_TW"').join('content="zh_CN"');
  // 6) lang 設為簡體
  s = s.replace(/<html lang="zh-Hant-TW">/g, '<html lang="zh-Hans">').replace(/<html lang="zh-Hant">/g, '<html lang="zh-Hans">');

  // 7) 還原 hreflang 標籤
  s = s.replace(/@@H(\d+)@@/g, (_, i) => hre[+i]);

  fs.writeFileSync(ROOT + "/" + cn(file), s);
  return cn(file);
}

const made = internal.map(convertFile);

// 7) 更新 sitemap：加入 -cn 內容頁
let sm = fs.readFileSync(ROOT + "/sitemap.xml", "utf8");
if (!sm.includes("index-cn.html")) {
  // 帶 noindex 的頁面（例如 property.html 這種要靠 ?id= 才有內容的殼頁）不可放進 sitemap，
  // 否則 sitemap 說「請收錄」、頁面說「不要收錄」，Google Search Console 會報
  // 「遭到 noindex 標記排除」。繁中／日文版本來就沒放，簡中版之前漏掉了。
  const isNoindex = f => {
    try { return /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(fs.readFileSync(ROOT + "/" + f, "utf8")); }
    catch (e) { return false; }
  };
  // 轉址殼頁（tools-cn.html／tool-convert-cn.html 這種 <meta refresh>）同樣不放進 sitemap
  const isStub = f => {
    try { return /<meta[^>]+http-equiv=["']refresh["']/i.test(fs.readFileSync(ROOT + "/" + f, "utf8")); }
    catch (e) { return false; }
  };
  const cnStatic = staticPages.filter(f => f !== "index.html" && !isNoindex(f)).map(cn).filter(f => !isStub(f));
  // -cn 頁的 lastmod 沿用繁中對應檔在 sitemap 裡已算好的日期（不另外編日期）
  const lmOf = u => {
    const tw = u === "index-cn.html" ? "" : u.replace(/-cn\.html$/, ".html");   // 繁中首頁在 sitemap 是根網址
    const m = sm.match(new RegExp("<loc>" + BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + tw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</loc><lastmod>(\\d{4}-\\d{2}-\\d{2})</lastmod>"));
    return m ? m[1] : "";
  };
  const extra = ["index-cn.html", ...slugs.map(s => s + "-cn.html"), ...cnStatic]
    .map(u => { const lm = lmOf(u); return `<url><loc>${BASE}${u}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}<priority>0.6</priority></url>`; }).join("\n");
  sm = sm.replace("</urlset>", extra + "\n</urlset>");
  fs.writeFileSync(ROOT + "/sitemap.xml", sm);
}

console.log("產生簡體頁:", made.length, "頁");
console.log(made.join("\n"));
