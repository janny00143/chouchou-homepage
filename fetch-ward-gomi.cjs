#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   東京 23 區・垃圾分類「中文版 PDF」抓取器
   （周周 2026-10-23 指示「23 區都去抓下來」「要可以下載 PDF」，密語核准）

   ▍為什麼要做成 GitHub Action
     寫網站的 AI 跑在有 egress policy 的容器裡，`city.*.lg.jp` 這些網域
     連 CONNECT 都被回 403（政策阻擋，不是網路問題，不可繞過）。
     所以**容器裡永遠抓不到各區官網**。
     這支設計成在 GitHub 的機器上跑（.github/workflows/ward-gomi.yml），
     那邊連得到日本的政府網站，抓完把結果 commit 回 repo，
     產生器再讀 ward-gomi-links.json 把表格做出來。

   ▍抓什麼
     每一區的官方頁 → 解析 HTML → 找出「中文版」的 PDF 連結。
     判斷方式是看連結文字與前後文有沒有中文相關的字（中国語／中文／Chinese／
     簡体／繁体…），再確認該 PDF 真的回 200。
     抓不到就留空，產生器會退回「連到官方頁」——**寧可少給，不要給假的**。

   ▍怎麼跑
     node fetch-ward-gomi.cjs           # 全部 23 區
     node fetch-ward-gomi.cjs 荒川區     # 只抓一區（除錯用）
   ══════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (compatible; chouchou-gomi/1.0; +https://chouchouinjapan.com/)";
const TIMEOUT = 25000;

/* 23 區的官方垃圾分類／外語版頁面。
   ⚠️ 這些網址是搜尋引擎實際回傳的，不是拼湊的。改版時請更新這裡。 */
const WARDS = [
  ["千代田區", "千代田区", "https://www.city.chiyoda.lg.jp/koho/kurashi/gomi/wakekata/index.html"],
  ["中央區", "中央区", "https://www.city.chuo.lg.jp/a0039/kurashi/gomi/bunbetsu/wakekata/panhuretto.html"],
  ["港區", "港区", "https://www.city.minato.tokyo.jp/gomigenryou/kurashi/gomi/kate/k-wakekata/guidebook.html"],
  ["新宿區", "新宿区", "https://www.city.shinjuku.lg.jp/seikatsu/file09_02_00001.html"],
  ["文京區", "文京区", "https://www.city.bunkyo.lg.jp/b039/p000928.html"],
  ["台東區", "台東区", "https://www.city.taito.lg.jp/kurashi/gomi/wakekata/20180124165732477.html"],
  ["墨田區", "墨田区", "https://www.city.sumida.lg.jp/kurashi/gomi_recycle/wakedashi_pamphlet/foreignlanguage.html"],
  ["江東區", "江東区", "https://www.city.koto.lg.jp/388010/kurashi/gomi/kate/7348.html"],
  ["品川區", "品川区", "https://www.city.shinagawa.tokyo.jp/PC/kankyo/kankyo-gomi/gomi-kateigomi/gomi-kateigomi-dashikata/hpg000005617.html"],
  ["目黑區", "目黒区", "https://www.city.meguro.tokyo.jp/recycle/kurashi/gomi/shigengomipdf.html"],
  ["大田區", "大田区", "https://www.city.ota.tokyo.jp/seikatsu/gomi/gaikokujinnmukepannfure.html"],
  ["世田谷區", "世田谷区", "https://www.city.setagaya.lg.jp/02241/409.html"],
  ["澀谷區", "渋谷区", "https://www.city.shibuya.tokyo.jp/kurashi/gomi/kateigomi/gomi_panf.html"],
  ["中野區", "中野区", "https://www.city.tokyo-nakano.lg.jp/kurashi/gomi/dashikata/leaflet.html"],
  ["杉並區", "杉並区", "https://www.city.suginami.tokyo.jp/s104/5928.html"],
  ["豐島區", "豊島区", "https://www.city.toshima.lg.jp/gomi-fl/foreignlanguage.html"],
  ["北區", "北区", "https://www.city.kita.lg.jp/living/bins/1002013/1002019.html"],
  ["荒川區", "荒川区", "https://www.city.arakawa.tokyo.jp/a025/bunbetusassi.html"],
  ["板橋區", "板橋区", "https://www.city.itabashi.tokyo.jp/tetsuduki/gomi/shigen/1001856.html"],
  ["練馬區", "練馬区", "https://www.city.nerima.tokyo.jp/kurashi/gomi/recycle/downloads.html"],
  ["足立區", "足立区", "https://www.city.adachi.tokyo.jp/seso/manual.html"],
  ["葛飾區", "葛飾区", "https://www.city.katsushika.lg.jp/information/1000087/1030269/1025771/1018561.html"],
  ["江戶川區", "江戸川区", "https://www.city.edogawa.tokyo.jp/e025/kurashi/gomi_recycle/kategomi/bunbetsu/shigengomi/pamphlet/china.html"],
];

/* 連結文字／前後文裡出現這些字，就當成「這是中文版」 */
const CN_HINT = /中国語|中國語|中文|簡体|简体|繁体|繁體|Chinese|chinese|CHINESE|中・韓|英・中|中文版|ちゅうごくご/;
/* 這些是其他語言，要排除（避免把韓文版當成中文版） */
const OTHER_LANG = /ハングル|韓国語|韓國語|韓国版|Korean|english|English|ENGLISH|英語|ベトナム|ネパール|タガログ|ミャンマー|やさしい日本語|Vietnam|Nepal|Tagalog|Myanmar/;
/* 一份 PDF 收了好幾種語言的（豐島區「英語版・中国語版・韓国語版」、板橋區「日・英・中・韓」、
   江東區「中国語・韓国語版」、足立區「中国語・韓国版」…）。
   這種要標出來——客戶下載後打開看到英文開頭，會以為自己下錯檔案。
   周周 2026-10-23 指出豐島區的情況後補上。 */
const MULTI_LANG = /英語|English|ハングル|韓国語|韓国版|Korean|多言語|多語|日・英|・英・|・韓|英・中|中・韓|・ハングル/;

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, " ").trim();
}
const strip = h => decode(h.replace(/<[^>]+>/g, " "));

async function get(url, method = "GET", extraHeaders) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method, redirect: "follow", signal: ctl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "ja,zh-TW;q=0.8", ...(extraHeaders || {}) },
    });
    clearTimeout(t);
    return res;
  } catch (e) { clearTimeout(t); return null; }
}

/* 把頁面裡的 <a> 全部拆出來：{ href, text, context } */
function anchors(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = m[1] || "";
    const hm = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hm) continue;
    let href;
    try { href = new URL(decode(hm[1]), baseUrl).toString(); } catch (e) { continue; }
    const text = strip(m[2]);
    const title = (attrs.match(/title\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    // 前後各取一段文字當 context（有些區把語言寫在連結外面）
    const i = m.index;
    const ctx = strip(html.slice(Math.max(0, i - 260), i + m[0].length + 120));
    out.push({ href, text, title: decode(title), ctx });
  }
  return out;
}

/* 確認一個 PDF 真的存在。
   ⚠️ 政府網站對「不像瀏覽器」的請求很敏感，所以要一路放寬著試，
   不可以一次失敗就判它死掉——品川區的中文版就是這樣被誤判成失效的
   （周周 2026-10-23 指出品川有中文版才查出來）。順序：
     ① HEAD（最省流量，多數區吃這個）
     ② GET + Range 只取開頭 1KB，並帶 Referer（裝成從該區頁面點過來）
     ③ GET 完整（不帶 Range；有些主機看到 Range 直接回錯），
        確認到就立刻取消下載，不會真的把整份 10MB 拉完
   回傳 { ok, status, sizeKB, tried }；tried 是每一步的結果，失敗時印出來診斷。 */
async function exists(url, referer) {
  const ref = { Referer: referer, Accept: "application/pdf,*/*" };
  const steps = [
    ["HEAD", "HEAD", undefined],
    ["GET+Range", "GET", { ...ref, Range: "bytes=0-1023" }],
    ["GET", "GET", ref],
  ];
  const tried = [];
  for (const [name, method, headers] of steps) {
    const r = await get(url, method, headers);
    if (!r) { tried.push(`${name}=連不上`); continue; }
    tried.push(`${name}=${r.status}`);
    if (r.ok || r.status === 206) {
      // 用 Range 取回來時 content-length 是那 1KB，要改看 content-range 的總長度
      const cr = r.headers.get("content-range") || "";
      const total = Number((cr.match(/\/(\d+)$/) || [])[1] || 0);
      const len = total || Number(r.headers.get("content-length") || 0);
      try { if (r.body) await r.body.cancel(); } catch (e) {}   // 不要真的把整份下載完
      return { ok: true, status: r.status, sizeKB: len ? Math.round(len / 1024) : null, tried: tried.join(" ") };
    }
    try { if (r.body) await r.body.cancel(); } catch (e) {}
    await new Promise(s => setTimeout(s, 250));
  }
  return { ok: false, status: tried[tried.length - 1] || "fetch failed", tried: tried.join(" ") };
}

async function one([zh, ja, page]) {
  const res = await get(page);
  if (!res || !res.ok) {
    return { ward: zh, wardJa: ja, page, pageOk: false, pageStatus: res ? res.status : "fetch failed", pdfs: [] };
  }
  const html = await res.text();
  const list = anchors(html, page);

  /* 這一頁本身就是「中文版專頁」嗎（例：江戶川區 .../pamphlet/china.html）。
     是的話，頁內的 PDF 不必每個都標語言也算中文版。 */
  const pageIsCn = /\/(china|chinese|zh|cn)[\./]/i.test(page) ||
    CN_HINT.test(strip(html.slice(0, 3000)).slice(0, 400));

  /* ⚠️ 判斷語言一定要以「連結自己的文字」為主，前後文只能當輔助。
     2026-10-23 第一次跑就是因為吃了前後文，把千代田區的 Français、
     中央區與杉並區的「英語」版都當成中文版抓進來——給客戶錯的語言
     比沒給還糟。所以只收「連結文字本身明確寫了中文」的，
     或是在中文版專頁裡面的。 */
  const cands = [];
  for (const a of list) {
    if (!/\.pdf(\?|$)/i.test(a.href)) continue;
    const own = a.text + " " + a.title;
    const ownCn = CN_HINT.test(own);
    /* ⚠️ 「中国語・韓国語版」「【Chinese・Korean】」這種一份 PDF 收多種語言的很常見，
       所以只有「沒標中文、卻標了別的語言」才出局。2026-10-23 第二次跑時漏掉這個
       條件，把江東區與豐島區的中文版誤殺了。 */
    if (!ownCn && OTHER_LANG.test(own)) continue;
    if (!ownCn && !pageIsCn) continue;               // 自己沒標中文、也不在中文專頁 → 不收
    /* ⚠️ 繁簡也只能看連結自己的文字。吃前後文的話，荒川區那種「繁体版、簡体版」
       並排的頁面會把簡體那份也標成繁體（2026-10-23 發現）。
       另外該區官網把「繁体」打成「繫体」，所以兩種寫法都認。 */
    const trad = /繁体|繁體|繫体|繫體/.test(own);
    cands.push({
      url: a.href,
      label: a.text || a.title,
      traditional: trad,
      multilang: MULTI_LANG.test(own),          // 一份收了多種語言

      // 純中文版 > 多語合一份；繁體再加分
      rank: (ownCn ? 10 : 0) + (trad ? 3 : 0) - (MULTI_LANG.test(own) ? 4 : 0),
    });
  }

  // 去重複，並讓最像「正式中文版」的排前面
  const seen = new Set();
  const uniq = cands
    .filter(c => !seen.has(c.url) && seen.add(c.url))
    .sort((x, y) => y.rank - x.rank);

  // 逐一確認 PDF 真的在（200 才留）
  const pdfs = [];
  for (const c of uniq.slice(0, 8)) {
    const r = await exists(c.url, page);
    if (r.ok) pdfs.push({ ...c, status: r.status, sizeKB: r.sizeKB });
    else {
      pdfs.push({ ...c, status: r.status, sizeKB: null, dead: true });
      console.log(`\n   ⚠️ ${zh}：這份確認不到，已排除 → ${c.url}\n      ${r.tried}`);
    }
    await new Promise(s => setTimeout(s, 350));
  }
  const good = pdfs.filter(p => !p.dead);

  /* 一個中文版都沒抓到時，把這一頁所有的 PDF 連結印出來。
     不這樣做就只知道「抓不到」，不知道是這區真的沒有中文版，
     還是我的判斷漏了它的寫法。品川區就是這樣查出來的（周周 2026-10-23 指出它有）。 */
  if (!good.length) {
    const all = list.filter(a => /\.pdf(\?|$)/i.test(a.href)).slice(0, 14);
    if (all.length) {
      console.log(`\n   ── ${zh} 這一頁的 PDF 連結（供診斷）──`);
      for (const a of all) console.log(`      「${(a.text || a.title || "(無文字)").slice(0, 50)}」 ${a.href}`);
    } else {
      console.log(`\n   ── ${zh} 這一頁找不到任何 PDF 連結（可能是 JS 動態產生，或在子頁面）──`);
    }
  }

  return { ward: zh, wardJa: ja, page, pageOk: true, pdfs: good };
}

(async () => {
  const only = process.argv[2];
  const targets = only ? WARDS.filter(w => w[0] === only || w[1] === only) : WARDS;
  if (!targets.length) { console.error("找不到這一區：" + only); process.exit(2); }

  const out = [];
  for (const w of targets) {
    process.stdout.write(`抓 ${w[0]} … `);
    const r = await one(w);
    out.push(r);
    console.log(r.pageOk ? `頁面 OK，中文 PDF ${r.pdfs.length} 個` + (r.pdfs.some(p => p.traditional) ? "（有繁體）" : "") : `頁面抓不到（${r.pageStatus}）`);
    await new Promise(s => setTimeout(s, 500));
  }

  const withPdf = out.filter(r => r.pdfs.length).length;
  const pageFail = out.filter(r => !r.pageOk);
  console.log(`\n== 結果：${out.length} 區中，${withPdf} 區抓到中文 PDF ==`);
  if (pageFail.length) {
    console.log(`⚠️ 官方頁抓不到的 ${pageFail.length} 區（網址可能改版了，要更新 fetch-ward-gomi.cjs 的 WARDS）：`);
    for (const r of pageFail) console.log(`   ${r.ward} [${r.pageStatus}] ${r.page}`);
  }

  if (only) { console.log(JSON.stringify(out, null, 1)); return; }

  fs.writeFileSync(path.join(__dirname, "ward-gomi-links.json"),
    JSON.stringify({ updated: new Date().toISOString().slice(0, 10), wards: out }, null, 1) + "\n");
  console.log("\n已寫入 ward-gomi-links.json");

  // 官方頁本身抓不到才算失敗（PDF 抓不到只是那一區沒放中文版，不是錯誤）
  process.exit(pageFail.length ? 1 : 0);
})();
