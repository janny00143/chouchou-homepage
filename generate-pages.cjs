/* 產生每篇文章的獨立 SEO 靜態頁 + sitemap.xml + robots.txt
   用法：node generate-pages.cjs （在 repo 根目錄執行）
   來源：index.html 的 ART / S / CATS / <style>
   每次有改文章，重跑這支即可重新產生。 */
const fs = require("fs");
const vm = require("vm");

/* 投資類文章結尾要掛「站上目前的投資物件」，所以這裡把 properties.js 讀進來。
   資料只有一份（properties.js），文章頁每次重跑產生器就會自動同步，不用人工維護。 */
function loadProps(file, key) {
  try {
    const ctx = { document: {} }; ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(__dirname + "/" + file, "utf8"), ctx);
    return ctx[key] || null;
  } catch (e) { console.warn("讀不到 " + file + "：" + e.message); return null; }
}
const PROPS = loadProps("properties.js", "PROPERTIES") || [];
const BASE = "https://chouchouinjapan.com/";

/* ── 作者／發行者的權威資訊（E-E-A-T）──
   房產與金錢屬於 Google 的 YMYL 類別，作者的專業資格權重很高。
   這裡把宅建士資格、公司與免許番号、社群帳號接進每篇文章的結構化資料，
   並指向可被索引的作者介紹頁 about.html。資料有變動請只改這一處。 */
const AUTHOR_TW = {
  "@type": "Person",
  name: "周欣妤",
  alternateName: ["周周", "シュウ シンユウ"],
  url: BASE + "about.html",
  jobTitle: "不動產仲介",
  knowsLanguage: ["zh-Hant", "ja", "zh-Hans"],
  worksFor: {
    "@type": "RealEstateAgent",
    name: "株式会社アンドプラス 住宅営業部",
    identifier: { "@type": "PropertyValue", name: "宅地建物取引業者免許番号", value: "東京都知事 (2) 第102938号" },
    url: BASE
  },
  sameAs: ["https://www.youtube.com/@travelfish67",
           "https://www.instagram.com/travelfish67/",
           "https://www.facebook.com/profile.php?id=100002070697066"]
};
const PUBLISHER_TW = {
  "@type": "RealEstateAgent",
  name: "周周・日本房仲（株式会社アンドプラス）",
  url: BASE,
  identifier: { "@type": "PropertyValue", name: "宅地建物取引業者免許番号", value: "東京都知事 (2) 第102938号" },
  address: { "@type": "PostalAddress", addressCountry: "JP", postalCode: "150-0032",
             addressRegion: "東京都", addressLocality: "渋谷区", streetAddress: "鶯谷町3-1 ＳＵビル301号" }
};

const ROOT = __dirname;

let src = fs.readFileSync(ROOT + "/index.html", "utf8");
const ART = eval("[" + src.match(/const ART=\[([\s\S]*?)\n\];/)[1] + "]");
const S = eval("(" + src.match(/const S = (\{[\s\S]*?\n\});/)[1] + ")");
const CATS = eval(src.match(/const CATS=(\[[\s\S]*?\]);/)[1]);
const STYLE = src.match(/<style>[\s\S]*?<\/style>/)[0];

const SLUG = {
  "a52": "japan-rental-vacancy-solutions",
  "a51": "japan-property-selling-guide",
  "a50": "tokyo-school-district-property",
  "a49": "japan-earthquake-preparedness-daily",
  "a47": "japan-rental-management-company",
  "a48": "japan-hotel-license-simple-lodging",
  "a45": "japan-rental-yield-gross-vs-net", "a46": "minpaku-monthly-rental-comparison", "a42": "keiei-kanri-visa-renewal-2028", "a43": "japan-property-company-vs-individual", "a44": "japan-business-visa-office-hunting",
  "a41": "how-to-transfer-money-japan-property",
  "a40": "how-to-verify-japan-real-estate-agent",
  "a39": "japan-property-after-sales-service",
  a38: "japan-buy-land-build-house",
  a37: "japan-property-buying-guide",
  a36: "japan-property-search-websites",
  a35: "japan-home-buying-documents-checklist",
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
  a28: "japan-business-manager-visa",
  a29: "japan-property-purchase-costs",
  a30: "japan-real-estate-agent-fee",
  a31: "japan-investment-property-whole-building-vs-unit",
  a32: "tokyo-minpaku-popular-location-layout",
  a33: "japan-utilities-setup-guide",
  a34: "japan-phone-sim-no-visa-guide"
};

/* 封面圖的 width/height：從 img-size.json 查實際尺寸填進去。
   沒有這兩個屬性瀏覽器算不出版位，圖載入時整頁會往下跳（CLS）。
   查不到就不填，寧可少一個屬性也不要填錯的尺寸。 */
const IMG_SIZE = (() => {
  try { return JSON.parse(fs.readFileSync(ROOT + "/img-size.json", "utf8")); }
  catch (e) { return {}; }
})();
const wh = src => {
  if (!src) return "";
  const f = decodeURIComponent(String(src).replace(/^https?:\/\/[^/]+\//, ""));
  const d = IMG_SIZE[f];
  return d ? ` width="${d[0]}" height="${d[1]}"` : "";
};

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const cat = id => CATS.find(c => c.id === id) || { name: "未分類", g: "linear-gradient(135deg,#a8a29e,#d6d3d1)", c: "#a8a29e" };
const ytEmbed = u => { if (!u) return ""; const m = u.match(/(?:youtu\.be\/|v=|\/embed\/|shorts\/)([\w-]{11})/); return m ? "https://www.youtube.com/embed/" + m[1] : ""; };
const rt = a => Math.max(1, Math.round(a.body.join("").replace(/\s/g, "").length / 350));
const coverURL = a => { const c = a.hero || a.cover; return c ? (/^https?:\/\//.test(c) ? c : BASE + encodeURIComponent(c)) : ""; };

/* 文章分類 → 要推薦哪一種在售物件 */
const PICK_BY_CAT = {
  invest:  p => p.cat === "invest",
  /* 用「旅館業」比對，不要用「民泊」——有物件的 note 寫的是「此戶民泊不可」，用民泊會抓到意思相反的 */
  minpaku: p => p.cat === "invest" && /旅館業|旅館一棟|旅館収益|旅館收益|簡易宿所/.test([p.title, p.title_cn, p.note, p.layout].join(" ")),
};
/* 依文章 id 做穩定的錯開，讓不同文章不會推到同一批物件 */
function propsForArticle(a) {
  const pick = PICK_BY_CAT[a.cat];
  if (!pick) return [];
  let list = PROPS.filter(p => !p.sold && p.status === "在售" && pick(p));
  if (a.cat === "minpaku" && list.length < 2) list = PROPS.filter(p => !p.sold && p.status === "在售" && p.cat === "invest");
  if (list.length < 2) return [];
  list = list.slice().sort((x, y) => (y.yield ? 1 : 0) - (x.yield ? 1 : 0));   // 有寫投報的排前面
  const seed = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
  const off = list.length ? seed % list.length : 0;
  return list.slice(off).concat(list.slice(0, off)).slice(0, 3);
}
function propBlockHTML(a) {
  const list = propsForArticle(a);
  if (!list.length) return "";
  const cards = list.map(p => {
    const img = (p.photos && p.photos[0]) ? encodeURIComponent(p.photos[0]) : "";   /* 相對路徑：文章頁跟物件頁都在根目錄 */
    const name = esc(p.title_cn || p.title || "");
    const yieldLine = p.yield ? '<span class="apy">' + esc(String(p.yield).split("（")[0]) + "</span>" : "";
    return '<a class="apcard" href="property.html?id=' + encodeURIComponent(p.id) + '">'
      + (img ? '<span class="apimg" style="background-image:url(\'' + img + '\')"></span>' : '<span class="apimg"></span>')
      + '<span class="apbody"><b>' + name + "</b>"
      + '<span class="apmeta">' + esc(p.location || "") + "</span>"
      + '<span class="apprice">' + esc(String(p.price || "價格請洽詢").split("\n")[0]) + yieldLine + "</span>"
      + "</span></a>";
  }).join("");
  return '<section class="apsec"><h2>周周手上目前的投資物件</h2>'
    + '<p class="apsub">看完文章想直接看實際案例？這幾件是站上現在就有的（資料會隨物件更新自動同步）。</p>'
    + '<div class="apgrid">' + cards + "</div>"
    + '<a class="apmore" href="properties.html">看全部物件 →</a></section>';
}

const { buildRelMap } = require("./related.cjs");
const REL = buildRelMap(ART, a => !!(a.url || SLUG[a.id]));


// ── 頁面外殼共用片段（文章頁與落地頁共用；抽出來是為了讓兩邊永遠一致）──
const HEAD_SCRIPTS = `<script>/* 防複製守門：頁面若被開在非本站網域(有人抄走掛在別處)，在GA啟動前跳回正牌站 */(function(){var h=location.hostname;if(h&&h!=="chouchouinjapan.com"&&h!=="www.chouchouinjapan.com"&&h!=="janny00143.github.io"&&h!=="localhost"&&h!=="127.0.0.1"){location.replace("https://chouchouinjapan.com"+location.pathname);}})();</script>
<!--langredir--><script>(function(){try{var p=location.pathname.split('/').pop()||'index.html';if(p!=='ja.html'){var isCn=p.slice(-8)==='-cn.html';var L=localStorage.getItem('lang');if(L==='cn'&&!isCn){location.replace(p.slice(0,-5)+'-cn.html');return;}if(L==='tw'&&isCn){location.replace(p.slice(0,-8)+'.html');return;}}}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-lang]');if(!a)return;var l=a.getAttribute('data-lang');if(l==='tw'||l==='cn'){try{localStorage.setItem('lang',l);}catch(_){}}},true);})();</script>
<script>(function(){var css="html[data-fs=s]{--fs:1}html[data-fs=m]{--fs:1.1}html[data-fs=l]{--fs:1.22}.fsctl{position:fixed;left:14px;bottom:16px;z-index:60;display:flex;gap:2px;background:#fff;border:1px solid #e7e5e4;border-radius:999px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.12)}.fsctl button{border:none;background:none;cursor:pointer;font-size:13px;font-weight:700;color:#78716c;padding:5px 9px;border-radius:999px;font-family:inherit;line-height:1}.fsctl button.on{background:#f43f5e;color:#fff}";var st=document.createElement("style");st.textContent=css;(document.head||document.documentElement).appendChild(st);var f="m";try{f=localStorage.getItem("fs")||"m";}catch(e){}document.documentElement.setAttribute("data-fs",f);window.setFS=function(x){document.documentElement.setAttribute("data-fs",x);try{localStorage.setItem("fs",x);}catch(e){}u();};function u(){var c=document.documentElement.getAttribute("data-fs"),bs=document.querySelectorAll(".fsctl button");for(var i=0;i<bs.length;i++){bs[i].className=(bs[i].getAttribute("data-f")===c?"on":"");}}function init(){if(document.querySelector(".fsctl"))return;var d=document.createElement("div");d.className="fsctl";d.setAttribute("aria-label","字級調整");var labels=["小","中","大"],keys=["s","m","l"];for(var i=0;i<3;i++){(function(k,t){var btn=document.createElement("button");btn.textContent=t;btn.setAttribute("data-f",k);btn.onclick=function(){setFS(k);};d.appendChild(btn);})(keys[i],labels[i]);}document.body.appendChild(d);u();}if(document.body){init();}else{document.addEventListener("DOMContentLoaded",init);}})();</script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XN785WJLZ3"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-XN785WJLZ3");</script>
<meta name="viewport" content="width=device-width, initial-scale=1">`;
const SBAR = `<div class="sbar"><div class="wrap" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px"><a href="index.html" style="display:inline-flex;align-items:center;gap:7px;font-weight:800;color:var(--rose);font-size:17px"><img src="logo-mark.webp" alt="" style="height:28px;width:auto;display:block" width="420" height="501">周周・日本房仲</a><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div></div>`;
const FOOT = `<footer><div class="wrap row"><div><p style="font-weight:700">周周・日本房仲</p><p style="font-size:14px;color:var(--mut)">📍 東京23區為主，神奈川、千葉、橫濱周邊也服務</p></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div><div class="wrap" style="padding:0 16px 10px;display:flex;flex-wrap:wrap;gap:14px;font-size:13px"><a href="index.html" style="color:var(--mut)">首頁</a><a href="buy-property-in-japan.html" style="color:var(--mut)">📚 日本買房指南</a><a href="japan-real-estate-agent-for-taiwanese.html" style="color:var(--mut)">🤝 買房要找誰</a><a href="feedback.html" style="color:var(--mut)">💬 意見回饋</a><a href="tool-loan.html" style="color:var(--mut)">🧮 試算工具</a><a href="videos.html" style="color:var(--mut)">🎬 影片</a></div><div class="wrap cp">© 周周・日本房仲</div></footer>`;
const TAIL = `<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a&&a.href&&a.href.indexOf("lin.ee")>-1&&typeof gtag==="function"){gtag("event","line_click",{link_id:a.id||"",page:location.pathname});}});</script>
<button id="btt" aria-label="回到頂端">↑</button>
<script type="module" src="comments.js"></script>
<script>document.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('.ytf');if(f&&!f.dataset.l){f.dataset.l=1;f.innerHTML='<iframe src="https://www.youtube.com/embed/'+f.dataset.id+'?autoplay=1" title="影片" allow="autoplay;fullscreen" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>';}});</script>
<script>(function(){var rp=document.getElementById('rp'),btt=document.getElementById('btt');function os(){var h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,mx=h.scrollHeight-h.clientHeight;rp.style.width=(mx>0?sc/mx*100:0)+'%';btt.style.display=sc>500?'flex':'none';}window.addEventListener('scroll',os,{passive:true});os();btt.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};var post=document.querySelector('.post');if(post){var heads=[];post.querySelectorAll('h2.ah, p').forEach(function(el){var t='';if(el.tagName==='H2'){t=el.textContent.trim();}else{var fe=el.querySelector('b');if(!fe||el.firstElementChild!==fe)return;t=fe.textContent.trim();}if(t.length>=3&&t.length<=42)heads.push({p:el,t:t});});if(heads.length>=4){var toc=document.createElement('div');toc.className='toc collapsed';var tt=document.createElement('div');tt.className='toc-t';tt.innerHTML='📑 本篇目錄 <span class="toc-x"></span>';tt.onclick=function(){toc.classList.toggle('collapsed');};var list=document.createElement('div');list.className='toc-list';heads.forEach(function(h,i){var id='sec'+i;h.p.id=id;h.p.classList.add('sec');var a=document.createElement('a');a.href='#'+id;a.textContent=h.t;list.appendChild(a);});toc.appendChild(tt);toc.appendChild(list);post.parentNode.insertBefore(toc,post);}}})();</script>
<!--langswitch--><script>(function(){var p=location.pathname.split('/').pop()||'index.html';var isJa=(p==='ja.html');var isCn=(!isJa&&p.slice(-8)==='-cn.html');var twHref,cnHref;if(isJa){twHref='index.html';cnHref='index-cn.html';}else if(isCn){twHref=p.slice(0,-8)+'.html';cnHref=p;}else{twHref=p;cnHref=p.slice(0,-5)+'-cn.html';}var jaHref=isJa?'ja.html':(isCn?p.slice(0,-8)+'-ja.html':p.slice(0,-5)+'-ja.html');var cur=isJa?'ja':(isCn?'cn':'tw');function mk(label,href,key){var a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.textContent=label;a.setAttribute('data-lang',key);var active=(key===cur);a.style.cssText='display:block;padding:9px 14px;font-size:14px;text-decoration:none;border-radius:8px;white-space:nowrap;'+(active?'color:#f43f5e;font-weight:700;background:#fff1f2':'color:#292524');if(active)a.setAttribute('aria-current','page');return a;}var wrap=document.createElement('div');wrap.style.cssText='position:relative;flex:0 0 auto';var btn=document.createElement('button');btn.type='button';btn.textContent='🌐 語言';btn.setAttribute('aria-label','切換語言 / Language / 语言');btn.style.cssText='background:#fff;border:1px solid #e7e5e4;border-radius:999px;font-size:13px;font-weight:700;color:#57534e;padding:6px 12px;cursor:pointer;font-family:inherit;white-space:nowrap';var menu=document.createElement('div');menu.style.cssText='display:none;position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #e7e5e4;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px;min-width:130px;z-index:200';menu.appendChild(mk('繁體中文',twHref,'tw'));menu.appendChild(mk('简体中文',cnHref,'cn'));menu.appendChild(mk('日本語',jaHref,'ja'));btn.onclick=function(e){e.stopPropagation();menu.style.display=(menu.style.display==='block')?'none':'block';};document.addEventListener('click',function(){menu.style.display='none';});wrap.appendChild(btn);wrap.appendChild(menu);function insertInto(container,beforeEl){if(beforeEl&&beforeEl.parentNode===container){container.insertBefore(wrap,beforeEl);}else{container.appendChild(wrap);}}var sbarRow=document.querySelector('.sbar .wrap')||document.querySelector('.sbar .in');if(sbarRow){var line=sbarRow.querySelector('a[href*="lin.ee"]');if(line){var grp=document.createElement('div');grp.style.cssText='display:flex;align-items:center;gap:10px';line.parentNode.insertBefore(grp,line);grp.appendChild(wrap);grp.appendChild(line);}else{sbarRow.appendChild(wrap);}return;}var hdRight=document.querySelector('header .hd-right');if(hdRight){var line2=hdRight.querySelector('.btn-line');insertInto(hdRight,line2);return;}wrap.style.cssText+=';position:fixed;top:10px;right:12px;z-index:210';document.body.appendChild(wrap);})();</script>`;

function page(a) {
  const slug = SLUG[a.id];
  const url = BASE + slug + ".html";
  const c = cat(a.cat);
  const cover = coverURL(a);
  const bg = "background-image:" + (cover ? "url('" + cover + "')," : "") + c.g + (a.cpos ? ";background-position:" + a.cpos : "");
  const bodyHTML = a.body.map(p => { const t = p.trim(); if (t.startsWith("<div")) return p; if (/^(<b>)?(資料來源|本文為|※)/.test(t)) return '<p class="src">' + p + "</p>"; const m = t.match(/^<b>([\s\S]+)<\/b>$/); if (m) return '<h2 class="ah">' + m[1] + "</h2>"; const s2 = t.match(/^<b>([\s\S]*?)<\/b>([\s\S]*)$/); if (s2) { const rest = s2[2].trim(); return '<h2 class="ah sh2">' + s2[1] + "</h2>" + (rest ? "<p>" + rest + "</p>" : ""); } return "<p>" + p + "</p>"; }).join("");
  const em = ytEmbed(a.video);
  const vidId = em ? em.split("/embed/")[1] : "";
  const vid = em ? `<div class="vid"><div class="ytf" data-id="${vidId}"><img src="https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg" onerror="this.onerror=null;this.src=&#39;https://i.ytimg.com/vi/${vidId}/hqdefault.jpg&#39;" alt="影片" loading="lazy" width="1280" height="720"><span class="pbtn">▶</span></div></div>` : "";
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: a.title, description: a.seo || a.ex,
    inLanguage: "zh-Hant",
    datePublished: a.date, dateModified: a.date,
    author: AUTHOR_TW,
    publisher: PUBLISHER_TW,
    mainEntityOfPage: url
  };
  if (cover) ld.image = cover;
  const ldCrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "首頁", item: BASE },
    { "@type": "ListItem", position: 2, name: c.name, item: BASE + "#" + a.cat },
    { "@type": "ListItem", position: 3, name: a.title, item: url }
  ] };
  const t = esc(a.title) + "｜周周・日本房仲";
  const d = esc(a.seo || a.ex);   // seo：只給搜尋引擎看的長描述；沒填就用卡片摘要 ex
  const rel = REL[a.id] || [];   // 選文邏輯見 related.cjs（平均分散入連，避免孤兒文章）
  const relHTML = rel.length ? `<section style="margin-top:32px;border-top:1px solid var(--line);padding-top:18px"><h2 style="font-size:18px;margin-bottom:10px">延伸閱讀</h2>` + rel.map(r => `<a href="${r.url || SLUG[r.id] + ".html"}" style="display:block;padding:11px 0;border-bottom:1px solid var(--line)">→ ${r.title}</a>`).join("") + `</section>` : "";
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
${HEAD_SCRIPTS}
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${(a.tags||[]).join(",")},日本買房,日本不動產,台灣房仲,日本台灣房仲,台湾人仲介,中国語不動産仲介,華語房仲">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="zh-Hant" href="${url}">
<link rel="alternate" hreflang="zh-Hans" href="${url.replace(/\.html$/,"-cn.html")}">
<link rel="alternate" hreflang="ja" href="${url.replace(/\.html$/,"-ja.html")}">
<link rel="alternate" hreflang="x-default" href="${url}">${cover ? `
<link rel="preload" as="image" href="${cover}">` : ""}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:locale" content="zh_TW">
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
${SBAR}
<main class="wrap" style="max-width:760px;padding-top:18px">
<a class="back" href="index.html">← 回首頁</a>
<p style="font-size:13px;color:var(--mut);margin-bottom:14px"><a href="index.html" style="color:var(--mut)">首頁</a> › ${c.name}</p>
${a.coverFit === "full" ? `<img${wh(cover)} src="${cover}" alt="${esc(a.title)}" loading="lazy" style="width:100%;height:auto;border-radius:18px;display:block;margin:0 auto 20px">` : a.coverFit === "medium" ? `<img${wh(cover)} src="${cover}" alt="${esc(a.title)}" loading="lazy" style="display:block;margin:0 auto 20px;max-width:480px;width:100%;height:auto;border-radius:18px">` : a.coverFit === "contain" ? `<img${wh(cover)} src="${cover}" alt="${esc(a.title)}" loading="lazy" style="display:block;margin:0 auto 20px;max-width:100%;max-height:210px;width:auto;height:auto;border-radius:18px">` : `<div class="acov" style="${bg}"><span>${c.name}</span></div>`}
<h1 class="atitle" style="margin-bottom:10px">${a.title}</h1>
<div class="am" style="display:flex;gap:14px;color:var(--mut);font-size:14px;margin-bottom:16px"><span>撰寫者：周周</span><span>${a.date}</span></div>
<div class="share"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">f 分享</a><a href="https://www.threads.net/intent/post?text=${encodeURIComponent(a.title+" "+url)}" target="_blank" rel="noopener">Threads 分享</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener">𝕏 分享</a><a href="javascript:void(0)" onclick="navigator.clipboard&&navigator.clipboard.writeText('${url}');this.textContent='✓ 已複製';return false">🔗 複製連結</a></div>
<div class="post">
${bodyHTML}
</div>
${vid}
<div class="ablock" style="margin-top:26px"><div><b>這篇有幫到你嗎？有問題直接問我</b><br><span style="color:var(--mut);font-size:14px">看到喜歡的物件也可以直接貼給周周看看。</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div>
${propBlockHTML(a)}
${relHTML}
<div id="cmts" data-slug="${slug}" data-lang="tw"></div>
<p style="margin:30px 0;font-size:14px"><a href="index.html" style="color:var(--rose);font-weight:600">← 看更多周周的文章</a></p>
</main>
${FOOT}
${TAIL}
</body>
</html>`;
}

// ── 商業關鍵字落地頁（信任頁＋日本買房總覽 hub）──────────────────────
// 這兩頁不是文章（不進 ART），但要跟文章頁長得一樣、共用同一套外殼。
// 內容改這裡、重跑 generate-pages.cjs 即可；-cn 由 build-cn 自動產生、-ja 在 build-ja.cjs。
function landing(cfg) {
  const url = BASE + cfg.slug + ".html";
  const t = esc(cfg.metaTitle);
  const d = esc(cfg.desc);
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
${HEAD_SCRIPTS}
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${esc(cfg.keywords)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="zh-Hant" href="${url}">
<link rel="alternate" hreflang="zh-Hans" href="${BASE + cfg.slug}-cn.html">
<link rel="alternate" hreflang="ja" href="${BASE + cfg.slug}-ja.html">
<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="zh_TW">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
${cfg.ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}</script>`).join("\n")}
${STYLE}
</head>
<body>
<div id="rp"></div>
${SBAR}
<main class="wrap" style="max-width:820px;padding-top:18px">
<a class="back" href="index.html">← 回首頁</a>
<p style="font-size:13px;color:var(--mut);margin-bottom:14px"><a href="index.html" style="color:var(--mut)">首頁</a> › ${esc(cfg.crumb)}</p>
<h1 class="atitle" style="margin-bottom:10px">${cfg.h1}</h1>
<p style="color:var(--mut);font-size:15px;margin-bottom:22px">${cfg.lead}</p>
<div class="post">
${cfg.main}
</div>
<div class="ablock" style="margin-top:30px"><div><b>${cfg.ctaTitle}</b><br><span style="color:var(--mut);font-size:14px">${cfg.ctaSub}</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">加 LINE 諮詢</a></div>
<p style="margin:30px 0;font-size:14px"><a href="index.html" style="color:var(--rose);font-weight:600">← 回首頁看更多</a></p>
</main>
${FOOT}
${TAIL}
</body>
</html>`;
}

const FAQ_AGENT = [
  ["在日本買房，找台灣人房仲會不會比較貴？",
   "不會。日本的仲介報酬上限是由宅地建物取引業法（宅建業法）的報酬告示訂的，成交價 400 萬日圓以上的部分，上限是「成交價 × 3% ＋ 6 萬日圓＋消費稅」，跟承辦人的國籍無關。你付的是同一套法定上限的費用，差別在於服務內容——有沒有人用中文把重要事項說明逐條講給你聽、有沒有人在交屋後還接你的訊息。"],
  ["我人在台灣，可以全程遠端買日本的房子嗎？",
   "大部分流程可以遠端進行：線上看屋（我到現場開視訊帶你走一遍）、資料與試算用訊息往返、文件以國際郵件處理。但簽約與交屋結算（決済）的實務安排會依物件、賣方與銀行而不同，有些情況仍需本人到日本一趟，或事先辦好在留證明與簽名證明。實際怎麼安排，我會在一開始就先跟你確認清楚。"],
  ["怎麼確認一個日本房仲是合法的？",
   "看「宅地建物取引業者免許番号」。這是公開資訊，可以到各都道府縣的宅建業者查詢系統輸入號碼查證，能看到公司名稱、所在地與有效期間。周周所屬的株式会社アンドプラス，免許番号是東京都知事 (2) 第102938号。查不到、或對方支支吾吾不給號碼的，就要特別小心。"],
  ["房仲可以幫我辦貸款、報稅、辦簽證嗎？",
   "貸款的部分我可以幫你對接銀行、準備文件、陪同面談，但能不能貸、可貸成數依個案與銀行審查為準，我不會給你保證。稅務請由稅理士確認、登記與契約由司法書士與宅建士負責、簽證與在留資格屬行政書士的專業範圍。我手上有長期配合的專業人士可以引薦，但不會替他們做判斷。"],
  ["在日本買房可以拿到簽證嗎？",
   "買房本身通常不等於取得簽證或移民資格。日本沒有「買房換居留」的制度，要長住需要另外規劃在留資格（例如經營管理簽證有它自己的要件與審查）。如果你的目標是長住，建議把買房與在留資格分成兩件事來規劃，簽證的部分請諮詢行政書士。"]
];

function pageAgentTW() {
  const slug = "japan-real-estate-agent-for-taiwanese";
  const url = BASE + slug + ".html";
  const row = (a, b, c, dd) => `<tr><td style="padding:10px 12px;border-bottom:1px solid var(--line);font-weight:700">${a}</td><td style="padding:10px 12px;border-bottom:1px solid var(--line)">${b}</td><td style="padding:10px 12px;border-bottom:1px solid var(--line)">${c}</td><td style="padding:10px 12px;border-bottom:1px solid var(--line)">${dd}</td></tr>`;
  const main = `
<p>「我想在日本買房，可是不知道要找誰。」這是我最常收到的第一句話。</p>
<p>大部分人以為只有兩個選項——台灣的海外置產說明會，或是硬著頭皮寫信給日本的仲介。其實你有三種選擇，而它們的物件來源、收費方式、服務會停在哪裡，差滿多的。這頁把三種攤開來講，最後再給你一份「不管找誰都該先驗的四件事」。</p>

<h2 class="ah">三種選擇，先看整體差異</h2>
<div style="overflow-x:auto;margin:14px 0 6px">
<table style="width:100%;min-width:620px;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid var(--line);border-radius:14px">
<thead><tr style="background:rgba(244,63,94,.06)"><th style="padding:10px 12px;text-align:left"></th><th style="padding:10px 12px;text-align:left">台灣的海外置產業者</th><th style="padding:10px 12px;text-align:left">日本當地仲介</th><th style="padding:10px 12px;text-align:left">在日執業的華語房仲</th></tr></thead>
<tbody>
${row("物件來源", "多半是合作建商的新成屋或特定案源", "REINS 全國聯賣網，最完整", "同樣走 REINS，中古、新成屋、自社物件都能找")}
${row("溝通語言", "中文", "日文為主", "中文，日文對日本端")}
${row("看房", "多半是集體看房團或代看", "自行到現場", "現場帶看，人在海外可線上看屋")}
${row("重要事項說明", "在日本端由日本業者執行", "日文進行", "由公司宅建士執行，中文逐條說明")}
${row("交屋之後", "通常止於成交", "日文往來", "租賃管理、稅務窗口引薦、生活雜事")}
${row("費用結構", "依業者，可能含在總價內", "法定報酬上限", "同樣是法定報酬上限")}
</tbody></table></div>
<p style="font-size:13px;color:var(--mut)">※ 上表是三種型態的一般狀況整理，個別公司的做法會有差異，實際請直接向承辦人確認。</p>

<h2 class="ah">一、台灣的海外置產業者：門檻最低，但物件是「被選過的」</h2>
<p>好處很明顯：全中文、在台灣就能談、有說明會可以先聽。對完全沒有頭緒的人來說，這是最容易踏出的第一步。</p>
<p>要知道的是，這類業者能給你看的物件，通常來自它與特定建商或日本業者的合作關係，所以你看到的是「已經被篩選過的一小池」，而不是日本市場上全部的選擇。另外，服務多半在成交那一刻結束——之後房子要租給誰、稅要怎麼報、水電怎麼開通，得自己再找人。</p>
<p>這不是說不能找，而是你要知道自己拿到的是什麼：便利，換的是選擇範圍與後續服務。</p>

<h2 class="ah">二、日本當地仲介：物件最完整，但制度落差是真的</h2>
<p>日本的仲介都能接到 REINS（不動產流通機構）上的物件，理論上選擇最完整。問題出在你看不看得懂、問不問得出來。</p>
<p>重要事項說明書一份幾十頁全是法律用語；管理規約裡寫著能不能養寵物、能不能做民泊；修繕積立金為什麼過幾年會漲；土地是所有權還是借地權。這些不是翻譯軟體能解決的——你得先知道「要問什麼」，才問得出來。</p>
<p>再加上外國人在日本貸款的條件跟日本人不同，很多當地仲介不熟悉非居住者的流程，光是這一關就會卡住。</p>

<h2 class="ah">三、在日本執業的華語房仲：兩邊的介面</h2>
<p>這就是我在做的事。人在東京、在日本的公司底下執業，物件走的是跟日本仲介同一套 REINS 系統，但整個過程用中文跟你溝通。</p>
<p>差別不在「會講中文」——差別在我知道台灣人會在哪裡卡住。你不會想到要問管理規約有沒有禁止出租，不會知道固都稅是按 1 月 1 日的所有人課的，不會注意到那個「新耐震」其實是 1981 年 6 月以後申請建築確認的才算。這些是我平常在文章裡一直寫的東西，也是實際帶看時會一項一項提醒你的。</p>
<p>另外一個實際的差別是交屋之後。買完才是開始——租賃管理要找誰、每年的固都稅單寄到哪裡、要報稅該找哪位稅理士、日本的門號跟水電怎麼開。這些我都還在。</p>

<h2 class="ah">不管你最後找誰，先驗這四件事</h2>
<p><b>一、要得到宅地建物取引業者免許番号。</b>這是公開資訊，可以到各都道府縣的宅建業者查詢系統輸入號碼查證，看得到公司名稱、所在地與有效期間。給不出號碼、或含糊帶過的，直接跳過。</p>
<p><b>二、確認重要事項說明由誰做。</b>依日本法律，簽約前的重要事項說明必須由宅地建物取引士（宅建士）進行。你要問清楚：誰是宅建士、用什麼語言進行、有沒有人幫你逐條翻譯。</p>
<p><b>三、看對方是不是實名露臉。</b>只有一個通訊軟體帳號、沒有公司、沒有影片、沒有可查證的登錄資訊——這種在哪個國家都不該交錢。</p>
<p><b>四、聽他敢不敢說「不知道」。</b>會跟你說「保證過件」「穩賺」「一定能貸八成」的人，才是真正要小心的。貸款依個案與銀行審查、稅額請稅理士確認、登記與契約由司法書士與宅建士負責——這些界線清楚的人，通常才是真的懂。</p>

<h2 class="ah">關於我</h2>
<p>我是周欣妤（シュウ シンユウ），大家都叫我周周，台灣人，在東京的<b>株式会社アンドプラス 住宅營業部</b>做房仲，服務以東京 23 區為主，神奈川、千葉、橫濱周邊也可以。公司的宅地建物取引業者免許番号是<b>東京都知事 (2) 第102938号</b>，你可以自己去查。</p>
<p>更完整的自我介紹、我實際能幫你做什麼、以及我不會做的事，寫在<a href="about.html">關於周周</a>這頁。想先了解整個買房流程，可以從<a href="buy-property-in-japan.html">日本買房完全指南</a>開始；想直接看物件，就到<a href="properties.html">在售物件</a>。</p>

<h2 class="ah">常見問題</h2>
${FAQ_AGENT.map(q => `<div class="faq"><p style="font-weight:800;margin-bottom:6px">${q[0]}</p><p style="margin:0;color:var(--mut)">${q[1]}</p></div>`).join("\n")}

<p class="src">※ 本頁為服務說明，非投資建議。仲介報酬上限依宅地建物取引業法之報酬告示；能否貸款與可貸成數依個案與銀行審查為準；稅額請由稅理士確認；登記與契約由司法書士／宅建士確認；買房本身通常不等於取得簽證或移民資格，在留資格請諮詢行政書士。制度可能調整，實際請以官方最新公告為準。</p>`;
  return landing({
    slug,
    metaTitle: "在日本買房要找誰？台灣人房仲、日本當地仲介、海外置產業者比較｜周周・日本房仲",
    h1: "在日本買房要找誰？三種選擇的實際差別",
    lead: "台灣的海外置產業者、日本當地仲介、在日本執業的華語房仲——物件來源、收費、服務停在哪裡都不一樣。這頁把三種攤開來比，最後附上一份「不管找誰都該先驗的四件事」。",
    crumb: "找房仲",
    desc: "在日本買房該找台灣的海外置產業者、日本當地仲介，還是在日本執業的華語房仲？這頁比較三者的物件來源、溝通語言、重要事項說明、交屋後服務與費用結構，並整理挑房仲一定要先驗證的四件事：宅地建物取引業者免許番号怎麼查、重要事項說明由誰執行、是否實名露臉、以及對方敢不敢說「不知道」。附常見問題與周周（株式会社アンドプラス 住宅營業部）的登錄資訊。",
    keywords: "日本房仲推薦,台灣人房仲,日本買房中文服務,日本不動產仲介,東京房仲,華語房仲,日本買房要找誰,海外置產,宅建業者免許番号",
    ctaTitle: "還在猶豫要找誰？先聊聊你的狀況就好",
    ctaSub: "預算、想住哪一區、自住還是收租，跟我說一聲，我先幫你判斷方向，不用急著決定。",
    ld: [
      { "@context": "https://schema.org", "@type": "WebPage", name: "在日本買房要找誰？三種選擇的實際差別", inLanguage: "zh-Hant", url, description: "比較台灣的海外置產業者、日本當地仲介與在日本執業的華語房仲，並整理挑房仲要先驗證的四件事。", publisher: PUBLISHER_TW, about: { "@type": "RealEstateAgent", name: "周周・日本房仲", url: BASE } },
      { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "zh-Hant", mainEntity: FAQ_AGENT.map(q => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "首頁", item: BASE },
        { "@type": "ListItem", position: 2, name: "在日本買房要找誰", item: url }
      ] }
    ],
    main
  });
}

// hub 的分類導言：只做「引路」，不重講文章內容
const HUB_CAT_LEAD = {
  foreign: "外國人到底能不能買、要準備什麼文件、錢怎麼匯過去——沒有身分限制，但流程跟台灣不一樣。",
  live: "自住的人最在意的是生活：格局、坐向、浴廁分離、乾燥機、驗屋要看哪裡。",
  invest: "收租最容易踩的坑不是買貴，是把投報率算錯、把空窗與費用漏掉。",
  minpaku: "民泊 180 天、旅館業許可、管理規約——動手買之前先確認法規這關過不過得了。",
  area: "同樣是東京，一個區跟隔壁區的單價與生活感可以差很多。",
  travel: "來看房順便走走，或想知道那一帶實際住起來是什麼樣子。",
  loan: "外國人的貸款條件跟日本人不同，稅則是買前、持有中、賣出各一套。",
  life: "買完之後才開始的事：水電、門號、駕照、防災、看醫生。",
  knowhow: "看房、談價、簽約、交屋——實務上會用到的通用知識。"
};
const HUB_STEPS = [
  ["1. 先搞懂遊戲規則", "外國人在日本買房沒有身分限制，但流程、費用、稅制跟台灣差很多。先把全貌看過一遍。", "japan-property-buying-guide"],
  ["2. 算清楚總共要準備多少錢", "總價之外還有取得諸費用（仲介報酬、印紙稅、登記費用、不動產取得稅等），先抓一個實際的預算。", "japan-property-purchase-costs"],
  ["3. 決定自住還是收租，方向完全不同", "自住看生活機能與格局，收租看的是能不能穩定出租、未來好不好賣。", "rent-or-buy-japan"],
  ["4. 看房、出價、簽約、交屋", "從看房到交屋大約要多久、每一關要準備什麼文件，事先知道就不會慌。", "japan-property-contract-documents"]
];
const HUB_TOOLS = [
  ["tool-loan.html", "🧮 房貸試算", "輸入總價、頭期、利率與年限，估月付金額"],
  ["tool-cost.html", "💰 取得諸費用試算", "抓出總價之外還要準備多少現金"],
  ["tool-yield.html", "📈 投報率試算", "表面與實質兩種算法一起看"],
  ["tool-fx.html", "💱 日圓換算", "台幣、港幣與日圓的即時換算"],
  ["tool-area.html", "📐 坪・平方公尺換算", "坪、㎡、疊三種單位互換"],
  ["tool-agent.html", "🔍 房仲免許查詢說明", "教你怎麼查對方的宅建業者登錄"],
  ["translate.html", "🈳 房產圖面翻譯機", "把日文的販售圖面翻成中文"]
];

function pageHubTW() {
  const slug = "buy-property-in-japan";
  const url = BASE + slug + ".html";
  const byCat = {};
  for (const a of ART) {
    if (!a.url && !SLUG[a.id]) continue;
    (byCat[a.cat] = byCat[a.cat] || []).push(a);
  }
  for (const k in byCat) byCat[k].sort((x, y) => (y.date || "").localeCompare(x.date || ""));
  const order = CATS.map(c => c.id).filter(id => byCat[id] && byCat[id].length);
  const href = a => a.url || SLUG[a.id] + ".html";
  const total = Object.values(byCat).reduce((n, v) => n + v.length, 0);

  const stepHTML = HUB_STEPS.map((s, i) => `<div style="background:#fff;border:1px solid var(--line);border-left:4px solid var(--rose);border-radius:14px;padding:14px 16px;margin-bottom:10px"><p style="font-weight:800;margin:0 0 4px">${s[0]}</p><p style="margin:0 0 8px;color:var(--mut);font-size:14px">${s[1]}</p><a href="${s[2]}.html" style="color:var(--rose);font-weight:700;font-size:14px">→ ${ART.find(a => SLUG[a.id] === s[2]) ? ART.find(a => SLUG[a.id] === s[2]).title : "看這篇"}</a></div>`).join("\n");

  const catHTML = order.map(id => {
    const c = cat(id);
    const list = byCat[id];
    return `<h2 class="ah" id="cat-${id}">${c.name}（${list.length} 篇）</h2>
<p style="color:var(--mut);font-size:14px;margin:-4px 0 10px">${HUB_CAT_LEAD[id] || ""}</p>
<ul style="list-style:none;padding:0;margin:0 0 8px">${list.map(a => `<li style="padding:9px 0;border-bottom:1px solid var(--line)"><a href="${href(a)}" style="font-weight:600">${esc(a.title)}</a><br><span style="color:var(--mut);font-size:13px">${esc((a.ex || "").slice(0, 62))}${(a.ex || "").length > 62 ? "…" : ""}</span></li>`).join("")}</ul>`;
  }).join("\n");

  const toolHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:12px 0">${HUB_TOOLS.map(t => `<a href="${t[0]}" style="display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px 15px"><span style="font-weight:800">${t[1]}</span><br><span style="color:var(--mut);font-size:13px">${t[2]}</span></a>`).join("")}</div>`;

  const main = `
<p>這一頁是整個網站的目錄。我在這裡寫了 <b>${total} 篇</b>關於在日本買房的文章，從「外國人到底能不能買」一路到「買完之後水電怎麼開」，全部用繁體中文寫，也全部是我自己在東京第一線遇到的事。</p>
<p>不知道從哪裡開始的話，先照下面四步走一遍；已經有方向的，直接跳到你要的主題就好。</p>

<h2 class="ah">第一次買，就照這四步</h2>
${stepHTML}

<h2 class="ah">先算一遍，再看房</h2>
<p>看房之前先把數字抓出來，比較不會白跑。這些工具都免費、不用註冊：</p>
${toolHTML}

<h2 class="ah">想直接看物件</h2>
<p>目前在售的物件都放在<a href="properties.html">物件專區</a>，可以用預算、用途（自住／收租）、格局篩選，每一件都有照片、間取圖與費用明細。想知道自己的預算在東京能買到什麼，也可以先做<a href="quiz.html">兩分鐘的購屋方向測驗</a>。</p>
<p>另外，<a href="tokyo-area-guide.html">東京區域導覽</a>整理了 23 區的行情與生活感，<a href="videos.html">影片區</a>有實際的看房影片，<a href="translate.html">房產圖面翻譯機</a>可以把日文的販售圖面翻成中文。</p>

<h2 class="ah">依主題找文章</h2>
<p style="color:var(--mut);font-size:14px;margin:-4px 0 14px">共 ${total} 篇，依分類排列，同一類裡新的在前面。</p>
${catHTML}

<h2 class="ah">找人問比較快的話</h2>
<p>文章都是通則，你的狀況一定有它自己的細節。預算多少、想住哪一區、自住還是收租、有沒有貸款需求——這些直接跟我說，我可以先幫你判斷方向。我是周周，台灣人，在東京的株式会社アンドプラス 住宅營業部做房仲，詳細的自我介紹在<a href="about.html">關於周周</a>，不確定要找哪一種仲介的話可以先看<a href="japan-real-estate-agent-for-taiwanese.html">在日本買房要找誰</a>。</p>

<p class="src">※ 本頁為文章總覽。站上內容僅供參考，實際條件以現況與重要事項說明書為準；能否貸款與可貸成數依個案與銀行審查為準；稅額請由稅理士確認；登記與契約由司法書士／宅建士確認；買房本身通常不等於取得簽證或移民資格。</p>`;

  const items = [];
  for (const id of order) for (const a of byCat[id]) items.push({ "@type": "ListItem", position: items.length + 1, url: BASE + href(a), name: a.title });

  return landing({
    slug,
    metaTitle: "日本買房完全指南｜外國人在日本買房的第一站（總覽）｜周周・日本房仲",
    h1: "日本買房完全指南",
    lead: "外國人在日本買房要知道的一切，一頁看完。買房流程、費用與稅、貸款、自住與收租、民泊法規、區域行情、買完之後的生活——全部用繁體中文整理在這裡。",
    crumb: "日本買房總覽",
    desc: "外國人在日本買房的完整入口：買房流程、取得諸費用與稅、外國人貸款、自住與收租的差別、民泊與旅館業法規、東京 23 區行情、契約與交屋、買完之後的水電門號駕照。共 " + total + " 篇繁體中文文章，加上房貸／諸費用／投報率／匯率／坪數換算等免費試算工具與在售物件專區。由在東京執業的台灣人房仲周周（株式会社アンドプラス 住宅營業部）撰寫。",
    keywords: "日本買房,日本買房流程,外國人在日本買房,日本不動產,東京買房,日本房產投資,日本房貸,日本買房費用,日本買房指南",
    ctaTitle: "看完還是不確定該從哪裡下手？直接問我",
    ctaSub: "跟我說你的預算與想住的區域，我幫你把方向抓出來，不用先決定要不要買。",
    ld: [
      { "@context": "https://schema.org", "@type": "CollectionPage", name: "日本買房完全指南", inLanguage: "zh-Hant", url, description: "外國人在日本買房的完整文章總覽、試算工具與在售物件入口。", publisher: PUBLISHER_TW },
      { "@context": "https://schema.org", "@type": "ItemList", name: "日本買房文章總覽", numberOfItems: items.length, itemListElement: items },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "首頁", item: BASE },
        { "@type": "ListItem", position: 2, name: "日本買房完全指南", item: url }
      ] }
    ],
    main
  });
}


// 產生文章頁
let made = [];
for (const a of ART) {
  if (a.url) continue;            // a4 民宿用既有 minpaku.html
  if (!SLUG[a.id]) continue;
  fs.writeFileSync(ROOT + "/" + SLUG[a.id] + ".html", page(a));
  made.push(SLUG[a.id] + ".html");
}

// 商業關鍵字落地頁（繁中；-cn 由 build-cn 產生、-ja 在 build-ja.cjs）
fs.writeFileSync(ROOT + "/japan-real-estate-agent-for-taiwanese.html", pageAgentTW());
fs.writeFileSync(ROOT + "/buy-property-in-japan.html", pageHubTW());
console.log("落地頁: japan-real-estate-agent-for-taiwanese.html / buy-property-in-japan.html");

// sitemap
const urls = [];
urls.push({ loc: BASE, pr: "1.0", cf: "weekly" });
for (const a of ART) {
  if (a.url) { urls.push({ loc: BASE + a.url, lm: a.date, pr: "0.7" }); }
  else if (SLUG[a.id]) { urls.push({ loc: BASE + SLUG[a.id] + ".html", lm: a.date, pr: "0.8" }); }
}
urls.push({ loc: BASE + "translate.html", pr: "0.6" });
urls.push({ loc: BASE + "properties.html", pr: "0.9", cf: "weekly" });   // 物件專區：周周指示要能被搜到，權重僅次於首頁
urls.push({ loc: BASE + "properties-ja.html", pr: "0.9", cf: "weekly" });
urls.push({ loc: BASE + "property-types.html", pr: "0.6" });
urls.push({ loc: BASE + "property-types-ja.html", pr: "0.6" });
urls.push({ loc: BASE + "tokyo-area-guide.html", pr: "0.7" });
urls.push({ loc: BASE + "tokyo-area-guide-ja.html", pr: "0.7" });
urls.push({ loc: BASE + "ja.html", pr: "0.7" });
for (const a of ART) {
  if (a.url) continue;
  if (SLUG[a.id]) urls.push({ loc: BASE + SLUG[a.id] + "-ja.html", lm: a.date, pr: "0.7" });
}
urls.push({ loc: BASE + "minpaku-ja.html", pr: "0.6" });
const STATIC_TOOLS = ["tools", "videos", "feedback", "tool-agent", "tool-area", "tool-convert", "tool-cost", "tool-fx", "tool-loan", "tool-yield"];
for (const p of STATIC_TOOLS) {
  urls.push({ loc: BASE + p + ".html", pr: "0.6" });
  urls.push({ loc: BASE + p + "-ja.html", pr: "0.6" });
}
urls.push({ loc: BASE + "translate-ja.html", pr: "0.6" });
urls.push({ loc: BASE + "quiz.html", pr: "0.6" });
// 商業關鍵字落地頁：hub 是「日本買房」的入口，權重高於一般文章
urls.push({ loc: BASE + "buy-property-in-japan.html", pr: "0.9", cf: "weekly" });
urls.push({ loc: BASE + "buy-property-in-japan-ja.html", pr: "0.7", cf: "weekly" });
urls.push({ loc: BASE + "japan-real-estate-agent-for-taiwanese.html", pr: "0.8" });
urls.push({ loc: BASE + "japan-real-estate-agent-for-taiwanese-ja.html", pr: "0.7" });
urls.push({ loc: BASE + "about.html", pr: "0.8" });      // 作者介紹頁：E-E-A-T 的權威來源
urls.push({ loc: BASE + "about-ja.html", pr: "0.8" });
urls.push({ loc: BASE + "privacy.html", pr: "0.3" });
urls.push({ loc: BASE + "privacy-ja.html", pr: "0.3" });
urls.push({ loc: BASE + "partners.html", pr: "0.6" });
urls.push({ loc: BASE + "partners-ja.html", pr: "0.5" });
// 日本語専用のランディング（売主・同業者向け）。中文版は存在しないので ja だけ。
urls.push({ loc: BASE + "sell-your-property-ja.html", pr: "0.8" });
// 轉址殼頁（<meta http-equiv="refresh">，例如 tools.html／tool-convert.html）不可進 sitemap：
// sitemap 說「請收錄」、頁面卻立刻轉走，Search Console 會報「網頁會重新導向」而排除。
// 跟 noindex 頁一樣的道理，統一在這裡過濾掉。
const isRedirectStub = loc => {
  const f = loc.replace(BASE, "");
  if (!f || !f.endsWith(".html")) return false;
  try { return /<meta[^>]+http-equiv=["']refresh["']/i.test(fs.readFileSync(ROOT + "/" + f, "utf8")); }
  catch (e) { return false; }
};
// sitemap 的 lastmod：沒有明確日期的頁面（工具頁、關於頁等），用「該檔在 git 的最後修改日」，
// 查不到（例如新檔還沒 commit）就退回檔案系統的 mtime。不編日期。
const _lmCache = {};
// 三個「文章總覽」頁（首頁三語）的內容會隨最新文章改變，但 sitemap 是在 commit
// 之前產生的，git log 只查得到上一次的 commit 日期，於是永遠慢一個 commit
// （下次重跑產生器才補上，看起來就像產生器不冪等）。這裡取「git 日期」與
// 「ART 最新文章日期」兩者較大的那個，兩個都是真實日期，不編造。
const HUB_PAGES = new Set(["index.html", "ja.html", "index-cn.html", "buy-property-in-japan.html", "buy-property-in-japan-cn.html", "buy-property-in-japan-ja.html"]);
const NEWEST_ART = ART.reduce((m, a) => (a.date && a.date > m ? a.date : m), "");
const fileLastMod = loc => {
  const f = loc.replace(BASE, "") || "index.html";   // 根網址 "/" 就是 index.html
  if (!f.endsWith(".html")) return "";
  if (_lmCache[f] !== undefined) return _lmCache[f];
  let d = "";
  try {
    d = require("child_process")
      .execSync(`git log -1 --format=%cs -- "${f}"`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch (e) { d = ""; }
  if (!d) {
    try { d = new Date(fs.statSync(ROOT + "/" + f).mtime).toISOString().slice(0, 10); }
    catch (e) { d = ""; }
  }
  if (HUB_PAGES.has(f) && NEWEST_ART > d) d = NEWEST_ART;
  _lmCache[f] = d;
  return d;
};
const urlsOut = urls.filter(u => !isRedirectStub(u.loc)).map(u => (u.lm ? u : { ...u, lm: fileLastMod(u.loc) }));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urlsOut.map(u => `<url><loc>${u.loc}</loc>${u.lm ? `<lastmod>${u.lm}</lastmod>` : ""}${u.cf ? `<changefreq>${u.cf}</changefreq>` : ""}<priority>${u.pr}</priority></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(ROOT + "/sitemap.xml", sitemap);

// robots
fs.writeFileSync(ROOT + "/robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /property-admin.html\n\nSitemap: ${BASE}sitemap.xml\n`);

console.log("產生文章頁:", made.length, "篇");
console.log(made.join("\n"));
console.log("sitemap.xml + robots.txt 已產生");
