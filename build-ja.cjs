/* 產生日文版文章頁（-ja.html）。translate-jobs/ja-content.json 提供翻譯後的 title/ex/tags/body。
   用法：先跑 node generate-pages.cjs，再跑 node build-ja.cjs */
const fs = require("fs");
const vm = require("vm");

/* 投資系の記事末尾に「販売中の投資物件」を出すため、properties.js と日本語オーバーライドを読み込む。
   データは properties.js の一箇所だけ。ジェネレーターを回せば記事ページも自動で同期される。 */
function loadProps(file, key) {
  try {
    const ctx = { document: {} }; ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(__dirname + "/" + file, "utf8"), ctx);
    return ctx[key] || null;
  } catch (e) { console.warn("読み込み失敗 " + file + "：" + e.message); return null; }
}
const PROPS_RAW = loadProps("properties.js", "PROPERTIES") || [];
const PROPS_JA_OV = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
const PROPS = PROPS_RAW.map(p => Object.assign({}, p, PROPS_JA_OV[p.id] || {}));
const BASE = "https://chouchouinjapan.com/";

/* ── 著者・発行者の権威情報（E-E-A-T）──
   宅建士資格・免許番号・SNSを構造化データに接続し、about-ja.html を指す。
   変更時はここだけ直すこと。 */
const AUTHOR_JA = {
  "@type": "Person",
  name: "周欣妤",
  alternateName: ["シュウ シンユウ", "周周"],
  url: BASE + "about-ja.html",
  jobTitle: "不動産仲介",
  knowsLanguage: ["ja", "zh-Hant", "zh-Hans"],
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
const PUBLISHER_JA = {
  "@type": "RealEstateAgent",
  name: "周周・日本の不動産（株式会社アンドプラス）",
  url: BASE,
  identifier: { "@type": "PropertyValue", name: "宅地建物取引業者免許番号", value: "東京都知事 (2) 第102938号" },
  address: { "@type": "PostalAddress", addressCountry: "JP", postalCode: "150-0032",
             addressRegion: "東京都", addressLocality: "渋谷区", streetAddress: "鶯谷町3-1 ＳＵビル301号" }
};

const ROOT = __dirname;

let src = fs.readFileSync(ROOT + "/index.html", "utf8");
const ART = eval("[" + src.match(/const ART=\[([\s\S]*?)\n\];/)[1] + "]");
const S = eval("(" + src.match(/const S = (\{[\s\S]*?\n\});/)[1] + ")");
const STYLE = src.match(/<style>[\s\S]*?<\/style>/)[0];

/* ── 三語頁面共用的區塊 ─────────────────────────────────────
   文章頁與日文落地頁（sell-your-property-ja.html）共用同一組
   head 內嵌 script、頂欄與頁尾，抽成常數避免兩邊各寫一份而走鐘。
   內容原封不動，只是換個地方放。 */
const HEAD_SCRIPTS = `<script>/* 防複製守門：頁面若被開在非本站網域(有人抄走掛在別處)，在GA啟動前跳回正牌站 */(function(){var h=location.hostname;if(h&&h!=="chouchouinjapan.com"&&h!=="www.chouchouinjapan.com"&&h!=="janny00143.github.io"&&h!=="localhost"&&h!=="127.0.0.1"){location.replace("https://chouchouinjapan.com"+location.pathname);}})();</script>
<!--langredir--><script>(function(){try{var p=location.pathname.split('/').pop()||'index.html';if(p!=='ja.html'&&p.slice(-8)!=='-ja.html'){var isCn=p.slice(-8)==='-cn.html';var L=localStorage.getItem('lang');if(L==='cn'&&!isCn){location.replace(p.slice(0,-5)+'-cn.html');return;}if(L==='tw'&&isCn){location.replace(p.slice(0,-8)+'.html');return;}}}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-lang]');if(!a)return;var l=a.getAttribute('data-lang');if(l==='tw'||l==='cn'){try{localStorage.setItem('lang',l);}catch(_){}}},true);})();</script>
<script>(function(){var css="html[data-fs=s]{--fs:1}html[data-fs=m]{--fs:1.1}html[data-fs=l]{--fs:1.22}.fsctl{position:fixed;left:14px;bottom:16px;z-index:60;display:flex;gap:2px;background:#fff;border:1px solid #e7e5e4;border-radius:999px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.12)}.fsctl button{border:none;background:none;cursor:pointer;font-size:13px;font-weight:700;color:#78716c;padding:5px 9px;border-radius:999px;font-family:inherit;line-height:1}.fsctl button.on{background:#f43f5e;color:#fff}";var st=document.createElement("style");st.textContent=css;(document.head||document.documentElement).appendChild(st);var f="m";try{f=localStorage.getItem("fs")||"m";}catch(e){}document.documentElement.setAttribute("data-fs",f);window.setFS=function(x){document.documentElement.setAttribute("data-fs",x);try{localStorage.setItem("fs",x);}catch(e){}u();};function u(){var c=document.documentElement.getAttribute("data-fs"),bs=document.querySelectorAll(".fsctl button");for(var i=0;i<bs.length;i++){bs[i].className=(bs[i].getAttribute("data-f")===c?"on":"");}}function init(){if(document.querySelector(".fsctl"))return;var d=document.createElement("div");d.className="fsctl";d.setAttribute("aria-label","文字サイズ");var labels=["小","中","大"],keys=["s","m","l"];for(var i=0;i<3;i++){(function(k,t){var btn=document.createElement("button");btn.textContent=t;btn.setAttribute("data-f",k);btn.onclick=function(){setFS(k);};d.appendChild(btn);})(keys[i],labels[i]);}document.body.appendChild(d);u();}if(document.body){init();}else{document.addEventListener("DOMContentLoaded",init);}})();</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XN785WJLZ3"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-XN785WJLZ3");</script>`;
const SBAR = `<div class="sbar"><div class="wrap" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px"><a href="ja.html" style="display:inline-flex;align-items:center;gap:7px;font-weight:800;color:var(--rose);font-size:17px"><img src="logo-mark.webp" alt="" style="height:28px;width:auto;display:block" width="420" height="501">周周・日本の不動産</a><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div></div>`;
const FOOT = `<footer><div class="wrap row"><div><p style="font-weight:700">周周・日本の不動産</p><p style="font-size:14px;color:var(--mut)">📍 東京23区を中心に、神奈川・千葉・横浜エリアにも対応しています。</p></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div><div class="wrap" style="padding:0 16px 10px;display:flex;flex-wrap:wrap;gap:14px;font-size:13px"><a href="ja.html" style="color:var(--mut)">ホーム</a><a href="buy-property-in-japan-ja.html" style="color:var(--mut)">📚 記事一覧</a><a href="japan-real-estate-agent-for-taiwanese-ja.html" style="color:var(--mut)">🤝 中華圏のお客様の購入窓口</a></div><div class="wrap cp">© 周周・日本の不動産</div></footer>
<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a&&a.href&&a.href.indexOf("lin.ee")>-1&&typeof gtag==="function"){gtag("event","line_click",{link_id:a.id||"",page:location.pathname});}});</script>
<button id="btt" aria-label="トップへ戻る">↑</button>
<script type="module" src="comments.js"></script>
<script>document.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('.ytf');if(f&&!f.dataset.l){f.dataset.l=1;f.innerHTML='<iframe src="https://www.youtube.com/embed/'+f.dataset.id+'?autoplay=1" title="動画" allow="autoplay;fullscreen" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>';}});</script>
<script>(function(){var rp=document.getElementById('rp'),btt=document.getElementById('btt');function os(){var h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,mx=h.scrollHeight-h.clientHeight;rp.style.width=(mx>0?sc/mx*100:0)+'%';btt.style.display=sc>500?'flex':'none';}window.addEventListener('scroll',os,{passive:true});os();btt.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};var post=document.querySelector('.post');if(post){var heads=[];post.querySelectorAll('h2.ah, p').forEach(function(el){var t='';if(el.tagName==='H2'){t=el.textContent.trim();}else{var fe=el.querySelector('b');if(!fe||el.firstElementChild!==fe)return;t=fe.textContent.trim();}if(t.length>=3&&t.length<=42)heads.push({p:el,t:t});});if(heads.length>=4){var toc=document.createElement('div');toc.className='toc collapsed';var tt=document.createElement('div');tt.className='toc-t';tt.innerHTML='📑 目次 <span class="toc-x"></span>';tt.onclick=function(){toc.classList.toggle('collapsed');};var list=document.createElement('div');list.className='toc-list';heads.forEach(function(h,i){var id='sec'+i;h.p.id=id;h.p.classList.add('sec');var a=document.createElement('a');a.href='#'+id;a.textContent=h.t;list.appendChild(a);});toc.appendChild(tt);toc.appendChild(list);post.parentNode.insertBefore(toc,post);}}})();</script>`;
/* 語言切換選單。日文專用的落地頁沒有中文版，掛上去會指到不存在的檔案，所以不放。 */
const LANGSWITCH = `<!--langswitch--><script>(function(){var p=location.pathname.split('/').pop()||'index.html';var isJa=(p==='ja.html');var isCn=(!isJa&&p.slice(-8)==='-cn.html');var twHref,cnHref;if(isJa){twHref='index.html';cnHref='index-cn.html';}else if(isCn){twHref=p.slice(0,-8)+'.html';cnHref=p;}else{twHref=p;cnHref=p.slice(0,-5)+'-cn.html';}var jaHref='ja.html';var cur=isJa?'ja':(isCn?'cn':'tw');function mk(label,href,key){var a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.textContent=label;a.setAttribute('data-lang',key);var active=(key===cur);a.style.cssText='display:block;padding:9px 14px;font-size:14px;text-decoration:none;border-radius:8px;white-space:nowrap;'+(active?'color:#f43f5e;font-weight:700;background:#fff1f2':'color:#292524');if(active)a.setAttribute('aria-current','page');return a;}var wrap=document.createElement('div');wrap.style.cssText='position:relative;flex:0 0 auto';var btn=document.createElement('button');btn.type='button';btn.textContent='🌐 言語';btn.setAttribute('aria-label','切換語言 / Language / 语言');btn.style.cssText='background:#fff;border:1px solid #e7e5e4;border-radius:999px;font-size:13px;font-weight:700;color:#57534e;padding:6px 12px;cursor:pointer;font-family:inherit;white-space:nowrap';var menu=document.createElement('div');menu.style.cssText='display:none;position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #e7e5e4;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px;min-width:130px;z-index:200';menu.appendChild(mk('繁體中文',twHref,'tw'));menu.appendChild(mk('简体中文',cnHref,'cn'));menu.appendChild(mk('日本語',jaHref,'ja'));btn.onclick=function(e){e.stopPropagation();menu.style.display=(menu.style.display==='block')?'none':'block';};document.addEventListener('click',function(){menu.style.display='none';});wrap.appendChild(btn);wrap.appendChild(menu);function insertInto(container,beforeEl){if(beforeEl&&beforeEl.parentNode===container){container.insertBefore(wrap,beforeEl);}else{container.appendChild(wrap);}}var sbarRow=document.querySelector('.sbar .wrap')||document.querySelector('.sbar .in');if(sbarRow){var line=sbarRow.querySelector('a[href*="lin.ee"]');if(line){var grp=document.createElement('div');grp.style.cssText='display:flex;align-items:center;gap:10px';line.parentNode.insertBefore(grp,line);grp.appendChild(wrap);grp.appendChild(line);}else{sbarRow.appendChild(wrap);}return;}var hdRight=document.querySelector('header .hd-right');if(hdRight){var line2=hdRight.querySelector('.btn-line');insertInto(hdRight,line2);return;}wrap.style.cssText+=';position:fixed;top:10px;right:12px;z-index:210';document.body.appendChild(wrap);})();</script>`;

let gp = fs.readFileSync(ROOT + "/generate-pages.cjs", "utf8");
const SLUG = eval("(" + gp.match(/const SLUG = (\{[\s\S]*?\n\});/)[1] + ")");

const JA_CONTENT_FILE = ROOT + "/ja-content.json";
const JA_CONTENT = fs.existsSync(JA_CONTENT_FILE) ? JSON.parse(fs.readFileSync(JA_CONTENT_FILE, "utf8")) : {};

const JA_CAT = {
  foreign: "外国人の不動産購入", live: "暮らし・住まいガイド", invest: "投資・収益物件",
  minpaku: "民泊関連法規", area: "エリア紹介", travel: "観光スポット",
  loan: "ローン・税金", life: "生活情報", knowhow: "不動産購入の知識"
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
const ytEmbed = u => { if (!u) return ""; const m = u.match(/(?:youtu\.be\/|v=|\/embed\/|shorts\/)([\w-]{11})/); return m ? "https://www.youtube.com/embed/" + m[1] : ""; };
const coverURL = a => { const c = a.hero || a.cover; return c ? (/^https?:\/\//.test(c) ? c : BASE + encodeURIComponent(c)) : ""; };
const jaSlug = slug => slug + "-ja";

const PICK_BY_CAT_JA = {
  invest:  p => p.cat === "invest",
  /* 「民泊」だと「民泊不可」の物件まで拾ってしまうため、旅館業で判定する */
  minpaku: p => p.cat === "invest" && /旅館業|旅館一棟|旅館収益|簡易宿所/.test([p.title, p.catch, p.note, p.layout].join(" ")),
};
function propsForArticleJa(a) {
  const pick = PICK_BY_CAT_JA[a.cat];
  if (!pick) return [];
  let list = PROPS.filter(p => !p.sold && p.status === "在售" && pick(p));
  if (a.cat === "minpaku" && list.length < 2) list = PROPS.filter(p => !p.sold && p.status === "在售" && p.cat === "invest");
  if (list.length < 2) return [];
  list = list.slice().sort((x, y) => (y.yield ? 1 : 0) - (x.yield ? 1 : 0));
  const seed = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
  const off = list.length ? seed % list.length : 0;
  return list.slice(off).concat(list.slice(0, off)).slice(0, 3);
}
function propBlockHTMLJa(a) {
  const list = propsForArticleJa(a);
  if (!list.length) return "";
  const cards = list.map(p => {
    const img = (p.photos && p.photos[0]) ? encodeURIComponent(p.photos[0]) : "";   /* 相對路徑：文章頁跟物件頁都在根目錄 */
    const name = esc(p.title || "");
    const yieldLine = p.yield ? '<span class="apy">' + esc(String(p.yield).split("（")[0]) + "</span>" : "";
    return '<a class="apcard" href="property-ja.html?id=' + encodeURIComponent(p.id) + '">'
      + (img ? '<span class="apimg" style="background-image:url(\'' + img + '\')"></span>' : '<span class="apimg"></span>')
      + '<span class="apbody"><b>' + name + "</b>"
      + '<span class="apmeta">' + esc(p.location || "") + "</span>"
      + '<span class="apprice">' + esc(String(p.price || "価格はお問い合わせください").split("\n")[0]) + yieldLine + "</span>"
      + "</span></a>";
  }).join("");
  return '<section class="apsec"><h2>現在ご紹介できる投資物件</h2>'
    + '<p class="apsub">記事を読んで具体的な物件をご覧になりたい方へ。掲載中の物件から数件をご紹介します（物件情報の更新に自動で連動します）。</p>'
    + '<div class="apgrid">' + cards + "</div>"
    + '<a class="apmore" href="properties-ja.html">物件一覧を見る →</a></section>';
}

const { buildRelMap } = require("./related.cjs");
const REL_JA = buildRelMap(ART, a => !!(SLUG[a.id] && JA_CONTENT[a.id]));

function pageJa(a, j) {
  const slug = SLUG[a.id];
  const url = BASE + jaSlug(slug) + ".html";
  const twUrl = BASE + slug + ".html";
  const cnUrl = BASE + slug + "-cn.html";
  const catName = JA_CAT[a.cat] || "不動産コラム";
  const cover = coverURL(a);
  const bg = "background-image:" + (cover ? "url('" + cover + "')," : "") + "linear-gradient(135deg,#a8a29e,#d6d3d1)" + (a.cpos ? ";background-position:" + a.cpos : "");
  const bodyHTML = j.body.map(p => { const t = p.trim(); if (t.startsWith("<div")) return p; if (/^(<b>)?(出典|参考資料|本記事)/.test(t)) return '<p class="src">' + p + "</p>"; const m = t.match(/^<b>([\s\S]+)<\/b>$/); if (m) return '<h2 class="ah">' + m[1] + "</h2>"; const s2 = t.match(/^<b>([\s\S]*?)<\/b>([\s\S]*)$/); if (s2) { const rest = s2[2].trim(); return '<h2 class="ah sh2">' + s2[1] + "</h2>" + (rest ? "<p>" + rest + "</p>" : ""); } return "<p>" + p + "</p>"; }).join("");
  const em = ytEmbed(a.video);
  const vidId = em ? em.split("/embed/")[1] : "";
  const vid = em ? `<div class="vid"><div class="ytf" data-id="${vidId}"><img src="https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg" onerror="this.onerror=null;this.src=&#39;https://i.ytimg.com/vi/${vidId}/hqdefault.jpg&#39;" alt="動画" loading="lazy" width="1280" height="720"><span class="pbtn">▶</span></div></div>` : "";
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: j.title, description: j.ex,
    inLanguage: "ja",
    datePublished: a.date, dateModified: a.date,
    author: AUTHOR_JA,
    publisher: PUBLISHER_JA,
    mainEntityOfPage: url
  };
  if (cover) ld.image = cover;
  const ldCrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: BASE + "ja.html" },
    { "@type": "ListItem", position: 2, name: catName, item: url },
    { "@type": "ListItem", position: 3, name: j.title, item: url }
  ] };
  const t = esc(j.title) + "｜周周・日本の不動産";
  const d = esc(j.seo || j.ex);   // seo：只給搜尋引擎看的長描述；沒填就用卡片摘要 ex
  const rel = REL_JA[a.id] || [];   // 選文邏輯見 related.cjs（平均分散入連，避免孤兒文章）
  const relHTML = rel.length ? `<section style="margin-top:32px;border-top:1px solid var(--line);padding-top:18px"><h2 style="font-size:18px;margin-bottom:10px">関連記事</h2>` + rel.map(r => `<a href="${jaSlug(SLUG[r.id])}.html" style="display:block;padding:11px 0;border-bottom:1px solid var(--line)">→ ${JA_CONTENT[r.id].title}</a>`).join("") + `</section>` : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
${HEAD_SCRIPTS}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${(j.tags||[]).join(",")},日本の不動産,中国語対応 不動産,台湾人 不動産,中国語 不動産仲介,日本 不動産購入">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${url}">
<link rel="alternate" hreflang="zh-Hant" href="${twUrl}">
<link rel="alternate" hreflang="x-default" href="${twUrl}">
<link rel="alternate" hreflang="zh-Hans" href="${cnUrl}">${cover ? `
<link rel="preload" as="image" href="${cover}">` : ""}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">${cover ? `\n<meta property="og:image" content="${cover}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta property="article:published_time" content="${a.date}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://i.ytimg.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")}</script>
<script type="application/ld+json">${JSON.stringify(ldCrumb).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")}</script>
${STYLE.replace(/font-family:'Noto Sans TC'/g, "font-family:'Noto Sans JP'")}
</head>
<body>
<div id="rp"></div>
${SBAR}
<main class="wrap" style="max-width:760px;padding-top:18px">
<a class="back" href="ja.html">← ホームに戻る</a>
<p style="font-size:13px;color:var(--mut);margin-bottom:14px"><a href="ja.html" style="color:var(--mut)">ホーム</a> › ${catName}</p>
${a.coverFit === "full" ? `<img${wh(cover)} src="${cover}" alt="${esc(j.title)}" loading="lazy" style="width:100%;height:auto;border-radius:18px;display:block;margin:0 auto 20px">` : a.coverFit === "contain" ? `<img${wh(cover)} src="${cover}" alt="${esc(j.title)}" loading="lazy" style="display:block;margin:0 auto 20px;max-width:100%;max-height:210px;width:auto;height:auto;border-radius:18px">` : `<div class="acov" style="${bg}"><span>${catName}</span></div>`}
<h1 class="atitle" style="margin-bottom:10px">${j.title}</h1>
<div class="am" style="display:flex;gap:14px;color:var(--mut);font-size:14px;margin-bottom:16px"><span>執筆者：周周</span><span>${a.date}</span></div>
<div class="share"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">f シェア</a><a href="https://www.threads.net/intent/post?text=${encodeURIComponent(j.title + " " + url)}" target="_blank" rel="noopener">Threadsでシェア</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(j.title)}" target="_blank" rel="noopener">𝕏 でポスト</a><a href="javascript:void(0)" onclick="navigator.clipboard&&navigator.clipboard.writeText('${url}');this.textContent='✓ コピーしました';return false">🔗 リンクをコピー</a></div>
<div class="post">
${bodyHTML}
</div>
${vid}
<div class="ablock" style="margin-top:26px"><div><b>この記事はお役に立ちましたか？ご質問はお気軽にどうぞ</b><br><span style="color:var(--mut);font-size:14px">気になる物件があれば、そのまま周周までお送りください。</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div>
${propBlockHTMLJa(a)}
${relHTML}
<div id="cmts" data-slug="${slug}" data-lang="ja"></div>
<p style="margin:30px 0;font-size:14px"><a href="ja.html" style="color:var(--rose);font-weight:600">← 周周のほかの記事を見る</a></p>
</main>
${FOOT}
${LANGSWITCH}
</body>
</html>`;
}

let made = [];
for (const a of ART) {
  if (a.url) continue; // minpaku 另外處理
  if (!SLUG[a.id]) continue;
  const j = JA_CONTENT[a.id];
  if (!j) continue;
  fs.writeFileSync(ROOT + "/" + jaSlug(SLUG[a.id]) + ".html", pageJa(a, j));
  made.push(jaSlug(SLUG[a.id]) + ".html");
}

console.log("產生日文文章頁:", made.length, "篇 / 共", Object.keys(SLUG).length, "篇");
console.log(made.join("\n"));

/* ══════════════════════════════════════════════════════════════
   日本語専用ランディング：sell-your-property-ja.html
   売却をお考えのオーナー様と、物件情報をお持ちの不動産会社向け。
   ・繁中／簡中版は存在しないので hreflang は ja の自己参照のみ、
     言語切替メニュー（LANGSWITCH）も載せない。
   ・在庫件数は properties.js から実数を出すので、物件が増減しても
     ここを書き換える必要はない。
   ══════════════════════════════════════════════════════════════ */
function pageOwnerJa() {
  const url = BASE + "sell-your-property-ja.html";
  const c = S.company;
  const onSale = PROPS.filter(p => !p.sold).length;
  const soldN  = PROPS.filter(p => p.sold).length;

  const t = "売却をお考えのオーナー様・不動産会社の皆様へ｜周周・日本の不動産";
  const d = "東京23区を中心に、台湾・香港・シンガポールなど中華圏のお客様へ日本の不動産をご紹介しております。ご売却をお考えのオーナー様、また買主をお探しの不動産会社の皆様からのお問い合わせを承ります。中国語・日本語での一貫対応、内見の帯同から契約・決済までサポートいたします。";

  const ld = {
    "@context": "https://schema.org", "@type": "RealEstateAgent",
    name: "周周・日本の不動産（" + c.name + "）",
    url, inLanguage: "ja",
    description: d,
    parentOrganization: { "@type": "Organization", name: c.name, url: c.hp },
    address: { "@type": "PostalAddress", addressCountry: "JP", streetAddress: c.addr },
    telephone: c.tel, email: c.email,
    areaServed: ["東京都", "神奈川県", "千葉県", "埼玉県"],
    knowsLanguage: ["ja", "zh-Hant", "zh-Hans"],
    identifier: { "@type": "PropertyValue", name: "宅地建物取引業者免許番号", value: c.license }
  };
  const ldCrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: BASE + "ja.html" },
    { "@type": "ListItem", position: 2, name: "売却をお考えのオーナー様・不動産会社の皆様へ", item: url }
  ] };

  const H2 = "font-size:20px;margin:34px 0 12px;padding-left:12px;border-left:4px solid var(--rose);line-height:1.5";
  const CARD = "background:#fff;border:1px solid #fecdd3;border-radius:14px;padding:18px 18px 16px;margin:14px 0";
  const P = "margin:0 0 14px;line-height:1.95";

  const card = (h, b) => `<div style="${CARD}"><p style="margin:0 0 8px;font-weight:800;color:#e11d48;font-size:1.02em">${h}</p><p style="margin:0;line-height:1.9;font-size:.96em">${b}</p></div>`;
  const step = (n, h, b) => `<div style="display:flex;gap:14px;margin:0 0 16px"><div style="flex:0 0 32px;height:32px;border-radius:999px;background:#f43f5e;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px">${n}</div><div><p style="margin:0 0 4px;font-weight:700">${h}</p><p style="margin:0;color:var(--mut);font-size:.94em;line-height:1.85">${b}</p></div></div>`;
  const dl = (k, v) => `<div style="display:grid;grid-template-columns:170px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">${k}</div><div>${v}</div></div>`;

  const cta = (label) => `<div class="ablock" style="margin:26px 0"><div><b>${label}</b><br><span style="color:var(--mut);font-size:14px">日本語でお気軽にご連絡ください。物件資料をお送りいただければ、こちらで買主層との相性を拝見いたします。</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINE で問い合わせる</a></div>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
${HEAD_SCRIPTS}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="不動産 売却,中華圏 買主,台湾 買主,中国語対応 不動産,東京 売却,物件情報 提供,不動産会社 提携">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${url}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")}</script>
<script type="application/ld+json">${JSON.stringify(ldCrumb).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")}</script>
${STYLE.replace(/font-family:'Noto Sans TC'/g, "font-family:'Noto Sans JP'")}
</head>
<body>
<div id="rp"></div>
${SBAR}
<main class="wrap" style="max-width:760px;padding-top:18px">
<a class="back" href="ja.html">← ホームに戻る</a>

<h1 class="atitle" style="margin:10px 0 14px;line-height:1.45">中華圏の買主に、まっすぐ届く。<br><span style="font-size:.62em;color:var(--mut);font-weight:600">売却をお考えのオーナー様・不動産会社の皆様へ</span></h1>

<p style="${P}">はじめまして。東京で不動産の売買仲介をしております、周周（シュウ シンユウ）と申します。${c.name}に所属し、台湾・香港・シンガポールなど<b>中華圏のお客様</b>に日本の不動産をご紹介しております。</p>
<p style="${P}">日々のご相談のなかで、「買いたい方」は数多くいらっしゃる一方、ご紹介できる物件が足りていないと感じる場面が増えてまいりました。そこでこのページでは、ご売却をお考えのオーナー様、また買主をお探しの不動産会社の皆様に向けて、私どもがどのような買主層とつながっているかをご案内いたします。</p>

${cta("まずは物件の概要だけでも、お聞かせください")}

<h2 style="${H2}">こんな方からのご相談を承っております</h2>
${card("ご売却をお考えのオーナー様", "ご自宅・投資用のいずれも承ります。「まだ売ると決めたわけではないが、今いくらぐらいなのか知りたい」という段階でも構いません。近隣の直近成約事例をお調べし、現実的なレンジをご提示いたします。")}
${card("不動産会社の皆様", "中華圏の買主をお探しの物件がございましたら、ぜひ資料をお送りください。区分・戸建・店舗・一棟、レインズ未公開のものも含めて拝見いたします。媒介の形態についてもご相談に応じます。")}

<h2 style="${H2}">私どもがご紹介できる買主層</h2>
<p style="${P}">中心は<b>台湾</b>のお客様で、香港・シンガポール・マレーシアの方も増えております。ご用途は大きく二つに分かれます。</p>
<p style="${P}">ひとつは<b>ご自宅・セカンドハウス</b>としてのご購入です。お子様の進学、日本での長期滞在、ご退職後の拠点づくりなどが背景にあり、都心 23 区の駅近マンションや、世田谷・目黒あたりの戸建をお探しになる方が多くいらっしゃいます。</p>
<p style="${P}">もうひとつは<b>収益物件</b>です。区分の賃貸中物件から、店舗・事務所、一棟ものまでご相談を頂戴します。旅館業・住宅宿泊事業の許認可が絡む案件のご経験もございます。</p>
<p style="${P}">なお、海外にお住まいの買主の場合、在留カードをお持ちでないケースや、送金・両替の実務、非居住者としての登記手続きなど、国内のお客様とは異なる論点がございます。こうした部分は当方で整理いたしますので、売主様・元付会社様のお手を煩わせることはございません。</p>

<h2 style="${H2}">ご提供できること</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:14px 0">
${["中国語（繁体字・簡体字）と日本語での一貫対応。通訳を別途手配いただく必要はございません。",
   "内見の帯同。海外からお越しになる買主のスケジュール調整、空港からのご案内も含めて対応いたします。",
   "海外にお住まいの買主に必要な、署名証明・在留証明・送金まわりの段取りのご案内。",
   "ご契約から決済・お引渡しまでの進行管理。司法書士・税理士との連携も含めて調整いたします。",
   "ご購入後の賃貸管理・運用に関するご相談。売って終わりにはいたしません。",
   "自社サイト（繁体字・簡体字・日本語の 3 言語）と SNS・YouTube での物件情報の発信。"
  ].map(x => `<div style="background:#fff5f7;border-radius:12px;padding:14px 15px;font-size:.94em;line-height:1.8">${x}</div>`).join("")}
</div>

<h2 style="${H2}">現在の取扱い</h2>
<p style="${P}">当サイトの物件情報ページでは、現在<b>${onSale} 件</b>を掲載しております。これまでのお取扱い実績として<b>${soldN} 件</b>を成約済みとして公開しております（お客様のご意向により、所在地は区までの表示としております）。区分マンション、戸建、店舗・事務所、一棟、建築条件付売地まで、幅広く承っております。</p>
<p style="${P}"><a href="properties-ja.html" style="color:var(--rose);font-weight:700">→ 現在の掲載物件を見る</a></p>

<h2 style="${H2}">ご売却の流れ</h2>
${step(1, "お問い合わせ・ヒアリング", "所在地、間取り、築年数、ご取得の時期などをお知らせください。LINE またはメールで承ります。")}
${step(2, "査定・価格のご提案", "同一物件・同一間取りの直近成約事例をお調べし、価格帯をご提案いたします。売り出し価格はオーナー様にお決めいただきます。")}
${step(3, "媒介契約の締結", "一般・専任・専属専任の 3 種類がございます。それぞれのレインズ登録義務と報告義務の違いをご説明したうえで、ご納得のうえでお選びいただきます。")}
${step(4, "販売活動", "レインズへの登録に加え、当サイトの 3 言語ページ・SNS で中華圏の買主に向けて発信いたします。内見のご対応と進捗のご報告を行います。")}
${step(5, "ご契約・お引渡し", "条件がまとまりましたら売買契約、その後は金融機関にて決済・所有権移転・お引渡しとなります。")}
<p style="margin:14px 0 0;font-size:.9em;color:var(--mut);line-height:1.85">※ ご成約の時期や価格は市況および個別のご事情によって異なり、結果をお約束できるものではございません。税額については税理士、契約および登記については司法書士・宅地建物取引士にご確認ください。</p>

<h2 style="${H2}">不動産会社の皆様へ</h2>
<p style="${P}">買主をお探しの物件がございましたら、販売図面をお送りいただけますと幸いです。当方の買主層との相性を拝見し、ご紹介できそうであればすぐにご連絡いたします。レインズ未公開の物件、広告掲載不可の物件についても、条件を確認のうえ適切に取り扱います。</p>
<p style="${P}">なお、当サイトに掲載させていただく際は、掲載可否・掲載範囲（所在地の表示レベルなど）を事前に必ず確認しております。ご指定の条件は厳守いたします。</p>

${cta("物件資料をお送りください")}

<h2 style="${H2}">会社概要</h2>
<div style="margin:14px 0">
${dl("商号", c.name)}
${dl("担当", c.person)}
${dl("宅地建物取引業者免許番号", c.license)}
${dl("所在地", c.addr)}
${dl("電話", c.tel + "（FAX " + c.fax + "）")}
${dl("メール", '<a href="mailto:' + c.email + '" style="color:var(--rose)">' + c.email + "</a>")}
${dl("会社サイト", '<a href="' + c.hp + '" target="_blank" rel="noopener" style="color:var(--rose)">' + c.hp + "</a>")}
</div>

<p style="margin:30px 0;font-size:14px"><a href="ja.html" style="color:var(--rose);font-weight:600">← ホームに戻る</a></p>
</main>
${FOOT}
</body>
</html>`;
}
fs.writeFileSync(ROOT + "/sell-your-property-ja.html", pageOwnerJa());
console.log("sell-your-property-ja.html 已產生");

/* ══════════════════════════════════════════════════════════════
   商業キーワード向けランディング（日本語版）
   ・buy-property-in-japan-ja.html        記事一覧ハブ
   ・japan-real-estate-agent-for-taiwanese-ja.html  仲介窓口の比較
   繁中版は generate-pages.cjs、簡中版は build-cn.cjs が作る。
   三言語そろっているので hreflang は 3 本＋x-default。
   ══════════════════════════════════════════════════════════════ */
function landingJa(cfg) {
  const url = BASE + cfg.slug + "-ja.html";
  const tw = BASE + cfg.slug + ".html";
  const cn = BASE + cfg.slug + "-cn.html";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
${HEAD_SCRIPTS}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cfg.metaTitle)}</title>
<meta name="description" content="${esc(cfg.desc)}">
<meta name="keywords" content="${esc(cfg.keywords)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${url}">
<link rel="alternate" hreflang="zh-Hant" href="${tw}">
<link rel="alternate" hreflang="zh-Hans" href="${cn}">
<link rel="alternate" hreflang="x-default" href="${tw}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(cfg.metaTitle)}">
<meta property="og:description" content="${esc(cfg.desc)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
${cfg.ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}</script>`).join("\n")}
${STYLE}
</head>
<body>
${SBAR}
<main class="wrap" style="max-width:820px;padding-top:18px">
<a class="back" href="ja.html">← ホームに戻る</a>
<p style="font-size:13px;color:var(--mut);margin-bottom:14px"><a href="ja.html" style="color:var(--mut)">ホーム</a> › ${esc(cfg.crumb)}</p>
<h1 class="atitle" style="margin-bottom:10px">${cfg.h1}</h1>
<p style="color:var(--mut);font-size:15px;margin-bottom:22px">${cfg.lead}</p>
<div class="post">
${cfg.main}
</div>
<div class="ablock" style="margin-top:30px"><div><b>${cfg.ctaTitle}</b><br><span style="color:var(--mut);font-size:14px">${cfg.ctaSub}</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div>
<p style="margin:30px 0;font-size:14px"><a href="ja.html" style="color:var(--rose);font-weight:600">← ホームに戻る</a></p>
</main>
${FOOT}
${LANGSWITCH}
</body>
</html>`;
}

const FAQ_AGENT_JA = [
  ["中華圏のお客様をご紹介いただく場合、費用はかかりますか。",
   "オーナー様・不動産会社様から当方へ費用を頂戴することはございません。報酬は宅地建物取引業法の報酬告示の範囲内で、成約時に売買当事者から頂戴する仲介手数料のみでございます。共同仲介の配分についても、事前にお打ち合わせのうえ書面で確認させていただきます。"],
  ["言語対応の範囲を教えてください。",
   "お客様とは中国語（繁体字・簡体字）、日本側の関係者様とは日本語で対応いたします。重要事項説明は宅地建物取引業法にもとづき弊社の宅地建物取引士が日本語で実施し、当方が中国語で逐条ご説明する形をとっております。"],
  ["買主が海外にお住まいの場合、決済はどうなりますか。",
   "内見はオンラインで代行し、資料のやり取りは電子と郵送を併用いたします。ご契約と決済の実務は物件・売主様・金融機関により異なり、ご本人の来日が必要となる場合、また在留証明・署名証明を事前にご準備いただく場合がございます。案件ごとに初期段階で確認のうえご案内いたします。"],
  ["非居住者の買主でも住宅ローンは組めますか。",
   "融資の可否および融資割合は個別の審査によります。金融機関のご紹介と書類のご準備はお手伝いいたしますが、確約は申し上げられません。現金購入のお客様も一定数いらっしゃいます。"],
  ["どのような物件のご紹介を希望されていますか。",
   "東京23区を中心に、神奈川・千葉・埼玉の実需向け区分および戸建、収益物件、店舗・事務所まで幅広く拝見しております。借地権物件は原則お取り扱いしておりません。物件資料をお送りいただければ、買主層との相性をお返しいたします。"]
];

function pageAgentJa() {
  const c = S.company;
  const url = BASE + "japan-real-estate-agent-for-taiwanese-ja.html";
  const main = `
<p>日本で不動産をご購入になる中華圏（台湾・香港・シンガポール・マレーシア）のお客様には、大きく分けて三つの窓口がございます。それぞれ物件のソース、費用の考え方、成約後にどこまで面倒を見るかが異なります。</p>
<p>このページでは三つの違いを整理したうえで、当方がどの位置づけでお手伝いしているかをご説明いたします。オーナー様・不動産会社の皆様には、中華圏の買主層をご検討いただく際の参考にしていただければ幸いです。</p>

<h2 class="ah">一、現地（台湾・香港）の海外不動産販売会社</h2>
<p>母国語で完結し、説明会などで気軽に相談できる点が最大の利点でございます。一方で取り扱い物件は提携先の新築案件などに限られることが多く、レインズ全体からのご提案にはなりにくい構造です。また、サポートはご成約までとなる場合が一般的で、賃貸管理や税務のご相談先はお客様ご自身でお探しになることになります。</p>

<h2 class="ah">二、日本の不動産会社に直接</h2>
<p>物件のソースという点では最も広く、レインズの情報にそのままアクセスできます。課題は制度の理解でございます。重要事項説明書の内容、管理規約上の用途制限、修繕積立金の改定履歴、借地権の別——いずれも「何を確認すべきか」をご存じでないと、質問そのものが出てまいりません。非居住者の融資実務に不慣れなケースも少なくございません。</p>

<h2 class="ah">三、日本で宅建業者に所属する中国語話者のエージェント</h2>
<p>当方がこの位置づけでございます。東京の宅建業者に所属し、物件のソースは日本の不動産会社と同じレインズ。そのうえで、お客様とのやり取りは中国語で行います。</p>
<p>実務上の価値は「通訳」ではなく「翻訳されない部分」にございます。固定資産税の賦課期日、新耐震基準の判定が建築確認申請日であること、管理規約の転貸・民泊に関する定め——中華圏のお客様がつまずかれる箇所はある程度決まっており、そこを事前に潰してからご案内いたします。結果として、ご契約後のキャンセルや条件の蒸し返しが起こりにくくなります。</p>

<h2 class="ah">不動産会社の皆様へ</h2>
<p>買主をお探しの物件がございましたら、資料をお送りください。中華圏の買主層との相性を拝見し、脈があるものだけご返答いたします。共同仲介の形、報酬の配分、内見のご対応方法は事前にお打ち合わせのうえ進めさせていただきます。ご売却をお考えのオーナー様は<a href="sell-your-property-ja.html">売却をお考えのオーナー様へ</a>のページもあわせてご覧ください。</p>

<h2 class="ah">よくあるご質問</h2>
${FAQ_AGENT_JA.map(q => `<div class="faq"><p style="font-weight:800;margin-bottom:6px">${q[0]}</p><p style="margin:0;color:var(--mut)">${q[1]}</p></div>`).join("\n")}

<h2 class="ah">運営者情報</h2>
<div style="margin:12px 0">
<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">商号</div><div>${c.name}</div></div>
<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">担当</div><div>${c.person}</div></div>
<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">宅地建物取引業者免許番号</div><div>${c.license}</div></div>
<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">所在地</div><div>${c.addr}</div></div>
<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">電話</div><div>${c.tel}（FAX ${c.fax}）</div></div>
<div style="display:grid;grid-template-columns:190px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.94em"><div style="color:var(--mut)">メール</div><div><a href="mailto:${c.email}" style="color:var(--rose)">${c.email}</a></div></div>
</div>

<p class="src">※ 本ページはサービスのご案内であり、投資勧誘を目的とするものではございません。仲介報酬は宅地建物取引業法の報酬告示の範囲内。融資の可否および融資割合は個別の審査によります。税額は税理士、登記および契約は司法書士・宅地建物取引士のご確認によります。不動産の取得のみをもって在留資格が得られるものではございません。</p>`;
  return landingJa({
    slug: "japan-real-estate-agent-for-taiwanese",
    metaTitle: "中華圏のお客様の不動産購入窓口——三つの選択肢と当方の役割｜周周・日本の不動産",
    h1: "中華圏のお客様は、どの窓口で日本の不動産を買うのか",
    lead: "現地の海外不動産販売会社、日本の不動産会社への直接依頼、そして日本で宅建業者に所属する中国語話者のエージェント。三つの違いと、当方がどこを担っているかをご説明いたします。",
    crumb: "中華圏のお客様の購入窓口",
    desc: "日本で不動産を購入される中華圏（台湾・香港・シンガポール）のお客様が利用される三つの窓口——現地の海外不動産販売会社、日本の不動産会社への直接依頼、日本で宅建業者に所属する中国語話者のエージェント——について、物件のソース・言語対応・重要事項説明・成約後のサポート・報酬の考え方を整理いたしました。買主をお探しの不動産会社の皆様、ご売却をお考えのオーナー様からのお問い合わせも承っております。",
    keywords: "中華圏 買主,台湾 買主,中国語対応 不動産,外国人 不動産購入,東京 不動産 仲介,共同仲介,不動産会社 提携,非居住者 購入",
    ctaTitle: "物件資料をお送りください。買主層との相性を拝見いたします",
    ctaSub: "共同仲介の形と報酬の配分は、事前にお打ち合わせのうえ進めさせていただきます。",
    ld: [
      { "@context": "https://schema.org", "@type": "RealEstateAgent", name: "周周・日本の不動産（" + c.name + "）", url, inLanguage: "ja",
        description: "東京23区を中心に、中華圏のお客様へ日本の不動産をご紹介しております。",
        parentOrganization: { "@type": "Organization", name: c.name, url: c.hp },
        address: { "@type": "PostalAddress", addressCountry: "JP", streetAddress: c.addr },
        telephone: c.tel, email: c.email,
        areaServed: ["東京都", "神奈川県", "千葉県", "埼玉県"],
        knowsLanguage: ["ja", "zh-Hant", "zh-Hans"],
        identifier: { "@type": "PropertyValue", name: "宅地建物取引業者免許番号", value: c.license } },
      { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "ja", mainEntity: FAQ_AGENT_JA.map(q => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: BASE + "ja.html" },
        { "@type": "ListItem", position: 2, name: "中華圏のお客様の購入窓口", item: url } ] }
    ],
    main
  });
}

const HUB_CAT_LEAD_JA = {
  foreign: "外国人が日本の不動産を購入する際の制度、必要書類、送金の実務。",
  live: "間取り、方位、浴室乾燥機、内見時の確認箇所——実際に住むための視点。",
  invest: "利回りの見方と、空室・費用を織り込んだ実質の収支。",
  minpaku: "民泊 180 日、旅館業許可、管理規約——購入前に確認すべき法規。",
  area: "同じ東京でも、隣の区で相場も住み心地も変わります。",
  travel: "内見のついでに歩ける場所、そのエリアの実際の雰囲気。",
  loan: "非居住者の融資条件と、取得時・保有中・売却時の税金。",
  life: "購入後に始まること——公共料金、携帯、運転免許、防災。",
  knowhow: "内見、価格交渉、契約、決済——実務で使う共通知識。"
};
const HUB_TOOLS_JA = [
  ["tool-loan-ja.html", "🧮 住宅ローン試算", "価格・頭金・金利・期間から月々の返済額を試算"],
  ["tool-cost-ja.html", "💰 取得諸費用の試算", "本体価格以外に必要な現金を把握"],
  ["tool-yield-ja.html", "📈 利回り試算", "表面と実質、二通りで確認"],
  ["tool-fx-ja.html", "💱 為替換算", "円・台湾ドル・香港ドルの換算"],
  ["tool-area-ja.html", "📐 面積換算", "坪・㎡・畳の相互換算"],
  ["translate-ja.html", "🈳 販売図面の翻訳", "日本語の図面を中国語に"]
];

function pageHubJa() {
  const url = BASE + "buy-property-in-japan-ja.html";
  const list = ART.filter(a => !a.url && SLUG[a.id] && JA_CONTENT[a.id]);
  const byCat = {};
  for (const a of list) (byCat[a.cat] = byCat[a.cat] || []).push(a);
  for (const k in byCat) byCat[k].sort((x, y) => (y.date || "").localeCompare(x.date || ""));
  const order = Object.keys(JA_CAT).filter(id => byCat[id] && byCat[id].length);
  const total = list.length;

  const catHTML = order.map(id => `<h2 class="ah" id="cat-${id}">${JA_CAT[id]}（${byCat[id].length} 本）</h2>
<p style="color:var(--mut);font-size:14px;margin:-4px 0 10px">${HUB_CAT_LEAD_JA[id] || ""}</p>
<ul style="list-style:none;padding:0;margin:0 0 8px">${byCat[id].map(a => {
    const j = JA_CONTENT[a.id];
    const ex = String(j.ex || "").slice(0, 62);
    return `<li style="padding:9px 0;border-bottom:1px solid var(--line)"><a href="${jaSlug(SLUG[a.id])}.html" style="font-weight:600">${esc(j.title)}</a><br><span style="color:var(--mut);font-size:13px">${esc(ex)}${String(j.ex || "").length > 62 ? "…" : ""}</span></li>`;
  }).join("")}</ul>`).join("\n");

  const toolHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:12px 0">${HUB_TOOLS_JA.map(t => `<a href="${t[0]}" style="display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px 15px"><span style="font-weight:800">${t[1]}</span><br><span style="color:var(--mut);font-size:13px">${t[2]}</span></a>`).join("")}</div>`;

  const main = `
<p>このページは当サイトの記事一覧でございます。日本での不動産購入について <b>${total} 本</b>の記事を日本語でご用意しております。制度の解説から、購入後の暮らしまわりまで一通り揃えております。</p>
<p>中華圏のお客様向けに書いた内容を日本語でもご覧いただけるようにしたものですので、海外のお客様がどこでつまずかれるのかをお知りになりたい不動産会社の皆様にも、ご参考になるかと存じます。</p>

<h2 class="ah">先に試算する</h2>
<p>物件をご覧になる前に、数字を出しておかれると比較が早くなります。いずれも無料・登録不要でございます。</p>
${toolHTML}

<h2 class="ah">物件をご覧になる場合</h2>
<p>現在ご紹介中の物件は<a href="properties-ja.html">物件一覧</a>にまとめております。予算・用途・間取りで絞り込めます。エリアの相場は<a href="tokyo-area-guide-ja.html">東京エリアガイド</a>、内見の様子は<a href="videos-ja.html">動画</a>でご覧いただけます。ご売却をお考えのオーナー様は<a href="sell-your-property-ja.html">売却をお考えのオーナー様へ</a>、買主をお探しの不動産会社の皆様は<a href="japan-real-estate-agent-for-taiwanese-ja.html">中華圏のお客様の購入窓口</a>をご覧ください。</p>

<h2 class="ah">テーマ別の記事一覧</h2>
<p style="color:var(--mut);font-size:14px;margin:-4px 0 14px">全 ${total} 本。カテゴリごとに、新しいものから並べております。</p>
${catHTML}

<p class="src">※ 本ページは記事の一覧でございます。掲載内容は参考情報であり、実際の条件は現況および重要事項説明書によります。融資の可否と融資割合は個別の審査により、税額は税理士、登記および契約は司法書士・宅地建物取引士のご確認によります。</p>`;

  const items = [];
  for (const id of order) for (const a of byCat[id]) items.push({ "@type": "ListItem", position: items.length + 1, url: BASE + jaSlug(SLUG[a.id]) + ".html", name: JA_CONTENT[a.id].title });

  return landingJa({
    slug: "buy-property-in-japan",
    metaTitle: "日本の不動産購入ガイド（記事一覧）｜周周・日本の不動産",
    h1: "日本の不動産購入ガイド",
    lead: "外国人の不動産購入、住宅ローンと税金、投資と収益物件、民泊法規、東京のエリア相場、購入後の暮らし——当サイトの記事を日本語でまとめてご覧いただけます。",
    crumb: "記事一覧",
    desc: "日本での不動産購入に関する記事の一覧でございます。外国人の購入制度と必要書類、取得諸費用と税金、非居住者の住宅ローン、投資物件の利回りと空室対策、民泊・旅館業の法規、東京23区のエリア相場、契約と決済、購入後の公共料金や携帯電話まで、全 " + total + " 本を日本語で掲載。住宅ローン・諸費用・利回り・為替・面積換算の無料試算ツール、および物件一覧もこちらから。",
    keywords: "日本 不動産 購入,外国人 不動産,東京 マンション,住宅ローン 非居住者,不動産投資,民泊 法規,東京 エリア 相場",
    ctaTitle: "個別のご相談も承っております",
    ctaSub: "ご予算とご希望のエリアをお知らせいただければ、方向性からご一緒に整理いたします。",
    ld: [
      { "@context": "https://schema.org", "@type": "CollectionPage", name: "日本の不動産購入ガイド（記事一覧）", inLanguage: "ja", url, description: "日本での不動産購入に関する記事の一覧、無料試算ツール、物件一覧の入口。", publisher: PUBLISHER_JA },
      { "@context": "https://schema.org", "@type": "ItemList", name: "日本の不動産購入ガイド 記事一覧", numberOfItems: items.length, itemListElement: items },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: BASE + "ja.html" },
        { "@type": "ListItem", position: 2, name: "記事一覧", item: url } ] }
    ],
    main
  });
}

fs.writeFileSync(ROOT + "/japan-real-estate-agent-for-taiwanese-ja.html", pageAgentJa());
fs.writeFileSync(ROOT + "/buy-property-in-japan-ja.html", pageHubJa());
console.log("落地頁（日文）: japan-real-estate-agent-for-taiwanese-ja.html / buy-property-in-japan-ja.html 已產生");
