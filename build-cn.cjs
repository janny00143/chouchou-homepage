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
const staticPages = ["index.html","properties.html","minpaku.html","translate.html","feedback.html","videos.html","tools.html",
  "tool-loan.html","tool-cost.html","tool-agent.html","tool-yield.html","tool-fx.html","tool-area.html","tool-convert.html"];
const internal = [...staticPages, ...slugs.map(s => s + ".html")].filter(f => fs.existsSync(ROOT + "/" + f));
const cn = f => f.replace(/\.html$/, "-cn.html");

function convertFile(file) {
  let s = fs.readFileSync(ROOT + "/" + file, "utf8");

  // 1) 保護圖檔/資產檔名（含中文檔名），避免被簡轉破壞
  const store = [];
  s = s.replace(/[^\s"'`()<>]+\.(?:jpg|jpeg|png|gif|svg|webp|ico|mp4)/gi, m => {
    store.push(m); return "@@A" + (store.length - 1) + "@@";
  });

  // 2) 繁→簡
  s = conv(s);

  // 3) 還原檔名
  s = s.replace(/@@A(\d+)@@/g, (_, i) => store[+i]);

  // 4) 內部連結改 -cn（相對連結，ja.html 與外部/資產不動）
  for (const P of internal) {
    s = s.split('="' + P + '"').join('="' + cn(P) + '"');
    s = s.split("='" + P + "'").join("='" + cn(P) + "'");
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

  fs.writeFileSync(ROOT + "/" + cn(file), s);
  return cn(file);
}

const made = internal.map(convertFile);

// 7) 更新 sitemap：加入 -cn 內容頁
let sm = fs.readFileSync(ROOT + "/sitemap.xml", "utf8");
if (!sm.includes("index-cn.html")) {
  const cnStatic = staticPages.filter(f => f !== "index.html").map(cn);
  const extra = ["index-cn.html", ...slugs.map(s => s + "-cn.html"), ...cnStatic]
    .map(u => `<url><loc>${BASE}${u}</loc><priority>0.6</priority></url>`).join("\n");
  sm = sm.replace("</urlset>", extra + "\n</urlset>");
  fs.writeFileSync(ROOT + "/sitemap.xml", sm);
}

console.log("產生簡體頁:", made.length, "頁");
console.log(made.join("\n"));
