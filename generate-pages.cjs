/* 產生每篇文章的獨立 SEO 靜態頁 + sitemap.xml + robots.txt
   用法：node generate-pages.cjs （在 repo 根目錄執行）
   來源：index.html 的 ART / S / CATS / <style>
   每次有改文章，重跑這支即可重新產生。 */
const fs = require("fs");
const BASE = "https://chouchouinjapan.com/";
const ROOT = __dirname;

let src = fs.readFileSync(ROOT + "/index.html", "utf8");
const ART = eval("[" + src.match(/const ART=\[([\s\S]*?)\n\];/)[1] + "]");
const S = eval("(" + src.match(/const S = (\{[\s\S]*?\n\});/)[1] + ")");
const CATS = eval(src.match(/const CATS=(\[[\s\S]*?\]);/)[1]);
const STYLE = src.match(/<style>[\s\S]*?<\/style>/)[0];

const SLUG = {
  a1: "foreigner-buy-japan-property",
  a2: "rent-or-buy-japan",
  a3: "japan-rental-yield-trap",
  a5: "japan-property-selling-tax",
  a6: "tokyo-23-wards-budget-guide",
  a7: "foreigner-mortgage-no-permanent-residency",
  a8: "japan-bathroom-heater-dryer",
  a9: "japan-used-apartment-checklist",
  a10: "japan-bath-toilet-separate",
  a11: "japan-property-tax-guide",
  a12: "japan-home-orientation-fengshui",
  a13: "japan-property-price-negotiation",
  a14: "taiwan-to-japan-driving-license",
  a15: "japan-earthquake-resistance-guide",
  a16: "japan-house-viewing-tools",
  a17: "tokyo-23-wards-area-guide",
  a18: "japan-mansion-management-fee",
  a24: "japan-flood-drainage-guide",
  a25: "japan-hazard-map-guide",
  a26: "japan-earthquake-proof-housing",
  a19: "asakusa-sensoji-guide",
  a20: "tokyo-skytree-guide",
  a21: "tokyo-tower-guide",
  a22: "asakusa-oshiage-property-price",
  a23: "tokyo-tower-area-property-price",
  a27: "japan-property-contract-documents",
  a28: "japan-business-manager-visa"
};

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const cat = id => CATS.find(c => c.id === id) || { name: "未分類", g: "linear-gradient(135deg,#a8a29e,#d6d3d1)", c: "#a8a29e" };
const ytEmbed = u => { if (!u) return ""; const m = u.match(/(?:youtu\.be\/|v=|\/embed\/|shorts\/)([\w-]{11})/); return m ? "https://www.youtube.com/embed/" + m[1] : ""; };
const rt = a => Math.max(1, Math.round(a.body.join("").replace(/\s/g, "").length / 350));
const coverURL = a => { const c = a.hero || a.cover; return c ? (/^https?:\/\//.test(c) ? c : BASE + encodeURIComponent(c)) : ""; };

function page(a) {
  const slug = SLUG[a.id];
  const url = BASE + slug + ".html";
  const c = cat(a.cat);
  const cover = coverURL(a);
  const bg = "background-image:" + (cover ? "url('" + cover + "')," : "") + c.g + (a.cpos ? ";background-position:" + a.cpos : "");
  const bodyHTML = a.body.map(p => { const t = p.trim(); if (t.startsWith("<div")) return p; if (/^(<b>)?(資料來源|本文為|※)/.test(t)) return '<p class="src">' + p + "</p>"; const m = t.match(/^<b>([\s\S]+)<\/b>$/); return m ? '<p class="ah"><b>' + m[1] + "</b></p>" : "<p>" + p + "</p>"; }).join("");
  const em = ytEmbed(a.video);
  const vidId = em ? em.split("/embed/")[1] : "";
  const vid = em ? `<div class="vid"><div class="ytf" data-id="${vidId}"><img src="https://i.ytimg.com/vi/${vidId}/hqdefault.jpg" alt="影片" loading="lazy"><span class="pbtn">▶</span></div></div>` : "";
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: a.title, description: a.ex,
    inLanguage: "zh-Hant",
    datePublished: a.date, dateModified: a.date,
    author: { "@type": "Person", name: "周周（周欣妤）" },
    publisher: { "@type": "Organization", name: "周周・日本房仲" },
    mainEntityOfPage: url
  };
  if (cover) ld.image = cover;
  const ldCrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "首頁", item: BASE },
    { "@type": "ListItem", position: 2, name: c.name, item: BASE + "#" + a.cat },
    { "@type": "ListItem", position: 3, name: a.title, item: url }
  ] };
  const t = esc(a.title) + "｜周周・日本房仲";
  const d = esc(a.ex);
  const others = ART.filter(r => r.id !== a.id && (r.url || SLUG[r.id]));
  const rel = [...others.filter(r => r.cat === a.cat), ...others.filter(r => r.cat !== a.cat).sort((x, y) => (y.date || "").localeCompare(x.date || ""))].slice(0, 3);
  const relHTML = rel.length ? `<section style="margin-top:32px;border-top:1px solid var(--line);padding-top:18px"><h2 style="font-size:18px;margin-bottom:10px">延伸閱讀</h2>` + rel.map(r => `<a href="${r.url || SLUG[r.id] + ".html"}" style="display:block;padding:11px 0;border-bottom:1px solid var(--line)">→ ${r.title}</a>`).join("") + `</section>` : "";
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<script>(function(){var css="html[data-fs=s]{--fs:1}html[data-fs=m]{--fs:1.1}html[data-fs=l]{--fs:1.22}.fsctl{position:fixed;left:14px;bottom:16px;z-index:60;display:flex;gap:2px;background:#fff;border:1px solid #e7e5e4;border-radius:999px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.12)}.fsctl button{border:none;background:none;cursor:pointer;font-size:13px;font-weight:700;color:#78716c;padding:5px 9px;border-radius:999px;font-family:inherit;line-height:1}.fsctl button.on{background:#f43f5e;color:#fff}";var st=document.createElement("style");st.textContent=css;(document.head||document.documentElement).appendChild(st);var f="m";try{f=localStorage.getItem("fs")||"m";}catch(e){}document.documentElement.setAttribute("data-fs",f);window.setFS=function(x){document.documentElement.setAttribute("data-fs",x);try{localStorage.setItem("fs",x);}catch(e){}u();};function u(){var c=document.documentElement.getAttribute("data-fs"),bs=document.querySelectorAll(".fsctl button");for(var i=0;i<bs.length;i++){bs[i].className=(bs[i].getAttribute("data-f")===c?"on":"");}}function init(){if(document.querySelector(".fsctl"))return;var d=document.createElement("div");d.className="fsctl";d.setAttribute("aria-label","字級調整");var labels=["小","中","大"],keys=["s","m","l"];for(var i=0;i<3;i++){(function(k,t){var btn=document.createElement("button");btn.textContent=t;btn.setAttribute("data-f",k);btn.onclick=function(){setFS(k);};d.appendChild(btn);})(keys[i],labels[i]);}document.body.appendChild(d);u();}if(document.body){init();}else{document.addEventListener("DOMContentLoaded",init);}})();</script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XN785WJLZ3"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-XN785WJLZ3");</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${url}">${cover ? `
<link rel="preload" as="image" href="${cover}">` : ""}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">${cover ? `\n<meta property="og:image" content="${cover}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta property="article:published_time" content="${a.date}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://i.ytimg.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}</script>
<script type="application/ld+json">${JSON.stringify(ldCrumb).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}</script>
${STYLE}
</head>
<body>
<div id="rp"></div>
<div class="sbar"><div class="wrap" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px"><a href="index.html" style="font-weight:800;color:var(--rose);font-size:17px">周周・日本房仲</a><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div></div>
<main class="wrap" style="max-width:760px;padding-top:18px">
<a class="back" href="index.html">← 回周周首頁</a>
<p style="font-size:13px;color:var(--mut);margin-bottom:14px"><a href="index.html" style="color:var(--mut)">首頁</a> › ${c.name}</p>
<div class="acov" style="${bg}"><span>${c.name}</span></div>
<h1 class="atitle" style="margin-bottom:10px">${a.title}</h1>
<div class="am" style="display:flex;gap:14px;color:var(--mut);font-size:14px;margin-bottom:16px"><span>周周</span><span>${a.date}</span><span>約 ${rt(a)} 分鐘</span></div>
<div class="share"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">f 分享</a><a href="https://www.threads.net/intent/post?text=${encodeURIComponent(a.title+" "+url)}" target="_blank" rel="noopener">Threads 分享</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener">𝕏 分享</a><a href="javascript:void(0)" onclick="navigator.clipboard&&navigator.clipboard.writeText('${url}');this.textContent='✓ 已複製';return false">🔗 複製連結</a></div>
<div class="post">
${bodyHTML}
</div>
${vid}
<div class="ablock" style="margin-top:26px"><div><b>這篇有幫到你嗎？有問題直接問我</b><br><span style="color:var(--mut);font-size:14px">看到喜歡的物件也可以直接貼給周周看看。</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div>
${relHTML}
<p style="margin:30px 0;font-size:14px"><a href="index.html" style="color:var(--rose);font-weight:600">← 看更多周周的文章</a></p>
</main>
<footer><div class="wrap row"><div><p style="font-weight:700">周周・日本房仲</p><p style="font-size:14px;color:var(--mut)">📍 東京23區為主，神奈川、千葉、橫濱周邊也服務</p></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div><div class="wrap" style="padding:0 16px 10px;display:flex;flex-wrap:wrap;gap:14px;font-size:13px"><a href="index.html" style="color:var(--mut)">首頁</a><a href="feedback.html" style="color:var(--mut)">💬 意見回饋</a><a href="tool-loan.html" style="color:var(--mut)">🧮 試算工具</a><a href="videos.html" style="color:var(--mut)">🎬 影片</a></div><div class="wrap cp">© ${new Date().getFullYear()} 周周・日本房仲</div></footer>
<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a&&a.href&&a.href.indexOf("lin.ee")>-1&&typeof gtag==="function"){gtag("event","line_click",{link_id:a.id||"",page:location.pathname});}});</script>
<button id="btt" aria-label="回到頂端">↑</button>
<script>document.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('.ytf');if(f&&!f.dataset.l){f.dataset.l=1;f.innerHTML='<iframe src="https://www.youtube.com/embed/'+f.dataset.id+'?autoplay=1" title="影片" allow="autoplay;fullscreen" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>';}});</script>
<script>(function(){var rp=document.getElementById('rp'),btt=document.getElementById('btt');function os(){var h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,mx=h.scrollHeight-h.clientHeight;rp.style.width=(mx>0?sc/mx*100:0)+'%';btt.style.display=sc>500?'flex':'none';}window.addEventListener('scroll',os,{passive:true});os();btt.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};var post=document.querySelector('.post');if(post){var heads=[];post.querySelectorAll('p').forEach(function(p){var fe=p.querySelector('b');if(fe&&p.firstElementChild===fe){var t=fe.textContent.trim();if(t.length>=3&&t.length<=42)heads.push({p:p,t:t});}});if(heads.length>=4){var toc=document.createElement('div');toc.className='toc collapsed';var tt=document.createElement('div');tt.className='toc-t';tt.innerHTML='📑 本篇目錄 <span class="toc-x"></span>';tt.onclick=function(){toc.classList.toggle('collapsed');};var list=document.createElement('div');list.className='toc-list';heads.forEach(function(h,i){var id='sec'+i;h.p.id=id;h.p.classList.add('sec');var a=document.createElement('a');a.href='#'+id;a.textContent=h.t;list.appendChild(a);});toc.appendChild(tt);toc.appendChild(list);post.parentNode.insertBefore(toc,post);}}})();</script>
</body>
</html>`;
}

// 產生文章頁
let made = [];
for (const a of ART) {
  if (a.url) continue;            // a4 民宿用既有 minpaku.html
  if (!SLUG[a.id]) continue;
  fs.writeFileSync(ROOT + "/" + SLUG[a.id] + ".html", page(a));
  made.push(SLUG[a.id] + ".html");
}

// sitemap
const urls = [];
urls.push({ loc: BASE, pr: "1.0", cf: "weekly" });
for (const a of ART) {
  if (a.url) { urls.push({ loc: BASE + a.url, lm: a.date, pr: "0.7" }); }
  else if (SLUG[a.id]) { urls.push({ loc: BASE + SLUG[a.id] + ".html", lm: a.date, pr: "0.8" }); }
}
urls.push({ loc: BASE + "translate.html", pr: "0.6" });
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `<url><loc>${u.loc}</loc>${u.lm ? `<lastmod>${u.lm}</lastmod>` : ""}${u.cf ? `<changefreq>${u.cf}</changefreq>` : ""}<priority>${u.pr}</priority></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(ROOT + "/sitemap.xml", sitemap);

// robots
fs.writeFileSync(ROOT + "/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);

console.log("產生文章頁:", made.length, "篇");
console.log(made.join("\n"));
console.log("sitemap.xml + robots.txt 已產生");
