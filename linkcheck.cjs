#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   外部連結檢查（周周 2026-10-23 指示，密語核准）

   ▍為什麼需要這支
     文章裡引用了大量外部來源：東京 23 區的垃圾分類頁、法務省、國交省、
     各銀行與資料來源。這些網址會隨對方改版而失效，而讀者點到死連結，
     傷的是周周的專業形象。
     但是——寫網站的 AI 跑在有 egress proxy 的容器裡，`city.*.lg.jp`、
     `moj.go.jp` 這些網域**連 DNS 都解不到**，所以巡邏自己永遠檢查不了。
     這支的設計就是給 .github/workflows/linkcheck.yml 在 GitHub 的機器上跑
     （那邊連得到日本的政府網站），結論再由 patrol 的 A12 讀回來。

   ▍怎麼跑
     node linkcheck.cjs          # 檢查全部外部連結
     node linkcheck.cjs --json   # 另外輸出機器可讀 JSON

   ▍⚠️ 最重要的設計：區分「真的壞了」與「對方擋機器人」
     政府網站很常擋沒有瀏覽器特徵的請求，回 403；有些會擋 HEAD 只收 GET；
     有些會 timeout。這些**都不是壞連結**，如果一律當失敗，這支就會天天
     紅字，紅久了就沒人看了——patrol.cjs 當初就是為了治這個毛病才存在的。
     所以：
       ・確定壞（404 / 410 / DNS 查不到）  → FAIL，讓 workflow 紅字
       ・可能只是被擋（403 / 405 / 429 / timeout / 連線被拒）→ WARN，不紅字
     要新增例外，加進下面的 SKIP，不要去動判斷邏輯。
   ══════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

/* 不用檢查的網址（已知會擋機器人、或是不需要每週確認的） */
const SKIP = [
  /^https?:\/\/(www\.)?chouchouinjapan\.com/,   // 自家站由 uptime.yml 負責
  /^https?:\/\/janny00143\.github\.io/,
  /^https?:\/\/lin\.ee\//,                      // LINE 短網址會擋機器人
  /^https?:\/\/(www\.)?youtube\.com\/@/,        // 頻道頁常回 403
  /^https?:\/\/(twitter|x)\.com\/intent\//,      // 分享按鈕，一律擋機器人
  /^https?:\/\/(www\.)?facebook\.com\/sharer/,
  /^https?:\/\/(www\.)?threads\.(net|com)\/intent\//,
  /^https?:\/\/social-plugins\.line\.me\//,
  /^https?:\/\/i\.ytimg\.com\//,                // 縮圖圖床
  /^https?:\/\/fonts\.(googleapis|gstatic)\.com/,
  /^https?:\/\/www\.googletagmanager\.com/,
  /^https?:\/\/www\.gstatic\.com/,
  /^mailto:/, /^tel:/, /^javascript:/, /^#/,
];

const UA = "Mozilla/5.0 (compatible; chouchou-linkcheck/1.0; +https://chouchouinjapan.com/)";
const TIMEOUT_MS = 20000;
const GAP_MS = 400;          // 同一台主機之間隔一下，不要打人家網站

function htmlFiles() {
  return fs.readdirSync(__dirname)
    .filter(f => f.endsWith(".html"))
    .map(f => path.join(__dirname, f));
}

/* 從所有 HTML 抓出 href 的外部連結 → { url: [出現的檔案...] } */
function collect() {
  const map = new Map();
  for (const f of htmlFiles()) {
    const s = fs.readFileSync(f, "utf8");
    /* ⚠️ 只掃 <a> 的 href。<link rel="preconnect" href="https://i.ytimg.com"> 這種
       是給瀏覽器預先連線用的，連到裸網域本來就會 404，不是壞掉的連結。
       2026-10-23 第一次跑就踩到這個誤判。 */
    for (const m of s.matchAll(/<a\b[^>]*?href=["']([^"']+)["']/gi)) {
      const u = m[1].trim();
      if (!/^https?:\/\//i.test(u)) continue;
      if (SKIP.some(re => re.test(u))) continue;
      const base = f.split("/").pop();
      if (!map.has(u)) map.set(u, new Set());
      map.get(u).add(base);
    }
  }
  return map;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* 先 HEAD（省流量），被擋或不支援就改 GET。
   回傳 { state: "ok"|"dead"|"unknown", detail } */
async function probe(url) {
  for (const method of ["HEAD", "GET"]) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctl.signal,
        headers: { "User-Agent": UA, "Accept-Language": "ja,zh-TW;q=0.8" },
      });
      clearTimeout(t);
      const c = res.status;
      if (c >= 200 && c < 300) return { state: "ok", detail: String(c) };
      if (c === 404 || c === 410) return { state: "dead", detail: String(c) };
      // 405/501：這個方法不支援 → 換 GET 再試
      if ((c === 405 || c === 501) && method === "HEAD") continue;
      // 403/429/5xx：多半是擋機器人或對方暫時出問題，不能判成壞連結
      return { state: "unknown", detail: String(c) };
    } catch (e) {
      clearTimeout(t);
      const msg = String((e && e.cause && e.cause.code) || (e && e.name) || e);
      // 網域本身查不到 = 真的沒了
      if (/ENOTFOUND|EAI_AGAIN/.test(msg)) return { state: "dead", detail: "DNS " + msg };
      if (method === "HEAD") continue;           // 換 GET 再試一次
      return { state: "unknown", detail: msg };
    }
  }
  return { state: "unknown", detail: "both methods failed" };
}

(async () => {
  const map = collect();
  const urls = [...map.keys()].sort();
  console.log(`檢查 ${urls.length} 個外部連結（來自 ${htmlFiles().length} 個頁面）\n`);

  const dead = [], unknown = [];
  let ok = 0;
  const byHost = new Map();
  for (const u of urls) {
    const h = new URL(u).host;
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(u);
  }

  /* 依主機分組並行，但同一台主機內循序 + 間隔，避免打爆對方 */
  await Promise.all([...byHost.values()].map(async list => {
    for (const u of list) {
      const r = await probe(u);
      const where = [...map.get(u)].slice(0, 3).join(", ");
      if (r.state === "ok") ok++;
      else if (r.state === "dead") { dead.push({ url: u, detail: r.detail, where }); }
      else { unknown.push({ url: u, detail: r.detail, where }); }
      await sleep(GAP_MS);
    }
  }));

  console.log(`✅ 正常 ${ok}`);
  if (unknown.length) {
    console.log(`\n⚠️  無法確認 ${unknown.length} 個（多半是對方擋機器人，不算壞）：`);
    for (const d of unknown) console.log(`   [${d.detail}] ${d.url}\n       出現在：${d.where}`);
  }
  if (dead.length) {
    console.log(`\n❌ 確定失效 ${dead.length} 個：`);
    for (const d of dead) {
      console.log(`   [${d.detail}] ${d.url}\n       出現在：${d.where}`);
      // GitHub Actions 的 annotation，讓 log 一眼看得到
      console.log(`::error::連結失效 ${d.url}（${d.detail}）出現在 ${d.where}`);
    }
  }

  if (process.argv.includes("--json")) {
    fs.writeFileSync(path.join(__dirname, "linkcheck-report.json"),
      JSON.stringify({ at: new Date().toISOString(), ok, dead, unknown }, null, 1) + "\n");
  }

  console.log(`\n${dead.length ? "❌ 有失效連結，請修正" : "沒有失效連結"}`);
  process.exit(dead.length ? 1 : 0);
})();
