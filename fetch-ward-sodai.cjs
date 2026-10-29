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
  hits.sort((a, b) => b.score - a.score);
  /* ⚠️ 只收「前面明確寫著粗大ごみ受付／受付センター」的號碼（score ≥ 4）。
     2026-10-29 第二次跑，只靠「電話」兩個字加分的號碼有 7 區是區役所總機（…-1111）。
     抓不到就留白、頁面改放官方頁連結——電話寫錯比沒寫糟很多。 */
  if (!hits.length || hits[0].score < 4) return { phone: "", why: "頁面上找不到前面寫著「粗大ごみ受付センター」的電話號碼" };
  return { phone: hits[0].num, why: "", score: hits[0].score };
}

/* 分享按鈕、二手網站、影片這些不是「受理窗口」，連結文字有「粗大」也不要跟 */
const NOT_SODAI_HOST = /(kaden23rc|twitter\.com|x\.com|facebook\.com|line\.me|jmty\.jp|youtube\.com|youtu\.be|instagram\.com|mercari|google\.)/i;
/* 線上申請：文字要像「上網申請」，或網址本身就是受付系統 */
/* ⚠️ 單看「ウェブ／オンライン」不夠：2026-10-29 第二次跑抓到「ウェブアクセシビリティ方針」
   「手数料のオンライン決済が始まりました」這種。所以文字要同時有「受付／申込」才算。 */
const ONLINE_TEXT = /(インターネット|ネット|オンライン|電子申請|ウェブ|WEB|Web|LINE).{0,12}(受付|申込|申し込)|(受付|申込|申し込).{0,6}(インターネット|オンライン|ウェブ|WEB|Web)|受付センター|こちら.{0,6}(から)?お?申込/;
const NOT_ONLINE_TEXT = /家電|パソコン|アクセシビリティ|ウェブサイトについて|サイトマップ|料金検索|決済/;
const ONLINE_HOST = /sodai|e-tumo|uketsuke|gomi/i;
/* 從小冊子頁往上爬到「ごみ・リサイクル」那一層時，只跟這些字的連結 */
const GOMI_NAV = /ごみ|ゴミ|リサイクル|資源|くらし|暮らし/;

function okSodaiLink(a, host) {
  if (!/^https?:/i.test(a.href) || /\.pdf(\?|$)/i.test(a.href)) return false;
  let h; try { h = new URL(a.href).host; } catch (e) { return false; }
  if (NOT_SODAI_HOST.test(h)) return false;
  /* 區公所自己的頁面，或明顯是粗大受付系統的外部網站 */
  return h === host || ONLINE_HOST.test(h);
}

/* 從起點頁出發，最多看 MAX_PAGES 頁（同網域、只跟「ごみ／リサイクル」類的連結），
   找到第一個連結文字含「粗大」的就停。
   起點多半是「外語小冊子」那一頁，本身不一定有粗大ごみ的連結，
   但麵包屑一定連得回「ごみ・リサイクル」的上層，從那裡就找得到。 */
const MAX_PAGES = 12;
async function findSodaiPage(gomiPage) {
  const host = new URL(gomiPage).host;
  const queue = [gomiPage], seen = new Set();
  let firstOk = null;
  while (queue.length && seen.size < MAX_PAGES) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await get(url);
    if (!res || !res.ok) { if (url === gomiPage) return { pageOk: false, status: res ? res.status : "fetch failed" }; continue; }
    if (url === gomiPage) firstOk = true;
    const html = await res.text();
    const as = anchors(html, url);
    const hit = as.filter(a => SODAI_LINK.test(a.text + " " + a.title) && okSodaiLink(a, host))
      /* 同網域優先；文字短（＝就是「粗大ごみ」那個選單）的優先 */
      .sort((a, b) => ((new URL(b.href).host === host) - (new URL(a.href).host === host)) || (a.text.length - b.text.length));
    if (hit.length) return { pageOk: true, sodaiPage: hit[0].href.split("#")[0], via: url, looked: seen.size };
    for (const a of as) {
      if (!GOMI_NAV.test(a.text)) continue;
      let u; try { u = new URL(a.href); } catch (e) { continue; }
      if (u.host !== host || /\.pdf(\?|$)/i.test(u.pathname)) continue;
      u.hash = "";
      if (!seen.has(u.toString())) queue.push(u.toString());
    }
    await new Promise(s => setTimeout(s, 300));
  }
  return { pageOk: !!firstOk, sodaiPage: "", looked: seen.size };
}

function pickOnline(as, selfUrl) {
  const self = selfUrl.split("#")[0];
  return as.filter(a => {
    if (!/^https?:/i.test(a.href) || /\.pdf(\?|$)/i.test(a.href)) return false;
    if (a.href.split("#")[0] === self) return false;              // 「本文へ移動」這種同頁錨點
    let h; try { h = new URL(a.href).host; } catch (e) { return false; }
    if (NOT_SODAI_HOST.test(h)) return false;
    const tx = a.text + " " + a.title;
    if (NOT_ONLINE_TEXT.test(tx)) return false;
    /* 區公所自己網域的連結，文字一定要像「上網申請」；外部受付系統的網域則放行 */
    return ONLINE_TEXT.test(tx) || (h !== new URL(self).host && ONLINE_HOST.test(h));
  }).sort((a, b) => {
    /* 外部受付系統（sodai-web.jp、e-tumo.jp…）最優先 */
    const sa = ONLINE_HOST.test(new URL(a.href).host) ? 1 : 0, sb = ONLINE_HOST.test(new URL(b.href).host) ? 1 : 0;
    return sb - sa;
  });
}

async function one([zh, ja, gomiPage]) {
  const f = await findSodaiPage(gomiPage);
  if (!f.pageOk) return { ward: zh, wardJa: ja, pageOk: false, pageStatus: f.status, from: gomiPage };
  if (!f.sodaiPage) {
    return { ward: zh, wardJa: ja, pageOk: true, sodaiPage: "", from: gomiPage,
             note: `從起點往上找了 ${f.looked} 頁，都沒有連到粗大ごみ的連結` };
  }
  const sodaiPage = f.sodaiPage;
  const host = new URL(gomiPage).host;

  /* 打開粗大ごみ那一頁，抓電話與線上申請。
     那一頁若只是目錄（電話寫在下一層），再往下看最多 4 個含「粗大」的同網域子頁。 */
  const r2 = await get(sodaiPage);
  if (!r2 || !r2.ok) {
    return { ward: zh, wardJa: ja, pageOk: true, sodaiPage, from: gomiPage,
             note: `粗大ごみ頁打不開（${r2 ? r2.status : "fetch failed"}）` };
  }
  const h2 = await r2.text();
  const as2 = anchors(h2, sodaiPage);
  let { phone, why } = findPhone(strip(h2));
  let online = pickOnline(as2, sodaiPage);
  let phoneFrom = phone ? sodaiPage : "";

  if (!phone || !online.length) {
    const subs = [...new Set(as2.filter(a => SODAI_LINK.test(a.text + " " + a.title))
      .map(a => a.href.split("#")[0])
      .filter(u => { try { return new URL(u).host === host && u !== sodaiPage && !/\.pdf(\?|$)/i.test(u); } catch (e) { return false; } }))].slice(0, 4);
    for (const u of subs) {
      if (phone && online.length) break;
      const r3 = await get(u);
      if (!r3 || !r3.ok) continue;
      const h3 = await r3.text();
      if (!phone) { const p3 = findPhone(strip(h3)); if (p3.phone) { phone = p3.phone; why = ""; phoneFrom = u; } }
      if (!online.length) online = pickOnline(anchors(h3, u), u);
      await new Promise(s => setTimeout(s, 300));
    }
  }

  return {
    ward: zh, wardJa: ja, pageOk: true, from: gomiPage,
    sodaiPage,
    sodaiTitle: decode((h2.match(/<title>([^<]*)<\/title>/i) || [])[1] || ""),
    phone, phoneNote: why, phoneFrom,
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
