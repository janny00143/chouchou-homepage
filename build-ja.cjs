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
const FOOT = `<footer><div class="wrap row"><div><p style="font-weight:700">周周・日本の不動産</p><p style="font-size:14px;color:var(--mut)">📍 東京23区を中心に、神奈川・千葉・横浜エリアにも対応しています。</p></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div><div class="wrap" style="padding:0 16px 10px;display:flex;flex-wrap:wrap;gap:14px;font-size:13px"><a href="ja.html" style="color:var(--mut)">ホーム</a></div><div class="wrap cp">© 周周・日本の不動産</div></footer>
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
  const vid = em ? `<div class="vid"><div class="ytf" data-id="${vidId}"><img src="https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg" onerror="this.onerror=null;this.src=&#39;https://i.ytimg.com/vi/${vidId}/hqdefault.jpg&#39;" alt="動画" loading="lazy"><span class="pbtn">▶</span></div></div>` : "";
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
${a.coverFit === "full" ? `<img src="${cover}" alt="${esc(j.title)}" loading="lazy" style="width:100%;height:auto;border-radius:18px;display:block;margin:0 auto 20px">` : a.coverFit === "contain" ? `<img src="${cover}" alt="${esc(j.title)}" loading="lazy" style="display:block;margin:0 auto 20px;max-width:100%;max-height:210px;width:auto;height:auto;border-radius:18px">` : `<div class="acov" style="${bg}"><span>${catName}</span></div>`}
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
