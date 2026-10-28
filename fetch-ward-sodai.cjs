#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   東京 23 區・大型垃圾（粗大ごみ）受理窗口抓取
   周周 2026-10-27 核准的「官方資料中心」第二頁用的資料。

   ▍為什麼只能在 GitHub Actions 上跑
     寫網站的 AI 跑在有 egress policy 的容器裡，`city.*.lg.jp` 連 CONNECT
     都被回 403（政策阻擋，不是網路故障）。和 fetch-ward-gomi.cjs 同樣的狀況。

   ▍怎麼找到「粗大ごみ」那一頁（不猜網址）
     ⚠️ 絕對不要自己拼粗大ごみ頁的網址——拼出來的八成是 404，而且沒人會發現。
     做法是從「已經確認過存在」的那 23 個垃圾分類頁出發（和 ward-gomi 同一份
     WARDS），在頁面裡找連結文字含「粗大」的連結，跟著點進去。
     大部分區的垃圾頁都有這條連結；找不到就回報該區抓不到，不要編。

   ▍抓什麼
     ・受理中心電話：0X-XXXX-XXXX 形式，且附近出現「受付」「センター」等字樣
     ・線上申請網址：連結文字或網址含 申込／受付／インターネット／sodai
     ・該頁網址本身（當成「官方頁」給使用者點）

   ▍用法
     node fetch-ward-sodai.cjs              # 全部 23 區 → ward-sodai.json
     node fetch-ward-sodai.cjs 品川區        # 只跑一區，印出結果不寫檔（除錯用）

   ▍離開碼
     0 = 每一區的垃圾頁都打得開；1 = 有區的頁面本身打不開（網址要更新）
   ══════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (compatible; chouchou-sodai/1.0; +https://chouchouinjapan.com/)";
const TIMEOUT = 25000;

/* 和 fetch-ward-gomi.cjs 共用同一份起點。那 23 個網址每週都被驗證過一次，
   是目前站上最可靠的「各區官方垃圾頁」清單。 */
const { WARDS } = require("./ward-list.cjs");

/* 連結文字長這樣就是通往粗大ごみ那一頁 */
const SODAI_LINK = /粗大(ごみ|ゴミ|塵)/;
/* 這些字出現在電話號碼附近，才當成「受理窗口的電話」，
   不然會抓到頁尾的區公所總機。 */
const PHONE_CTX = /受付|センター|申込|予約|電話/;
/* 線上申請 */
const ONLINE = /インターネット|ネット受付|オンライン|電子申請|申込|受付|sodai|粗大/i;

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, " ").trim();
}
const strip = h => decode(h.replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));

async function get(url, method = "GET", extraHeaders) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method, redirect: "follow", signal: ctl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "ja", ...(extraHeaders || {}) },
    });
    clearTimeout(t);
    return res;
  } catch (e) { clearTimeout(t); return null; }
}

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
    out.push({ href, text, title: decode(title) });
  }
  return out;
}

/* 全形數字與連字號 → 半形（區公所頁面很常用全形寫電話） */
function han(s) {
  return String(s || "").replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[－−―ー‐]/g, "-");
}

/* 從純文字裡找「受理窗口電話」。
   ⚠️ 不能只看「號碼附近有沒有受付、センター」——區公所的頁面上，區役所代表號
   常常就排在粗大ごみ受付センター的前一行，±60 字的視窗會把兩個都涵蓋進去，
   結果抓到總機（2026-10-29 用假頁面測出來的）。
   所以改成：只看號碼「前面」那 40 字，而且用加減分挑最像的一個，
   FAX 與區役所代表號直接扣到負分。 */
function findPhone(text) {
  const t = han(text);
  const hits = [];
  for (const m of t.matchAll(/0\d{1,4}-\d{2,4}-\d{3,4}/g)) {
    const before = t.slice(Math.max(0, m.index - 40), m.index);
    let score = 0;
    if (/粗大.{0,15}(受付|センター)/.test(before)) score += 5;
    else if (/受付センター/.test(before)) score += 4;
    if (/電話|TEL/i.test(before)) score += 1;
    if (/申込|予約/.test(before)) score += 1;
    if (/代表|総合案内|区役所代表/.test(before)) score -= 5;
    /* ⚠️ FAX 只看號碼「前面」，不看後面。
       「電話 03-… ファクス 03-…」是區公所頁面最常見的排法，看後面的話
       正確的那支電話會因為後面跟著 FAX 而被扣掉（2026-10-29 測出來的）。
       FAX 的標示一定在它自己的號碼前面，所以看前面就夠了。 */
    if (/(ファクス|ファックス|FAX)/i.test(before)) score -= 8;
    if (score > 0) hits.push({ num: m[0], score, before });
  }
  if (!hits.length) return { phone: "", why: "頁面上找不到像「粗大ごみ受付センター」的電話號碼" };
  hits.sort((a, b) => b.score - a.score);
  return { phone: hits[0].num, why: "" };
}

async function one([zh, ja, gomiPage]) {
  const res = await get(gomiPage);
  if (!res || !res.ok) {
    return { ward: zh, wardJa: ja, pageOk: false, pageStatus: res ? res.status : "fetch failed", from: gomiPage };
  }
  const html = await res.text();

  /* ① 從垃圾頁找「粗大ごみ」的連結 */
  const cands = anchors(html, gomiPage)
    .filter(a => SODAI_LINK.test(a.text + " " + a.title))
    .filter(a => /^https?:/i.test(a.href) && !/\.pdf(\?|$)/i.test(a.href));
  if (!cands.length) {
    return { ward: zh, wardJa: ja, pageOk: true, sodaiPage: "", from: gomiPage,
             note: "垃圾頁上沒有連到粗大ごみ的連結（可能在網站其他位置）" };
  }

  /* 同一個網域的優先，避免跟到外部的受付系統首頁 */
  const host = new URL(gomiPage).host;
  cands.sort((a, b) => (new URL(b.href).host === host) - (new URL(a.href).host === host));
  const sodaiPage = cands[0].href;

  /* ② 打開粗大ごみ那一頁，抓電話與線上申請 */
  const r2 = await get(sodaiPage);
  if (!r2 || !r2.ok) {
    return { ward: zh, wardJa: ja, pageOk: true, sodaiPage, from: gomiPage,
             note: `粗大ごみ頁打不開（${r2 ? r2.status : "fetch failed"}）` };
  }
  const h2 = await r2.text();
  const text2 = strip(h2);
  const { phone, why } = findPhone(text2);

  const online = anchors(h2, sodaiPage)
    .filter(a => ONLINE.test(a.text + " " + a.title + " " + a.href))
    .filter(a => /^https?:/i.test(a.href) && a.href !== sodaiPage && !/\.pdf(\?|$)/i.test(a.href))
    /* 外部的受付システム（sodai-uketsuke.jp など）が本命なので、別ホストを優先 */
    .sort((a, b) => (new URL(a.href).host === host) - (new URL(b.href).host === host));

  return {
    ward: zh, wardJa: ja, pageOk: true, from: gomiPage,
    sodaiPage,
    sodaiTitle: decode((h2.match(/<title>([^<]*)<\/title>/i) || [])[1] || ""),
    phone, phoneNote: why,
    online: online.length ? { url: online[0].href, label: online[0].text.slice(0, 60) } : null,
  };
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
    if (!r.pageOk) console.log(`垃圾頁抓不到（${r.pageStatus}）`);
    else if (!r.sodaiPage) console.log(`找不到粗大ごみ的連結`);
    else console.log(`${r.phone || "（無電話）"}${r.online ? " ＋線上申請" : ""}`);
    if (r.pageOk && r.sodaiPage && !r.phone && r.phoneNote) console.log(`   ⚠️ ${w[0]}：${r.phoneNote}\n      ${r.sodaiPage}`);
    await new Promise(s => setTimeout(s, 600));
  }

  const withPhone = out.filter(r => r.phone).length;
  const withOnline = out.filter(r => r.online).length;
  const pageFail = out.filter(r => !r.pageOk);
  console.log(`\n== 結果：${out.length} 區中，${withPhone} 區抓到電話、${withOnline} 區抓到線上申請 ==`);
  if (pageFail.length) {
    console.log(`⚠️ 起點的垃圾頁抓不到的 ${pageFail.length} 區（網址可能改版，要更新 ward-list.cjs）：`);
    for (const r of pageFail) console.log(`   ${r.ward} [${r.pageStatus}] ${r.from}`);
  }

  if (only) { console.log(JSON.stringify(out, null, 1)); return; }

  fs.writeFileSync(path.join(__dirname, "ward-sodai.json"),
    JSON.stringify({ updated: new Date().toISOString().slice(0, 10), wards: out }, null, 1) + "\n");
  console.log("\n已寫入 ward-sodai.json");

  // 起點的頁面本身抓不到才算失敗（某一區沒有把粗大連結放在垃圾頁上，不是錯誤）
  process.exit(pageFail.length ? 1 : 0);
})();
