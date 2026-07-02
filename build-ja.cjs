/* 產生日文版文章頁（-ja.html）。translate-jobs/ja-content.json 提供翻譯後的 title/ex/tags/body。
   用法：先跑 node generate-pages.cjs，再跑 node build-ja.cjs */
const fs = require("fs");
const BASE = "https://chouchouinjapan.com/";
const ROOT = __dirname;

let src = fs.readFileSync(ROOT + "/index.html", "utf8");
const ART = eval("[" + src.match(/const ART=\[([\s\S]*?)\n\];/)[1] + "]");
const S = eval("(" + src.match(/const S = (\{[\s\S]*?\n\});/)[1] + ")");
const STYLE = src.match(/<style>[\s\S]*?<\/style>/)[0];

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

function pageJa(a, j) {
  const slug = SLUG[a.id];
  const url = BASE + jaSlug(slug) + ".html";
  const twUrl = BASE + slug + ".html";
  const cnUrl = BASE + slug + "-cn.html";
  const catName = JA_CAT[a.cat] || "不動産コラム";
  const cover = coverURL(a);
  const bg = "background-image:" + (cover ? "url('" + cover + "')," : "") + "linear-gradient(135deg,#a8a29e,#d6d3d1)" + (a.cpos ? ";background-position:" + a.cpos : "");
  const bodyHTML = j.body.map(p => { const t = p.trim(); if (t.startsWith("<div")) return p; if (/^(<b>)?(出典|参考資料|本記事)/.test(t)) return '<p class="src">' + p + "</p>"; const m = t.match(/^<b>([\s\S]+)<\/b>$/); return m ? '<p class="ah"><b>' + m[1] + "</b></p>" : (t.indexOf("<b>") === 0 ? '<p class="sh">' + p + "</p>" : "<p>" + p + "</p>"); }).join("");
  const em = ytEmbed(a.video);
  const vidId = em ? em.split("/embed/")[1] : "";
  const vid = em ? `<div class="vid"><div class="ytf" data-id="${vidId}"><img src="https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg" onerror="this.onerror=null;this.src=&#39;https://i.ytimg.com/vi/${vidId}/hqdefault.jpg&#39;" alt="動画" loading="lazy"><span class="pbtn">▶</span></div></div>` : "";
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: j.title, description: j.ex,
    inLanguage: "ja",
    datePublished: a.date, dateModified: a.date,
    author: { "@type": "Person", name: "周欣妤（シュウ・シンユウ）" },
    publisher: { "@type": "Organization", name: "周周・日本の不動産" },
    mainEntityOfPage: url
  };
  if (cover) ld.image = cover;
  const ldCrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: BASE + "ja.html" },
    { "@type": "ListItem", position: 2, name: catName, item: url },
    { "@type": "ListItem", position: 3, name: j.title, item: url }
  ] };
  const t = esc(j.title) + "｜周周・日本の不動産";
  const d = esc(j.ex);
  const others = ART.filter(r => r.id !== a.id && SLUG[r.id] && JA_CONTENT[r.id]);
  const rel = [...others.filter(r => r.cat === a.cat), ...others.filter(r => r.cat !== a.cat).sort((x, y) => (y.date || "").localeCompare(x.date || ""))].slice(0, 3);
  const relHTML = rel.length ? `<section style="margin-top:32px;border-top:1px solid var(--line);padding-top:18px"><h2 style="font-size:18px;margin-bottom:10px">関連記事</h2>` + rel.map(r => `<a href="${jaSlug(SLUG[r.id])}.html" style="display:block;padding:11px 0;border-bottom:1px solid var(--line)">→ ${JA_CONTENT[r.id].title}</a>`).join("") + `</section>` : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<!--langredir--><script>(function(){try{var p=location.pathname.split('/').pop()||'index.html';if(p!=='ja.html'){var isCn=p.slice(-8)==='-cn.html';var L=localStorage.getItem('lang');if(L==='cn'&&!isCn){location.replace(p.slice(0,-5)+'-cn.html');return;}if(L==='tw'&&isCn){location.replace(p.slice(0,-8)+'.html');return;}}}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-lang]');if(!a)return;var l=a.getAttribute('data-lang');if(l==='tw'||l==='cn'){try{localStorage.setItem('lang',l);}catch(_){}}},true);})();</script>
<script>(function(){var css="html[data-fs=s]{--fs:1}html[data-fs=m]{--fs:1.1}html[data-fs=l]{--fs:1.22}.fsctl{position:fixed;left:14px;bottom:16px;z-index:60;display:flex;gap:2px;background:#fff;border:1px solid #e7e5e4;border-radius:999px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.12)}.fsctl button{border:none;background:none;cursor:pointer;font-size:13px;font-weight:700;color:#78716c;padding:5px 9px;border-radius:999px;font-family:inherit;line-height:1}.fsctl button.on{background:#f43f5e;color:#fff}";var st=document.createElement("style");st.textContent=css;(document.head||document.documentElement).appendChild(st);var f="m";try{f=localStorage.getItem("fs")||"m";}catch(e){}document.documentElement.setAttribute("data-fs",f);window.setFS=function(x){document.documentElement.setAttribute("data-fs",x);try{localStorage.setItem("fs",x);}catch(e){}u();};function u(){var c=document.documentElement.getAttribute("data-fs"),bs=document.querySelectorAll(".fsctl button");for(var i=0;i<bs.length;i++){bs[i].className=(bs[i].getAttribute("data-f")===c?"on":"");}}function init(){if(document.querySelector(".fsctl"))return;var d=document.createElement("div");d.className="fsctl";d.setAttribute("aria-label","文字サイズ");var labels=["小","中","大"],keys=["s","m","l"];for(var i=0;i<3;i++){(function(k,t){var btn=document.createElement("button");btn.textContent=t;btn.setAttribute("data-f",k);btn.onclick=function(){setFS(k);};d.appendChild(btn);})(keys[i],labels[i]);}document.body.appendChild(d);u();}if(document.body){init();}else{document.addEventListener("DOMContentLoaded",init);}})();</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XN785WJLZ3"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-XN785WJLZ3");</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${(j.tags||[]).join(",")},日本の不動産,中国語対応 不動産,台湾人 不動産,中国語 不動産仲介,日本 不動産購入">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${url}">
<link rel="alternate" hreflang="zh-Hant" href="${twUrl}">
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
<div class="sbar"><div class="wrap" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px"><a href="ja.html" style="font-weight:800;color:var(--rose);font-size:17px">周周・日本の不動産</a><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div></div>
<main class="wrap" style="max-width:760px;padding-top:18px">
<a class="back" href="ja.html">← ホームに戻る</a>
<p style="font-size:13px;color:var(--mut);margin-bottom:14px"><a href="ja.html" style="color:var(--mut)">ホーム</a> › ${catName}</p>
${a.coverFit === "contain" ? `<img src="${cover}" alt="${esc(j.title)}" loading="lazy" style="display:block;margin:0 auto 20px;max-width:100%;max-height:360px;width:auto;height:auto;border-radius:18px">` : `<div class="acov" style="${bg}"><span>${catName}</span></div>`}
<h1 class="atitle" style="margin-bottom:10px">${j.title}</h1>
<div class="am" style="display:flex;gap:14px;color:var(--mut);font-size:14px;margin-bottom:16px"><span>執筆者：周周</span><span>${a.date}</span></div>
<div class="share"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">f シェア</a><a href="https://www.threads.net/intent/post?text=${encodeURIComponent(j.title + " " + url)}" target="_blank" rel="noopener">Threadsでシェア</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(j.title)}" target="_blank" rel="noopener">𝕏 でポスト</a><a href="javascript:void(0)" onclick="navigator.clipboard&&navigator.clipboard.writeText('${url}');this.textContent='✓ コピーしました';return false">🔗 リンクをコピー</a></div>
<div class="post">
${bodyHTML}
</div>
${vid}
<div class="ablock" style="margin-top:26px"><div><b>この記事はお役に立ちましたか？ご質問はお気軽にどうぞ</b><br><span style="color:var(--mut);font-size:14px">気になる物件があれば、そのまま周周までお送りください。</span></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div>
${relHTML}
<p style="margin:30px 0;font-size:14px"><a href="ja.html" style="color:var(--rose);font-weight:600">← 周周のほかの記事を見る</a></p>
</main>
<footer><div class="wrap row"><div><p style="font-weight:700">周周・日本の不動産</p><p style="font-size:14px;color:var(--mut)">📍 東京23区を中心に、神奈川・千葉・横浜エリアにも対応しています。</p></div><a class="btn btn-line" href="${S.line}" target="_blank" rel="noopener">LINEで相談する</a></div><div class="wrap" style="padding:0 16px 10px;display:flex;flex-wrap:wrap;gap:14px;font-size:13px"><a href="ja.html" style="color:var(--mut)">ホーム</a></div><div class="wrap cp">© ${new Date().getFullYear()} 周周・日本の不動産</div></footer>
<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a&&a.href&&a.href.indexOf("lin.ee")>-1&&typeof gtag==="function"){gtag("event","line_click",{link_id:a.id||"",page:location.pathname});}});</script>
<button id="btt" aria-label="トップへ戻る">↑</button>
<script>document.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('.ytf');if(f&&!f.dataset.l){f.dataset.l=1;f.innerHTML='<iframe src="https://www.youtube.com/embed/'+f.dataset.id+'?autoplay=1" title="動画" allow="autoplay;fullscreen" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>';}});</script>
<script>(function(){var rp=document.getElementById('rp'),btt=document.getElementById('btt');function os(){var h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,mx=h.scrollHeight-h.clientHeight;rp.style.width=(mx>0?sc/mx*100:0)+'%';btt.style.display=sc>500?'flex':'none';}window.addEventListener('scroll',os,{passive:true});os();btt.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};var post=document.querySelector('.post');if(post){var heads=[];post.querySelectorAll('p').forEach(function(p){var fe=p.querySelector('b');if(fe&&p.firstElementChild===fe){var t=fe.textContent.trim();if(t.length>=3&&t.length<=42)heads.push({p:p,t:t});}});if(heads.length>=4){var toc=document.createElement('div');toc.className='toc collapsed';var tt=document.createElement('div');tt.className='toc-t';tt.innerHTML='📑 目次 <span class="toc-x"></span>';tt.onclick=function(){toc.classList.toggle('collapsed');};var list=document.createElement('div');list.className='toc-list';heads.forEach(function(h,i){var id='sec'+i;h.p.id=id;h.p.classList.add('sec');var a=document.createElement('a');a.href='#'+id;a.textContent=h.t;list.appendChild(a);});toc.appendChild(tt);toc.appendChild(list);post.parentNode.insertBefore(toc,post);}}})();</script>
<!--langswitch--><script>(function(){var p=location.pathname.split('/').pop()||'index.html';var isJa=(p==='ja.html');var isCn=(!isJa&&p.slice(-8)==='-cn.html');var twHref,cnHref;if(isJa){twHref='index.html';cnHref='index-cn.html';}else if(isCn){twHref=p.slice(0,-8)+'.html';cnHref=p;}else{twHref=p;cnHref=p.slice(0,-5)+'-cn.html';}var jaHref='ja.html';var cur=isJa?'ja':(isCn?'cn':'tw');function mk(label,href,key){var a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.textContent=label;a.setAttribute('data-lang',key);var active=(key===cur);a.style.cssText='display:block;padding:9px 14px;font-size:14px;text-decoration:none;border-radius:8px;white-space:nowrap;'+(active?'color:#f43f5e;font-weight:700;background:#fff1f2':'color:#292524');if(active)a.setAttribute('aria-current','page');return a;}var wrap=document.createElement('div');wrap.style.cssText='position:relative;flex:0 0 auto';var btn=document.createElement('button');btn.type='button';btn.textContent='🌐 言語';btn.setAttribute('aria-label','切換語言 / Language / 语言');btn.style.cssText='background:#fff;border:1px solid #e7e5e4;border-radius:999px;font-size:13px;font-weight:700;color:#57534e;padding:6px 12px;cursor:pointer;font-family:inherit;white-space:nowrap';var menu=document.createElement('div');menu.style.cssText='display:none;position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #e7e5e4;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px;min-width:130px;z-index:200';menu.appendChild(mk('繁體中文',twHref,'tw'));menu.appendChild(mk('简体中文',cnHref,'cn'));menu.appendChild(mk('日本語',jaHref,'ja'));btn.onclick=function(e){e.stopPropagation();menu.style.display=(menu.style.display==='block')?'none':'block';};document.addEventListener('click',function(){menu.style.display='none';});wrap.appendChild(btn);wrap.appendChild(menu);function insertInto(container,beforeEl){if(beforeEl&&beforeEl.parentNode===container){container.insertBefore(wrap,beforeEl);}else{container.appendChild(wrap);}}var sbarRow=document.querySelector('.sbar .wrap')||document.querySelector('.sbar .in');if(sbarRow){var line=sbarRow.querySelector('a[href*="lin.ee"]');if(line){var grp=document.createElement('div');grp.style.cssText='display:flex;align-items:center;gap:10px';line.parentNode.insertBefore(grp,line);grp.appendChild(wrap);grp.appendChild(line);}else{sbarRow.appendChild(wrap);}return;}var hdRight=document.querySelector('header .hd-right');if(hdRight){var line2=hdRight.querySelector('.btn-line');insertInto(hdRight,line2);return;}wrap.style.cssText+=';position:fixed;top:10px;right:12px;z-index:210';document.body.appendChild(wrap);})();</script>
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
