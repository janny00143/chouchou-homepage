#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   patrol.cjs — 周周網站的自動巡邏
   2026-09-13 建立（周周指示：「我想知道巡邏有沒有更好的巡邏」→ 把檢查固化）

   為什麼要有這支：以前巡邏的檢查邏輯寫在排程的 prompt 裡，每天由 AI 即席
   重寫一次掃描器，結果同樣的誤判一直復發（光 2026-09 第二週就踩了三個：
   物件 ItemList 掛在 mainEntity 底下被判成「沒有 ItemList」、中日價格
   「不一致」其實只是「含稅 vs 税込」、40 個 <img> 缺 width/height 其實
   全都在 JS 樣板字串裡）。寫成程式之後，誤判修一次就永久消失。

   用法：
     node patrol.cjs                 依日本時間的星期自動選巡邏型態
     node patrol.cjs A|B|full        強制指定（A 技術巡／B 內容巡／full 大巡邏）
     node patrol.cjs --gen           加做「重跑六支產生器後應無 diff」的冪等檢查
                                     ⚠️ 會實際重寫產出檔，確定工作區乾淨再用
     node patrol.cjs --update-baseline   把這次的數字存成新的基準線
     node patrol.cjs --json          額外輸出機器可讀的 JSON

   離開碼：0 = 沒有 FAIL；1 = 有 FAIL（可接 CI）

   ⚠️ 這支跑在有 egress proxy 的容器裡，打不到 chouchouinjapan.com。
      「網站真的活著沒有」由 .github/workflows/uptime.yml 在 GitHub 的機器上檢查，
      A9 只是把那支 workflow 的結論讀回來。

   ⚠️ 加新檢查、或發現誤判，請直接改這個檔並 commit，不要回去改 prompt。
   ══════════════════════════════════════════════════════════════════════ */

"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const { execSync, execFile } = require("child_process");

const ROOT = __dirname;
const BASELINE_FILE = path.join(ROOT, "patrol-baseline.json");

/* ── 已確認的「正常狀況」，不可回報為問題（周周確認過，重複提會很煩）──────
   這裡是白名單的單一真相來源。要放行新東西就加在這裡。 */
const OK = {
  // Google Search Console 的驗證檔，本來就只有一行、沒有 meta
  verifyFile: /^google[0-9a-f]+\.html$/i,
  // 這些頁不套一般的 SEO 規則
  skipSeo: new Set(["404.html"]),
  // property-admin.html → /admin/ 是目錄索引連結，解析成 admin/index.html 才對
  // （已由連結檢查的 resolve 邏輯處理，不需另外列白名單）
  // a9/a13/a14/a16/a35 的封面刻意用 YouTube 外連縮圖，永遠不要回報
  ytCoverArticles: new Set(["a9", "a13", "a14", "a16", "a35"]),
  // 本環境 proxy 擋掉的網域：curl 回 000 是連不上，不是資源失效
  proxyBlocked: "本環境 proxy 會擋掉多數外部網域，回應碼 000 不代表網站失效",
  // 日文物件價格與繁中的差異若只是這些用詞，不算不一致
  priceSynonyms: [
    ["含稅", "税込"], ["參考總額", "参考価格 総額"], ["參考", "参考"],
    ["總額", "総額"], ["萬円", "万円"], ["價格", "価格"],
  ],
};

const args = process.argv.slice(2);
const FLAG = f => args.includes(f);
const WANT_GEN = FLAG("--gen");
const WANT_UPDATE = FLAG("--update-baseline");
const WANT_JSON = FLAG("--json");

/* ── 型態判定：一定要用日本時間的星期 ───────────────────────────────── */
function jstParts() {
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  });                                              // → YYYY-MM-DD
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const dow = d.getDay() === 0 ? 7 : d.getDay();   // 週日 = 7
  const zh = ["", "一", "二", "三", "四", "五", "六", "日"][dow];
  return { date, dow, zh };
}
const JST = jstParts();
const MODE = args.find(a => ["A", "B", "full"].includes(a))
  || (JST.dow === 7 ? "full" : (JST.dow % 2 === 1 ? "A" : "B"));
const MODE_NAME = { A: "🔧 A 型技術巡", B: "📝 B 型內容巡", full: "🔎 週日大巡邏" }[MODE];
const doA = MODE === "A" || MODE === "full";
const doB = MODE === "B" || MODE === "full";
const doC = MODE === "full";

/* ── 結果收集 ────────────────────────────────────────────────────── */
const results = [];   // {id, label, status: OK|FAIL|WARN|INFO, detail, items[]}
const metrics = {};   // 進基準線比對的數字
const add = (id, label, status, detail, items) =>
  results.push({ id, label, status, detail, items: items || [] });

/* ── 共用小工具 ──────────────────────────────────────────────────── */
const htmlFiles = () => fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const isRedirectStub = s => /<meta[^>]+http-equiv=["']refresh["']/i.test(s);
const isNoindex = s => /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(s);
const stripScriptsAndComments = s =>
  s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
const sh = (cmd, opts) => {
  try { return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"], ...opts }).toString().trim(); }
  catch (e) { return ""; }
};
const curlCode = (url, timeout = 15) =>
  sh(`curl -s -o /dev/null -m ${timeout} -w '%{http_code}' ${JSON.stringify(url)}`) || "000";

/* index.html 裡的資料陣列 */
function loadIndexData() {
  const src = read("index.html");
  const grab = (re, label) => {
    const m = src.match(re);
    if (!m) throw new Error(`index.html 找不到 ${label}`);
    return vm.runInNewContext("(" + m[1] + ")");
  };
  return {
    src,
    ART: grab(/const ART\s*=\s*(\[[\s\S]*?\]);\s*\n/, "ART"),
    SLUG: grab(/const SLUG\s*=\s*(\{[\s\S]*?\});/, "SLUG"),
    CATS: grab(/const CATS\s*=\s*(\[[\s\S]*?\]);/, "CATS"),
  };
}
/* properties.js / properties-ja.js（瀏覽器腳本，用 sandbox 載） */
function loadProps(file, key) {
  const c = { document: {} }; c.window = c;
  vm.createContext(c);
  vm.runInContext(read(file), c);
  return c[key];
}

/* ══════════════════════════════════════════════════════════════════════
   共同必做
   ══════════════════════════════════════════════════════════════════════ */
function checkGit() {
  sh("git fetch origin main");
  const mainSha = sh("git rev-parse --short origin/main");
  const mainTree = sh("git rev-parse origin/main^{tree}");
  const headTree = sh("git rev-parse HEAD^{tree}");
  const dirty = sh("git status --porcelain").split("\n").filter(Boolean);
  metrics.mainSha = mainSha;
  const same = mainTree && mainTree === headTree;
  add("GIT", "版本狀態",
    dirty.length ? "WARN" : "OK",
    `線上 ${mainSha}｜開發分支樹${same ? "＝" : "≠"}main｜未提交 ${dirty.length} 項`,
    dirty.slice(0, 10));
  if (!same) add("GIT2", "分支落差", "WARN", "開發分支與 main 的樹不一致（可能有還沒同步的改動）");
}

function checkDeploy() {
  const raw = sh(`curl -s -m 20 "https://api.github.com/repos/janny00143/chouchou-homepage/actions/runs?branch=main&per_page=15"`);
  if (!raw) { add("DEPLOY", "Pages 部署", "WARN", "查不到（網路或 API 受限），需人工確認"); return; }
  let runs = [];
  try { runs = JSON.parse(raw).workflow_runs || []; } catch (e) { }
  // ⚠️ 2026-09-13 加了 uptime.yml 之後，這個端點會同時回兩種 workflow，
  //    直接拿 runs[0] 有可能拿到健檢那支。一定要用 path 過濾出 Pages 部署。
  const pages = runs.filter(r => r.path === "dynamic/pages/pages-build-deployment");
  if (!pages.length) { add("DEPLOY", "Pages 部署", "WARN", "最近 15 次執行裡找不到 Pages 部署"); return; }
  const r = pages[0];
  metrics.deployRun = r.run_number;
  const ok = r.conclusion === "success";
  // 部署成功還不夠：要確認部署的就是 main 現在的那個 commit，否則線上可能卡在舊版
  const head = sh("git rev-parse origin/main");
  const current = head && r.head_sha === head;
  const items = [];
  if (!ok) items.push("部署不是 success，要重跑 failed job 並確認變成 success 才算完成");
  if (ok && !current) items.push(`最新一次部署的是 ${r.head_sha.slice(0, 7)}，但 main 現在是 ${head.slice(0, 7)}（可能還在跑，或那次 push 沒觸發部署）`);
  add("DEPLOY", "Pages 部署",
    ok ? (current ? "OK" : "WARN") : "FAIL",
    `#${r.run_number} ${r.head_sha.slice(0, 7)} → ${r.conclusion}${current ? "（＝main 最新）" : ""}`,
    items);
}

/* ══════════════════════════════════════════════════════════════════════
   A 型：技術巡
   ══════════════════════════════════════════════════════════════════════ */
function a1_syntax() {
  let nJs = 0, nLd = 0; const badJs = [], badLd = [];
  for (const f of htmlFiles()) {
    const s = read(f);
    for (const m of s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const attr = m[1] || "";
      if (/\bsrc\s*=/.test(attr)) continue;                 // 外部檔，內容是空的
      if (/type\s*=\s*["']module/.test(attr)) continue;     // ESM，new Function 檢不了
      if (/application\/ld\+json/.test(attr)) {
        nLd++;
        try { JSON.parse(m[2]); } catch (e) { badLd.push(`${f}: ${e.message.slice(0, 60)}`); }
        continue;
      }
      nJs++;
      try { new Function(m[2]); } catch (e) { badJs.push(`${f}: ${e.message.slice(0, 60)}`); }
    }
  }
  metrics.pages = htmlFiles().length; metrics.inlineJs = nJs; metrics.jsonLd = nLd;
  const bad = badJs.concat(badLd);
  add("A1", "script / JSON-LD 語法", bad.length ? "FAIL" : "OK",
    `${metrics.pages} 頁／inline JS ${nJs} 段／JSON-LD ${nLd} 筆 → 錯誤 ${bad.length}`, bad.slice(0, 10));
}

function a2_links() {
  const exists = p => { try { return fs.statSync(path.join(ROOT, p)).isFile(); } catch (e) { return false; } };
  let n = 0; const bad = [];
  for (const f of htmlFiles()) {
    // 一定要先把 <script> 與註解拿掉，否則 JS 樣板字串（href="${S.line}"）會被誤判
    const s = stripScriptsAndComments(read(f));
    for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
      let t = m[1];
      if (/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(t)) continue;
      if (t.includes("${")) continue;                       // 漏網的樣板字串
      t = t.split("#")[0].split("?")[0];
      try { t = decodeURIComponent(t); } catch (e) { }
      if (t.startsWith("/")) t = t.slice(1);
      if (!t) continue;                                     // 根路徑 "/"（404.html 用得到）
      n++;
      // 目錄連結要解析成該目錄的 index.html（property-admin.html → /admin/ 就是這種）
      const cands = [t, t.replace(/\/$/, "") + "/index.html"];
      if (!cands.some(exists)) bad.push(`${f} → ${m[1]}`);
    }
  }
  metrics.links = n;
  add("A2", "壞連結", bad.length ? "FAIL" : "OK", `本地連結 ${n} 條 → 壞 ${bad.length}`, bad.slice(0, 15));
}

function a3_sitemap() {
  const sm = read("sitemap.xml");
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(m => m[1].replace("https://chouchouinjapan.com/", "") || "index.html");
  const dup = [...new Set(locs.filter((f, i) => locs.indexOf(f) !== i))];
  const missing = locs.filter(f => !fs.existsSync(path.join(ROOT, f)));
  // sitemap 說「請收錄」、頁面卻 noindex 或立刻轉走 → Search Console 會報排除
  const contaminated = locs.filter(f => {
    try { const s = read(f); return isNoindex(s) || isRedirectStub(s); } catch (e) { return false; }
  });
  metrics.sitemap = locs.length;
  const bad = dup.concat(missing).concat(contaminated);
  add("A3", "sitemap", bad.length ? "FAIL" : "OK",
    `${locs.length} 筆｜重複 ${dup.length}｜缺檔 ${missing.length}｜noindex/轉址混入 ${contaminated.length}`,
    bad.slice(0, 10));
}

function a4_data() {
  const { ART } = loadIndexData();
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const PJ = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
  const missPhoto = [], missCover = [];
  for (const p of P) for (const x of (p.photos || [])) {
    if (!/^https?:/i.test(x) && !fs.existsSync(path.join(ROOT, x))) missPhoto.push(`${p.id}: ${x}`);
  }
  for (const a of ART) {
    if (!a.cover) continue;
    if (/^https?:/i.test(a.cover)) continue;               // YouTube 縮圖等外連封面，刻意的
    if (!fs.existsSync(path.join(ROOT, a.cover))) missCover.push(`${a.id}: ${a.cover}`);
  }
  const noJa = P.filter(p => !PJ[p.id]).map(p => p.id);
  metrics.props = P.length;
  metrics.propsOnSale = P.filter(p => !p.sold).length;
  metrics.articles = ART.length;
  /* 在售件數被內嵌在好幾個產出檔裡，改完 properties.js 只跑部分產生器就會對不上。
     2026-09-18 真的發生過：llms 三語與日文賣方頁停在「34 件」，實際已是 32 件。
     這裡直接比數字，不必重跑產生器（--gen 才會重跑），所以每天都抓得到。 */
  const onSale = metrics.propsOnSale;
  const countChecks = [
    ["llms.txt", /目前有 \d+ 篇文章與 (\d+) 件在售物件/],
    ["llms.txt", /在售物件\]\([^)]*\)：目前 (\d+) 件/],
    ["llms-cn.txt", /目前有 \d+ 篇文章与 (\d+) 件在售物件/],
    ["llms-ja.txt", /日本語記事 \d+ 本、販売中物件 (\d+) 件/],
    ["sell-your-property-ja.html", /現在<b>(\d+) 件<\/b>を掲載/],
  ];
  const staleCount = [];
  for (const [file, re] of countChecks) {
    let t; try { t = fs.readFileSync(path.join(ROOT, file), "utf8"); } catch (e) { continue; }
    const m = t.match(re);
    if (m && Number(m[1]) !== onSale) staleCount.push(`${file}: 寫著 ${m[1]} 件，實際在售 ${onSale} 件`);
  }
  const bad = missPhoto.concat(missCover)
    .concat(noJa.map(id => `日文條目缺: ${id}`))
    .concat(staleCount.map(x => `在售件數不同步 → ${x}（六支產生器沒跑齊）`));
  add("A4", "資料檔",
    bad.length ? "FAIL" : "OK",
    `物件 ${P.length}（在售 ${metrics.propsOnSale}）／照片遺失 ${missPhoto.length}／日文缺 ${noJa.length}｜文章 ${ART.length}／封面遺失 ${missCover.length}｜件數同步 ${staleCount.length ? "✗" : "✓"}`,
    bad.slice(0, 10));
}

function a5_firestore() {
  const code = curlCode("https://firestore.googleapis.com/v1/projects/chouchou-comments/databases/(default)/documents/comments");
  // 403 = App Check 生效，正確。200 = 防線破了，要立刻處理。000 = 連不上，無法判定
  const status = code === "403" ? "OK" : (code === "200" ? "FAIL" : "WARN");
  add("A5", "留言防護（App Check）", status,
    `未帶憑證的 REST 回應 = ${code}`,
    code === "200" ? ["Firestore 變成可公開讀取，要立刻檢查規則與 App Check"] :
      (status === "WARN" ? [OK.proxyBlocked] : []));
}

function a6_secrets() {
  // 巡邏程式自己一定會出現這些字串（偵測樣式寫在裡面），要排除，否則永遠 FAIL
  const files = fs.readdirSync(ROOT)
    .filter(f => /\.(html|js|cjs|json)$/i.test(f))
    .filter(f => f !== "patrol.cjs");
  const probes = [
    // 翻譯機解鎖碼：只有 translate 系列自己可以有（那是驗證邏輯本體）
    { name: "翻譯機解鎖碼", re: /ZHOUZHOU/, allow: f => /^translate/.test(f) },
    { name: "ADMIN_TOKEN 明文", re: /zz159357/, allow: () => false },
    { name: "周周信箱明文", re: /janny00jou@gmail\.com/, allow: () => false },
    { name: "私鑰", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, allow: () => false },
  ];
  const hits = [];
  for (const f of files) {
    const s = read(f);
    for (const p of probes) if (p.re.test(s) && !p.allow(f)) hits.push(`${p.name} 出現在 ${f}`);
  }
  add("A6", "金鑰洩漏掃描", hits.length ? "FAIL" : "OK",
    hits.length ? `發現 ${hits.length} 處` : "前端原始碼沒有明文金鑰／信箱", hits);
}

/* A8（新）：在無頭瀏覽器裡真的把頁面跑起來。
   靜態語法檢查（A1）只能保證「語法正確」，不能保證「執行不爆」——
   ART 渲染掛掉會讓首頁一片空白，A1 照樣給過。這一段補的就是那個洞。 */
function findChromium() {
  const base = "/opt/pw-browsers";
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const p = path.join(base, d, "chrome-linux", "chrome");
    if (fs.existsSync(p)) return p;
  }
  return null;
}
async function a8_runtime() {
  const chrome = findChromium();
  if (!chrome) { add("A8", "瀏覽器執行期", "WARN", "找不到 Chromium，略過"); return; }
  // 這幾頁涵蓋三語首頁、物件列表與詳情、落地頁；壞了就是大事
  const targets = [
    { f: "index.html", must: [/周周/, /文章|買房/] },
    { f: "properties.html", must: [/物件/] },
    { f: "property.html?id=__none__", must: [/找不到這個物件|物件/] },
    { f: "ja.html", must: [/周周/] },
    { f: "index-cn.html", must: [/周周/] },
    { f: "buy-property-in-japan.html", must: [/日本買房完全指南/] },
  ];
  // 六頁平行開，序列跑要 70 秒以上，平行大約 15 秒
  const runOne = t => new Promise(resolve => {
    execFile(chrome, [
      "--headless", "--no-sandbox", "--disable-gpu", "--virtual-time-budget=4000",
      "--dump-dom", "file://" + path.join(ROOT, t.f),
    ], { encoding: "utf8", timeout: 90000, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => resolve({ t, dom: stdout || "", err: String(stderr || (err && err.message) || "") }));
  });
  const out = await Promise.all(targets.map(runOne));
  const bad = [];
  for (const { t, dom, err } of out) {
    const consoleErr = (err.match(/(Uncaught[^\n]*|SEVERE[^\n]*|TypeError[^\n]*|ReferenceError[^\n]*)/g) || [])
      .filter(x => !/net::ERR/.test(x));   // 本機開檔抓不到外部資源是正常的
    if (consoleErr.length) bad.push(`${t.f}: ${consoleErr[0].slice(0, 90)}`);
    for (const re of t.must) if (!re.test(dom)) bad.push(`${t.f}: 頁面沒有渲染出預期內容 ${re}`);
  }
  metrics.runtimePages = targets.length;
  add("A8", "瀏覽器執行期（新）", bad.length ? "FAIL" : "OK",
    `實際開 ${targets.length} 頁 → 執行期錯誤 ${bad.length}`, bad.slice(0, 10));
}

/* A9（新）：線上網站到底活著沒有。
   這個容器的 proxy 擋掉 chouchouinjapan.com、janny00143.github.io 與 Pages API，
   所以巡邏自己永遠打不到線上站。改由 .github/workflows/uptime.yml 在 GitHub 的
   機器上每 6 小時打一次（200 + 內容關鍵字 + www/github.io + SSL 剩餘天數），
   這裡只負責把那支 workflow 的結論讀回來。 */
function a9_uptime() {
  const raw = sh(`curl -s -m 20 "https://api.github.com/repos/janny00143/chouchou-homepage/actions/workflows/uptime.yml/runs?per_page=3"`);
  if (!raw) { add("A9", "線上網站健檢", "WARN", "查不到 workflow 結果（網路受限），需人工確認"); return; }
  let runs = [];
  try { runs = JSON.parse(raw).workflow_runs || []; } catch (e) { }
  if (!runs.length) {
    add("A9", "線上網站健檢", "WARN",
      "還沒有任何執行紀錄（workflow 剛加、或 Actions 被關掉）",
      ["到 GitHub → Actions →「線上網站健檢」手動按一次 Run workflow 看看"]);
    return;
  }
  const r = runs.find(x => x.status === "completed") || runs[0];
  const ageH = Math.round((Date.now() - new Date(r.created_at).getTime()) / 3600000);
  if (r.status !== "completed") {
    add("A9", "線上網站健檢", "INFO", `最新一次還在跑（#${r.run_number}）`); return;
  }
  const ok = r.conclusion === "success";
  // 每 6 小時一次，超過 12 小時沒跑代表排程沒在動
  const stale = ageH > 12;
  add("A9", "線上網站健檢（GitHub Action）",
    ok ? (stale ? "WARN" : "OK") : "FAIL",
    `#${r.run_number} ${r.conclusion}｜${ageH} 小時前`,
    ok
      ? (stale ? [`已經 ${ageH} 小時沒跑，確認 Actions 排程還開著`] : [])
      : ["線上網站有問題（回應碼、內容、www/github.io 或 SSL 憑證），去 Actions 看那次的 log：",
        r.html_url || ""]);
}

function a7_idempotent() {
  if (!WANT_GEN) {
    add("A7", "產生器冪等", "INFO", "本次略過（要檢查請加 --gen，它會實際重寫產出檔）");
    return;
  }
  const before = sh("git status --porcelain");
  if (before) {
    add("A7", "產生器冪等", "WARN", "工作區本來就不乾淨，先處理完再測冪等");
    return;
  }
  const gens = ["generate-pages.cjs", "build-cn.cjs", "build-ja.cjs", "build-ja-home.cjs", "build-prop-seo.cjs"];
  for (const g of gens) {
    try { execSync(`node ${g}`, { cwd: ROOT, stdio: "ignore" }); }
    catch (e) { add("A7", "產生器冪等", "FAIL", `${g} 執行失敗（node_modules 掉了？先跑 npm install）`); return; }
  }
  /* llms*-full.txt 檔頭有「產生時間：YYYY-MM-DD」，昨天產生、今天重跑一定會差那一行。
     那不是不同步，是日期戳記——2026-09-20 的週日大巡邏踩過一次。
     所以只要某個檔的 diff「只有日期戳記那幾行」，就不算 FAIL（改完會還原工作區）。 */
  const DATESTAMP = /^[+-][>\s]*(產生時間|产生时间|生成日時)[：:]\s*\d{4}-\d{2}-\d{2}/;
  const changed = sh("git status --porcelain").split("\n").filter(Boolean);
  const real = [], stampOnly = [];
  for (const line of changed) {
    /* porcelain 是「XY 檔名」，但 sh() 會 trim 掉整段輸出，
       第一行的前導空白會不見，所以不能固定 slice(3)（會多切一個字）。 */
    const m = line.match(/^\s*(\S{1,2})\s+(.*)$/);
    if (!m) continue;
    const file = m[2].includes(" -> ") ? m[2].split(" -> ").pop().trim() : m[2].trim();
    const d = sh(`git diff -U0 -- "${file}"`).split("\n")
      .filter(x => /^[+-]/.test(x) && !/^(\+\+\+|---)/.test(x));
    (d.length && d.every(x => DATESTAMP.test(x)) ? stampOnly : real).push(file);
  }
  /* 只差日期戳記的檔還原回去，不要讓每天的巡邏在 git 留下噪音 */
  if (stampOnly.length) sh(`git checkout -- ${stampOnly.map(f => `"${f}"`).join(" ")}`);
  add("A7", "產生器冪等", real.length ? "FAIL" : "OK",
    real.length ? `重跑後有 ${real.length} 個檔不同步`
                : `重跑後 diff = 0${stampOnly.length ? `（另有 ${stampOnly.length} 個檔只差產生日期，已還原）` : ""}`,
    real.slice(0, 10));
}

/* ══════════════════════════════════════════════════════════════════════
   B 型：內容巡
   ══════════════════════════════════════════════════════════════════════ */
function b1_trilingual() {
  const { ART, SLUG } = loadIndexData();
  const gp = fs.readFileSync(path.join(ROOT, "generate-pages.cjs"), "utf8");
  const SG = vm.runInNewContext("(" + gp.match(/const SLUG = (\{[\s\S]*?\n\});/)[1] + ")");
  const JA = JSON.parse(read("ja-content.json"));
  const cn = htmlFiles().filter(f => /-cn\.html$/.test(f)).length;
  const ja = htmlFiles().filter(f => /-ja\.html$/.test(f)).length;
  // a4（民宿）用 url 直接跳獨立頁，是唯一不走 SLUG／ja-content 的例外
  const real = ART.filter(a => !a.url);
  const bad = []
    .concat(real.filter(a => !SLUG[a.id]).map(a => `index.html 的 SLUG 缺 ${a.id}`))
    .concat(real.filter(a => !SG[a.id]).map(a => `generate-pages.cjs 的 SLUG 缺 ${a.id}`))
    .concat(real.filter(a => !JA[a.id]).map(a => `ja-content.json 缺 ${a.id}`))
    .concat(Object.keys(SLUG).filter(k => SLUG[k] !== SG[k]).map(k => `兩處 SLUG 不一致: ${k}`));
  metrics.jaEntries = Object.keys(JA).length; metrics.cnFiles = cn; metrics.jaFiles = ja;
  add("B1", "三語一致", bad.length ? "FAIL" : "OK",
    `ART ${ART.length}／ja-content ${metrics.jaEntries}／-cn ${cn} 檔／-ja ${ja} 檔`, bad.slice(0, 10));
}

function seoPages() {
  return htmlFiles().filter(f => {
    if (OK.verifyFile.test(f) || OK.skipSeo.has(f)) return false;
    return !isRedirectStub(read(f));      // 轉址殼頁不套 SEO 規則，是刻意的
  });
}

function b2_meta() {
  const titles = {}; const noDesc = [], shortDesc = [];
  for (const f of seoPages()) {
    const s = read(f);
    const d = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    if (!d) noDesc.push(f); else if (d.length < 60) shortDesc.push(`${f}(${d.length})`);
    const t = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    (titles[t] = titles[t] || []).push(f);
  }
  const dup = Object.entries(titles).filter(([, v]) => v.length > 1)
    .map(([t, v]) => `${t.slice(0, 40)} → ${v.join(",")}`);
  const bad = noDesc.map(f => `缺 description: ${f}`).concat(dup);
  add("B2", "meta description / title", bad.length ? "FAIL" : "OK",
    `掃 ${seoPages().length} 頁｜缺 description ${noDesc.length}｜過短(<60) ${shortDesc.length}｜title 重複 ${dup.length}`,
    bad.concat(shortDesc.length ? [`過短: ${shortDesc.slice(0, 5).join(" ")}`] : []).slice(0, 10));
}

function b3_hreflang() {
  const none = [], broken = [];
  for (const f of seoPages()) {
    const s = read(f);
    if (isNoindex(s)) continue;
    const hl = [...s.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/g)];
    if (!hl.length) { none.push(f); continue; }
    for (const m of hl) {
      const t = m[2].replace("https://chouchouinjapan.com/", "") || "index.html";
      if (!fs.existsSync(path.join(ROOT, t))) broken.push(`${f} [${m[1]}] → ${m[2]}`);
    }
  }
  const bad = none.map(f => `無 hreflang: ${f}`).concat(broken);
  add("B3", "hreflang", bad.length ? "FAIL" : "OK",
    `無 hreflang ${none.length}｜指到不存在的檔 ${broken.length}`, bad.slice(0, 10));
}

function b4_structured() {
  const { SLUG } = loadIndexData();
  const bad = [];
  for (const id in SLUG) for (const ja of [false, true]) {
    const f = SLUG[id] + (ja ? "-ja" : "") + ".html";
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    const lds = [...read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => { try { return JSON.parse(m[1]); } catch (e) { return null; } }).filter(Boolean);
    const art = lds.find(o => o["@type"] === "Article");
    if (!art) { bad.push(`${f}: 沒有 Article`); continue; }
    const miss = ["headline", "datePublished", "author"].filter(k => !art[k]);
    if (miss.length) bad.push(`${f}: 缺 ${miss.join("/")}`);
  }
  // ⚠️ 物件頁的 ItemList 掛在 CollectionPage 的 mainEntity 底下，不是最上層。
  //    2026-09 曾因為只看最上層而誤報「無 ItemList」。
  let itemCount = 0;
  for (const f of ["properties.html", "properties-cn.html", "properties-ja.html"]) {
    const lds = [...read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => { try { return JSON.parse(m[1]); } catch (e) { return null; } }).filter(Boolean);
    const list = lds.find(o => o["@type"] === "ItemList")
      || lds.map(o => o.mainEntity).find(o => o && o["@type"] === "ItemList");
    if (!list) { bad.push(`${f}: 找不到 ItemList`); continue; }
    const items = list.itemListElement || [];
    itemCount = items.length;
    const noImg = items.filter(x => !(x.item && x.item.image)).length;
    const noOffer = items.filter(x => !(x.item && x.item.offers)).length;
    if (noImg) bad.push(`${f}: ${noImg} 筆缺 image`);
    if (noOffer) bad.push(`${f}: ${noOffer} 筆缺 offers`);
    // 產生器塞的 noscript 清單，沒有它搜尋引擎讀不到任何物件
    if (!/<!--PROP-SEO-->/.test(read(f))) bad.push(`${f}: 缺 PROP-SEO 區塊`);
  }
  metrics.itemList = itemCount;
  add("B4", "結構化資料", bad.length ? "FAIL" : "OK",
    `文章 JSON-LD 缺欄位 ${bad.filter(x => /缺 headline|缺 datePublished|缺 author|沒有 Article/.test(x)).length}｜物件 ItemList ${itemCount} 筆`,
    bad.slice(0, 10));
}

function b5_cta() {
  const no = seoPages().filter(f => !/lin\.ee|line\.me/.test(read(f)));
  add("B5", "轉換面（LINE 入口）", no.length ? "FAIL" : "OK",
    `完全沒有 LINE 入口的頁 ${no.length}`, no.slice(0, 10));
}

function b6_contextLinks() {
  const { ART } = loadIndexData();
  const JA = JSON.parse(read("ja-content.json"));
  // ⚠️ 站上有兩種寫法：新的用雙引號、2026 年前那批用單引號＋inline style。
  //    只比對雙引號會漏掉一大半，也會把有連結的文章誤判成孤兒（2026-09-15 修）。
  const LINK_RE = /<a href=['"]([a-z0-9-]+)\.html['"]/g;
  const count = body => ((body || []).join("").match(LINK_RE) || []).length;
  const tw = ART.reduce((n, a) => n + count(a.body), 0);
  const ja = Object.values(JA).reduce((n, j) => n + count(j.body), 0);
  // a4（民宿）用 url 直接跳 minpaku.html，body 根本不會被渲染，不該算孤兒
  const orphTw = ART.filter(a => !a.url && a.body && count(a.body) === 0).map(a => a.id);
  const orphJa = Object.keys(JA).filter(k => count(JA[k].body) === 0);
  metrics.linksTw = tw; metrics.linksJa = ja;
  metrics.orphanTw = orphTw.length; metrics.orphanJa = orphJa.length;
  // 孤兒不是錯誤，是既有待辦；只回報數字變化
  add("B6", "內文脈絡連結", "INFO",
    `繁中 ${tw} 條／孤兒 ${orphTw.length} 篇｜日文 ${ja} 條／孤兒 ${orphJa.length} 篇`,
    [`繁中孤兒: ${orphTw.join(",") || "無"}`, `日文孤兒: ${orphJa.join(",") || "無"}`]);
}

/* B9（新，2026-09-15）：日文文章裡的站內連結必須指向 -ja 頁。
   當天抓到 9 條日文文章連去繁中頁——日本讀者點下去會跳到中文站，
   對使用者與 SEO 都不好。這種錯誤肉眼很難發現，交給程式每天掃。 */
function b9_jaLinks() {
  const JA = JSON.parse(read("ja-content.json"));
  const bad = [];
  for (const id in JA) {
    const t = (JA[id].body || []).filter(x => typeof x === "string").join("");
    for (const m of t.matchAll(/<a href=['"]([a-z0-9-]+)\.html['"]/g)) {
      if (!m[1].endsWith("-ja")) bad.push(`${id} → ${m[1]}.html（應為 ${m[1]}-ja.html）`);
    }
  }
  add("B9", "日文文章的站內連結", bad.length ? "FAIL" : "OK",
    bad.length ? `有 ${bad.length} 條連到繁中頁` : "全部正確指向 -ja 頁", bad.slice(0, 10));
}

function b7_props() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const PJ = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
  const onSale = P.filter(p => !p.sold);
  const noPhoto = onSale.filter(p => !(p.photos || []).length).map(p => p.id);
  const noPlan = onSale.filter(p => !(p.photos || []).some(x => /-plan\./.test(x))).map(p => p.id);
  // 價格比對：日文版只有少數物件會自帶 price。差異若只是「含稅 vs 税込」這類
  //  用詞，不算不一致（2026-09 曾誤報 nishioi-p5 與 futaba）。
  const norm = s => {
    let t = String(s || "");
    for (const [tw, ja] of OK.priceSynonyms) t = t.split(tw).join(ja);
    return t.replace(/[\s　（）()]/g, "");
  };
  const priceDiff = [];
  for (const p of P) {
    const j = PJ[p.id];
    if (!j || !j.price || !p.price) continue;
    if (norm(p.price) !== norm(j.price)) priceDiff.push(`${p.id}\n      TW: ${p.price}\n      JA: ${j.price}`);
  }
  const bad = noPhoto.map(i => `缺照片: ${i}`).concat(priceDiff.map(x => `中日價格不一致: ${x}`));
  metrics.noPlan = noPlan.length;
  add("B7", "物件呈現", bad.length ? "FAIL" : "OK",
    `在售 ${onSale.length}｜缺照片 ${noPhoto.length}｜缺間取圖 ${noPlan.length}｜中日價格不一致 ${priceDiff.length}`,
    bad.concat(noPlan.length ? [`缺間取圖（非錯誤，待補）: ${noPlan.join(",")}`] : []).slice(0, 10));
}

function b8_lang() {
  let out = "";
  try { out = execSync("node check-lang.cjs", { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = String((e && e.stdout) || "") + String((e && e.stderr) || ""); }
  const clean = /沒有偵測到日文殘留/.test(out);
  add("B8", "中文頁的日文殘留", clean ? "OK" : "FAIL",
    clean ? "無殘留" : "check-lang 有回報，見下方",
    clean ? [] : out.split("\n").filter(Boolean).slice(0, 12));
}

/* ══════════════════════════════════════════════════════════════════════
   C 段：只有週日大巡邏才做
   ══════════════════════════════════════════════════════════════════════ */
function c1_stale() {
  const { ART } = loadIndexData();
  const score = a => ((a.body || []).join("")
    .match(/20\d\d年|[\d.]+%|[\d,]+万円|[\d,]+日圓|利率|稅率|行情|坪單價/g) || []).length;
  const list = ART.filter(a => score(a) >= 3)
    .sort((x, y) => String(x.date).localeCompare(String(y.date))).slice(0, 5)
    .map(a => `${a.date} ${a.id}（${score(a)} 處數字）${String(a.title).slice(0, 34)}`);
  add("C1", "資料時效", "INFO", "含數字最多且最舊的 5 篇（只列名單，不要自己改 date）", list);
}

function c2_images() {
  const imgRe = /\.(webp|jpg|jpeg|png|svg|gif)$/i;
  const refs = new Set();
  for (const f of fs.readdirSync(ROOT).filter(x => /\.(html|js|cjs|json|md)$/i.test(x))) {
    const s = read(f);
    // 檔名可能含中文且在 HTML 裡是 URL 編碼過的，兩種形式都要收
    for (const m of s.matchAll(/[\w\-.()（）%]+\.(?:webp|jpg|jpeg|png|svg|gif)/gi)) {
      refs.add(m[0]);
      try { refs.add(decodeURIComponent(m[0])); } catch (e) { }
    }
  }
  const imgs = fs.readdirSync(ROOT).filter(f => imgRe.test(f));
  const unused = imgs.filter(f => !refs.has(f) && !refs.has(encodeURIComponent(f)));
  const big = imgs.filter(f => fs.statSync(path.join(ROOT, f)).size > 500 * 1024)
    .map(f => `${f}(${Math.round(fs.statSync(path.join(ROOT, f)).size / 1024)}KB)`);
  // ⚠️ 只看靜態 HTML 裡的 <img>。JS 樣板字串裡的 <img> 尺寸是執行時才知道的，
  //    不算缺失（2026-09 曾誤報 40 個）。
  let total = 0, noWH = 0;
  for (const f of htmlFiles()) {
    for (const m of stripScriptsAndComments(read(f)).matchAll(/<img\b[^>]*>/g)) {
      if (m[0].includes("${") || m[0].includes("'+")) continue;
      total++;
      if (!/\bwidth=/.test(m[0]) || !/\bheight=/.test(m[0])) noWH++;
    }
  }
  metrics.images = imgs.length; metrics.unusedImages = unused.length; metrics.imgNoWH = noWH;
  add("C2", "圖片健檢", noWH ? "WARN" : "INFO",
    `root ${imgs.length} 張｜未被引用 ${unused.length}｜>500KB ${big.length}｜靜態 <img> ${total} 個、缺 width/height ${noWH}`,
    [unused.length ? `未引用: ${unused.join(" ")}` : "", big.length ? `大圖: ${big.join(" ")}` : ""].filter(Boolean));
}

function c3_external() {
  const { ART } = loadIndexData();
  const urls = new Set();
  for (const a of ART) for (const p of (a.body || [])) {
    for (const m of String(p).matchAll(/https?:\/\/[^\s"'<>）)]+/g)) urls.add(m[0]);
  }
  // 逾時壓到 5 秒：這裡多半會全部逾時（proxy 擋掉），不要讓巡邏卡在這一段
  const sample = [...urls].slice(0, 5);
  const rows = sample.map(u => `${curlCode(u, 5)}  ${u.slice(0, 70)}`);
  add("C3", "外連健檢", "INFO",
    `站上外連 ${urls.size} 個，抽查 ${sample.length} 個。${OK.proxyBlocked}`, rows);
}

function c4_repo() {
  const rootItems = fs.readdirSync(ROOT).length;
  const branches = sh("git branch -r").split("\n").filter(Boolean).length;
  metrics.rootItems = rootItems;
  // GitHub 的檔案列表超過 1000 項會被截斷
  add("C4", "repo 健康", rootItems > 900 ? "WARN" : "OK",
    `根目錄 ${rootItems} 項（>1000 會被 GitHub 截斷）｜遠端分支 ${branches} 條`,
    rootItems > 900 ? ["根目錄快滿了，考慮把沒引用的圖搬進 img-original/（屬刪檔類，要先要密語）"] : []);
}

/* ══════════════════════════════════════════════════════════════════════
   基準線比對：只報「跟上次比有變的數字」
   ══════════════════════════════════════════════════════════════════════ */
function diffBaseline() {
  let base = null;
  try { base = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")); } catch (e) { }
  if (!base) {
    add("TREND", "基準線", "INFO", "還沒有基準線，這次的數字會被存成第一份");
    return;
  }
  const changed = [];
  for (const k of Object.keys(metrics)) {
    if (k === "mainSha" || k === "deployRun") continue;     // 本來就每次不同
    if (!(k in base.metrics)) { changed.push(`${k}: （新增）→ ${metrics[k]}`); continue; }
    if (base.metrics[k] !== metrics[k]) {
      const d = typeof metrics[k] === "number" ? ` (${metrics[k] > base.metrics[k] ? "+" : ""}${metrics[k] - base.metrics[k]})` : "";
      changed.push(`${k}: ${base.metrics[k]} → ${metrics[k]}${d}`);
    }
  }
  // 這幾個掉下去多半代表出事，要特別點名
  const guard = ["articles", "propsOnSale", "sitemap", "cnFiles", "jaFiles", "jaEntries"];
  const drops = guard.filter(k => k in base.metrics && metrics[k] < base.metrics[k])
    .map(k => `${k} 減少了：${base.metrics[k]} → ${metrics[k]}，確認是不是刻意的`);
  add("TREND", `基準線比對（上次 ${base.date}）`,
    drops.length ? "WARN" : "INFO",
    changed.length ? `${changed.length} 個數字有變` : "所有數字與上次相同",
    drops.concat(changed).slice(0, 20));
}

/* ══════════════════════════════════════════════════════════════════════
   跑起來
   ══════════════════════════════════════════════════════════════════════ */
async function main() {
  checkGit();
  checkDeploy();
  if (doA) { a1_syntax(); a2_links(); a3_sitemap(); a4_data(); a5_firestore(); a6_secrets(); a9_uptime(); await a8_runtime(); a7_idempotent(); }
  if (doB) { b1_trilingual(); b2_meta(); b3_hreflang(); b4_structured(); b5_cta(); b6_contextLinks(); b7_props(); b8_lang(); b9_jaLinks(); }
  if (doC) { c1_stale(); c2_images(); c3_external(); c4_repo(); }
  diffBaseline();

  const icon = { OK: "✅", FAIL: "❌", WARN: "⚠️ ", INFO: "・" };
  const line = "─".repeat(62);
  console.log(`\n${line}\n 周周網站巡邏　${JST.date}（週${JST.zh}・JST）　${MODE_NAME}\n${line}`);
  for (const r of results) {
    console.log(`${icon[r.status]} ${r.id.padEnd(6)} ${r.label}`);
    if (r.detail) console.log(`         ${r.detail}`);
    for (const it of r.items) if (it) console.log(`         · ${it}`);
  }
  const fails = results.filter(r => r.status === "FAIL");
  const warns = results.filter(r => r.status === "WARN");
  console.log(line);
  console.log(fails.length ? `❌ FAIL ${fails.length} 項：${fails.map(r => r.id).join(" ")}`
    : (warns.length ? `⚠️  沒有 FAIL，但有 ${warns.length} 項要注意：${warns.map(r => r.id).join(" ")}`
      : "✅ 全部通過，今天一切正常"));
  console.log(line + "\n");

  if (WANT_UPDATE) {
    // 合併而非覆蓋：A 型日只會產出技術面的數字，直接覆蓋會把內容面的基準線洗掉
    let prev = {};
    try { prev = (JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")).metrics) || {}; } catch (e) { }
    const merged = Object.assign({}, prev, metrics);
    delete merged.mainSha; delete merged.deployRun;   // 這兩個本來就每次不同，不必存
    fs.writeFileSync(BASELINE_FILE,
      JSON.stringify({ date: JST.date, mode: MODE, metrics: merged }, null, 1) + "\n");
    console.log(`基準線已更新 → ${path.basename(BASELINE_FILE)}（${Object.keys(merged).length} 項）\n`);
  }
  if (WANT_JSON) console.log(JSON.stringify({ date: JST.date, mode: MODE, results, metrics }, null, 1));
  process.exit(fails.length ? 1 : 0);
}

main();
