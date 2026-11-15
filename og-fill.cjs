/* 補齊分享預覽用的 og 標籤（周周 2026-11-15：「分析系統等很多的網站上的連結都沒有帶出縮圖或說名字」）
   用法：node og-fill.cjs        → 掃 root 的公開 .html（跳過 noindex／轉址頁／threads-*），缺什麼補什麼，已經有的不動。
         node og-fill.cjs --check → 只列出缺的，不寫檔。
   補的內容：og:title（取 <title>）、og:description（取 meta description）、og:url（取 canonical）、
            og:image（下面 IMG 有指定就用，否則用站台預設 og-image.jpg）＋寬高、twitter:card。 */
const fs = require("fs"), path = require("path");
const ROOT = __dirname, BASE = "https://chouchouinjapan.com/";
const IMG = { // 頁面專屬分享圖（沒列的用 og-image.jpg）
  "tokyo-home-match": "img/og-home-match.jpg", "tokyo-home-match-cn": "img/og-home-match.jpg", "tokyo-home-match-ja": "img/og-home-match-ja.jpg",
};
const SKIP = /^(threads-|google[0-9a-f]+\.html$|404\.html$)/;
const check = process.argv.includes("--check");
const esc = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const unesc = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
let changed = 0;
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith(".html") && !SKIP.test(f)).sort()) {
  const p = path.join(ROOT, f), s = fs.readFileSync(p, "utf8");
  const he = s.indexOf("</head>"); const bo = s.search(/<body[\s>]/); const head = he > 0 ? s.slice(0, he) : bo > 0 ? s.slice(0, bo) : s.slice(0, 60000);
  if (/name=["']robots["'][^>]*noindex/i.test(head) || /http-equiv=["']refresh/i.test(head)) continue;
  const has = k => new RegExp(`property=["']${k}["']`).test(head);
  const title = (head.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (head.match(/<meta name=["']description["'] content=["']([^"']*)["']/) || [])[1];
  const canon = (head.match(/<link rel=["']canonical["'] href=["']([^"']+)["']/) || [])[1] || BASE + f;
  const key = f.replace(/\.html$/, ""), img = BASE + (IMG[key] || "og-image.jpg");
  const lang = /-ja$/.test(key) || key === "ja" ? "ja_JP" : /-cn$/.test(key) ? "zh_CN" : "zh_TW";
  const add = [];
  if (!has("og:type")) add.push(`<meta property="og:type" content="website">`);
  if (!has("og:site_name")) add.push(`<meta property="og:site_name" content="${lang === "ja_JP" ? "周周・日本の不動産" : lang === "zh_CN" ? "周周・日本房仲" : "周周・日本房仲"}">`);
  if (!has("og:title") && title) add.push(`<meta property="og:title" content="${esc(unesc(title))}">`);
  if (!has("og:description") && desc) add.push(`<meta property="og:description" content="${esc(unesc(desc))}">`);
  if (!has("og:url")) add.push(`<meta property="og:url" content="${canon}">`);
  if (!has("og:image")) add.push(`<meta property="og:image" content="${img}">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`);
  if (!has("og:locale")) add.push(`<meta property="og:locale" content="${lang}">`);
  if (!/name=["']twitter:card["']/.test(head)) add.push(`<meta name="twitter:card" content="summary_large_image">`);
  if (!add.some(x => /og:(title|image|url|description)/.test(x))) continue;
  console.log(f, "←", add.map(x => x.match(/(og:[a-z:_]+|twitter:card)/)[1]).join(" "));
  if (check) continue;
  // 插在 </title> 後面；沒有 title 就插在 <meta charset> 後面（有些頁省略了 </head>，不能拿它當插入點）
  const ti = s.indexOf("</title>"), cs = s.search(/<meta charset[^>]*>/i);
  const at = ti > 0 ? ti + 8 : cs >= 0 ? s.indexOf(">", cs) + 1 : -1;
  if (at <= 0) { console.log("  ⚠️ 找不到插入位置，略過", f); continue; }
  fs.writeFileSync(p, s.slice(0, at) + "\n" + add.join("\n") + s.slice(at));
  changed++;
}
console.log(check ? "（--check：沒有寫檔）" : `補了 ${changed} 頁`);
