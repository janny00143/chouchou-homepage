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
  // 供應商一覽只有文字、還沒有図面與照片的物件：先上架（周周 2026-10-08 指示），卡片會顯示「照片準備中」。
  // 取得図面補上照片後，把 id 從這裡拿掉。
  pendingPhoto: new Set([]),
  // D1：日期已過、但周周說「晚點處理」的物件（站上先維持原樣，不每天報 FAIL）
  //  ・tsuruhashi-ren（大阪・鶴橋）：「11月上旬開始營運」沒有新資料，周周 2026-11 說晚點處理
  //  ・kyoto-uta（京都・十條 町家民宿）：「2026年9月中旬預計營運」過期，2026-11-19 巡邏新抓到、已問周周（同一家リアルエステート）
  knownExpired: new Set(["tsuruhashi-ren", "kyoto-uta"]),
  // D3：介面／文案提到其他公司，但屬於制度說明、不是叫客人去找別人的（逐條確認後才加）
  /* D11：周周確認過、現場感受說法沒問題的物件（id → 確認過的字）。新物件上架寫了這類字，D11 會列出來給周周看一次，她說 OK 就加進來。 */
  feelOk: {},
  otherCoAllow: [
    "3か月前に他社の仲介", "跟別家仲介買房",          // 落地頁的客戶故事（找周周才安心），刻意寫的
    "他社様からお預かり", "間に他社が入りません",     // jisha-ja：廣告揭示義務的說明／自社「中間沒有他社」是賣點
    "他社様での建築はできず",                          // 建築條件付土地的法定說明（不利益事實，不可拿掉）
  ],
  // Google Search Console 的驗證檔，本來就只有一行、沒有 meta
  verifyFile: /^google[0-9a-f]+\.html$/i,
  // 這些頁不套一般的 SEO 規則
  //  ・404.html：錯誤頁
  //  ・stats.html：周周自己看的點閱統計後台（2026-10-23 建立）。刻意帶 noindex、
  //    不進 sitemap、站上沒有任何連結、要自己打網址＋通行碼。它不是給客戶看的頁，
  //    所以沒有 meta description 與 LINE 入口都是對的，不是漏做。
  //  ・members-admin.html：會員後台（2026-11-12 建立），同 stats.html：noindex、不進 sitemap、沒有連結。
  skipSeo: new Set(["404.html", "stats.html", "members-admin.html"]),
  // property-admin.html → /admin/ 是目錄索引連結，解析成 admin/index.html 才對
  // （已由連結檢查的 resolve 邏輯處理，不需另外列白名單）
  // a9/a13/a14/a16/a35 的封面刻意用 YouTube 外連縮圖，永遠不要回報
  ytCoverArticles: new Set(["a9", "a13", "a14", "a16", "a35"]),
  // 本環境 proxy 擋掉的網域：curl 回 000 是連不上，不是資源失效
  proxyBlocked: "本環境 proxy 會擋掉多數外部網域，回應碼 000 不代表網站失效",
  // B10：這些頁即使有同名的 -cn／-ja 分身，連到繁中版也是刻意的，不算漏
  //  ・繁中正本：簡中的〈其他語言〉刻意保留一行指回繁中，見 CLAUDE.md 第 9 節防盜那段
  langLeakAllow: ["index.html"],
  // 日文物件價格與繁中的差異若只是這些用詞，不算不一致
  // 森下Ⅵ 的價格刻意寫「5,800万円〜（詳細請諮詢）」，日文版對應「お問い合わせください」（周周 2026-10-08 指示）
  priceTextAllow: new Set(["galicia-morishita6"]),
  // C2：程式裡出現、但不是站內圖片的檔名（例：match.js 命盤圖卡「下載時的檔名」chouchou-fate.png）
  notImageNames: new Set(["chouchou-fate.png"]),
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
      /* type="application/json" 是「把資料塞進頁面給 JS 讀」的標準做法，不是程式碼
         （stats.html 的文章清單 #vmeta／#vslug 就是這樣放的）。
         2026-10-23：少了這一行，JSON 會被丟進 new Function 驗，
         報 Unexpected token ':' —— 是誤判，不是真的語法錯。
         這裡照樣驗它是不是合法 JSON，壞掉一樣抓得到。 */
      if (/type\s*=\s*["']application\/json["']/.test(attr)) {
        nLd++;
        try { JSON.parse(m[2]); } catch (e) { badLd.push(`${f}: (application/json) ${e.message.slice(0, 50)}`); }
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
  metrics.propsOnSale = P.filter(p => !p.sold && p.status === "在售").length;
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
    .filter(f => /\.(html|js|cjs|json|txt)$/i.test(f))
    .filter(f => f !== "patrol.cjs");
  const probes = [
    // 翻譯機解鎖碼：只有 translate 系列自己可以有（那是驗證邏輯本體）
    { name: "翻譯機解鎖碼", re: /ZHOUZHOU/, allow: f => /^translate/.test(f) },
    { name: "ADMIN_TOKEN 明文", re: /zz159357/, allow: () => false },
    { name: "周周信箱明文", re: /janny00jou@gmail\.com/, allow: () => false },
    // 公司信箱（2026-11-01 周周：「這個信箱最近釣魚跟垃圾郵件超多」）。頁面上要寫成 s-syu&#64;and-p.jp（HTML）
    // 或 "s-syu\u0040and-p.jp"（JS 字串），結構化資料不放 email——明文會被垃圾信爬蟲抓走
    { name: "公司信箱明文（會被垃圾信爬蟲抓）", re: /s-syu@and-p\.jp/, allow: () => false },
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
  // 2026-11 起容器改成 /opt/pw-browsers/chromium 直接是執行檔、資料夾叫 chrome-linux64
  const direct = path.join(base, "chromium");
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  for (const d of fs.readdirSync(base)) {
    for (const sub of ["chrome-linux", "chrome-linux64"]) {
      const p = path.join(base, d, sub, "chrome");
      if (fs.existsSync(p)) return p;
    }
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

/* A10：給 AI 看的檔案（llms*.txt）要跟網站同步（周周 2026-10-11 指示「寫給 AI 的也要時時同步更新」）
   ① 檔內每個網址都要對得到實際存在的頁面（手寫的「給 AI 助理」常見問題清單最容易過期）
   ② 繁中版的文章數要等於 ART 篇數（產生器每次都會重寫，不一致代表有人沒重跑） */
// A11：物件照片防盜（2026-10-11）——prop/ 每張都要有 prop-wm/ 浮水印版，且有 prop 圖的頁面要載入 imgguard.js。
// 新放物件圖卻忘了跑 python3 watermark.py，就會變成「右鍵另存拿到乾淨圖」。
/* A13：日文頁不該出現的中文價格用語（2026-10-30 起）
   物件的 price 是用繁中寫的（含稅、參考總額、請諮詢），日文頁靠 properties-ja.js 結尾的
   JA_PRICE 換成日文。哪天有人新寫一個日文頁直接讀 p.price，中文就又會跑出來——
   那天巡邏前 properties-ja.html 就掛著 47 個「含稅」沒人發現。 */
function a13_jaPriceWords() {
  const RE = /含稅|參考總額|請諮詢/g;
  const files = fs.readdirSync(ROOT).filter(f => /-ja\.html$|^ja\.html$|^llms-ja.*\.txt$/.test(f));
  const hits = [];
  for (const f of files) {
    const m = read(f).match(RE);
    if (m) hits.push(`${f}（${m.length} 處：${[...new Set(m)].join("、")}）`);
  }
  add("A13", "日文頁的中文價格用語", hits.length ? "FAIL" : "OK",
    hits.length ? `${hits.length} 個檔有中文價格用語` : `${files.length} 個日文檔 → 0 處`,
    hits.length ? hits.slice(0, 6).concat(["→ 新頁面請改讀 PROPERTIES_JA 的 price（properties-ja.js 結尾已換好）"]) : []);
}

function a11_imgguard() {
  const bad = [];
  const src = fs.readdirSync(path.join(ROOT, "prop")).filter(f => f.endsWith(".webp"));
  const wmDir = path.join(ROOT, "prop-wm");
  const wm = new Set(fs.existsSync(wmDir) ? fs.readdirSync(wmDir) : []);
  const missing = src.filter(f => !wm.has(f));
  if (missing.length) bad.push(`缺浮水印版 ${missing.length} 張（跑 python3 watermark.py）：${missing.slice(0, 5).join("、")}`);
  if (!fs.existsSync(path.join(ROOT, "imgguard.js"))) bad.push("缺 imgguard.js");
  const noGuard = [];
  for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith(".html"))) {
    const h = fs.readFileSync(path.join(ROOT, f), "utf8");
    if (/<img[^>]*\ssrc="prop\//.test(h) && !h.includes("imgguard.js")) noGuard.push(f);
  }
  if (noGuard.length) bad.push(`有 prop 照片卻沒載入 imgguard.js：${noGuard.slice(0, 5).join("、")}（共 ${noGuard.length} 頁）`);
  add("A11", "照片防盜浮水印", bad.length ? "FAIL" : "OK",
    bad.length ? `${bad.length} 項異常` : `prop ${src.length} 張＝prop-wm ${wm.size} 張｜imgguard.js 已掛載`, bad);
}

function a10_llms() {
  const files = ["llms.txt", "llms-full.txt", "llms-cn.txt", "llms-cn-full.txt", "llms-ja.txt", "llms-ja-full.txt"];
  const bad = [];
  let urls = 0;
  for (const f of files) {
    if (!fs.existsSync(path.join(ROOT, f))) { bad.push(`缺檔：${f}`); continue; }
    const t = read(f);
    const set = new Set([...t.matchAll(/https:\/\/chouchouinjapan\.com\/([A-Za-z0-9_\-\.\/%]*)/g)].map(m => m[1].replace(/[.,;:]+$/, "")));
    for (const u of set) {
      urls++;
      const file = u === "" ? "index.html" : decodeURIComponent(u).replace(/[?#].*$/, "");
      if (!fs.existsSync(path.join(ROOT, file))) bad.push(`${f} → 找不到 ${u}`);
    }
  }
  try {
    const { ART } = loadIndexData();
    const m = read("llms.txt").match(/共 (\d+) 篇/);
    if (m && Number(m[1]) !== ART.length) bad.push(`llms.txt 寫共 ${m[1]} 篇，但 ART 有 ${ART.length} 篇`);
  } catch (e) { bad.push("無法比對文章數：" + e.message); }
  add("A10", "給 AI 看的檔案（llms）", bad.length ? "FAIL" : "OK",
    `6 個檔｜網址 ${urls} 條｜${bad.length ? "有問題" : "全部對得到頁面、篇數一致"}`, bad.slice(0, 10));
}

/* A12：23 區垃圾分類的 PDF 連結與全站外部連結（2026-10-23）
   這兩件事巡邏自己都做不到——容器的 proxy 擋掉 city.*.lg.jp 與多數日本官方網域，
   所以改由 .github/workflows/ward-gomi.yml 在 GitHub 的機器上每週跑
   （fetch-ward-gomi.cjs 抓各區中文版 PDF、linkcheck.cjs 掃全站外部連結），
   這裡只把結論讀回來，外加檢查本機那份 JSON 有沒有過期。 */
function a12_wardgomi() {
  const bad = [];
  let summary = "";

  // ① 本機的 ward-gomi-links.json：日期別太舊，而且要有一定數量的直連
  const f = path.join(ROOT, "ward-gomi-links.json");
  if (!fs.existsSync(f)) {
    bad.push("缺 ward-gomi-links.json（文章第九節的各區表格會整個不見）");
  } else {
    try {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      const n = (j.wards || []).length;
      const withPdf = (j.wards || []).filter(w => (w.pdfs || []).length).length;
      const ageD = Math.round((Date.now() - new Date(j.updated + "T00:00:00Z").getTime()) / 86400000);
      summary = `${n} 區／${withPdf} 區有 PDF 直連｜資料 ${ageD} 天前`;
      if (n !== 23) bad.push(`JSON 只有 ${n} 區，應該是 23 區`);
      if (withPdf < 20) bad.push(`只有 ${withPdf} 區抓到中文 PDF（之前是 22），可能有區改版了`);
      // 每週跑一次，超過 16 天沒更新代表排程沒在動
      if (ageD > 16) bad.push(`JSON 已經 ${ageD} 天沒更新，確認 Actions 的「23區垃圾分類連結」排程還開著`);
    } catch (e) { bad.push("ward-gomi-links.json 讀不開：" + e.message); }
  }

  // ② 那支 workflow 最近一次的結論（紅字代表有區抓不到、或有連結真的失效）
  const raw = sh(`curl -s -m 20 "https://api.github.com/repos/janny00143/chouchou-homepage/actions/workflows/ward-gomi.yml/runs?per_page=3"`);
  let runs = [];
  try { runs = JSON.parse(raw || "{}").workflow_runs || []; } catch (e) { }
  if (!raw || !runs.length) {
    bad.push("查不到 workflow 結果（網路受限或還沒跑過），需人工確認");
  } else {
    const r = runs.find(x => x.status === "completed") || runs[0];
    if (r.status !== "completed") {
      summary += `｜workflow #${r.run_number} 還在跑`;
    } else {
      summary += `｜workflow #${r.run_number} ${r.conclusion}`;
      if (r.conclusion !== "success") {
        bad.push("workflow 紅字：可能是某區官方頁改版，或文章裡有外部連結真的失效（404）。去看那次的 log：");
        bad.push(r.html_url || "");
      }
    }
  }

  // ③ 文章頁要跟 JSON 同步。workflow 每週只更新 JSON、不會重跑產生器，
  //    所以表格與「資料更新日」會卡在舊版——2026-10-27 第一次週跑就發生了
  //    （板橋區的檔案大小與更新日都停在舊的）。產生器冪等檢查只有 A 型日加
  //    --gen 才跑，中間可能卡好幾天，所以這裡每天比對一次。
  try {
    const up = JSON.parse(fs.readFileSync(f, "utf8")).updated;
    const stale = ["tokyo-garbage-sorting-guide.html", "tokyo-garbage-sorting-guide-cn.html"]
      .filter(p => fs.existsSync(path.join(ROOT, p)) && !read(p).includes(up));
    if (stale.length) {
      bad.push(`文章頁的「資料更新日」還停在舊版（JSON 已是 ${up}）：${stale.join("、")}`);
      bad.push("→ 重跑第 9 節那六支產生器就會同步");
    }
  } catch (e) { }

  // ④ 大型垃圾預約窗口（ward-sodai.json → tokyo-oversized-garbage*.html，2026-10-29 上線）
  //    同一支 workflow 每週抓。電話只收「前面寫著粗大受付センター」的號碼，
  //    第一版跑出來 20 區有電話、22 區有網路預約；掉很多代表區公所改版或抓取邏輯壞了。
  const fs2 = path.join(ROOT, "ward-sodai.json");
  if (fs.existsSync(fs2)) {
    try {
      const j = JSON.parse(fs.readFileSync(fs2, "utf8"));
      const W = j.wards || [];
      const ph = W.filter(w => w.phone).length, on = W.filter(w => w.online).length;
      const ageD = Math.round((Date.now() - new Date(j.updated + "T00:00:00Z").getTime()) / 86400000);
      summary += `｜大型垃圾 電話 ${ph}／網路 ${on} 區`;
      if (W.length !== 23) bad.push(`ward-sodai.json 只有 ${W.length} 區，應該是 23 區`);
      if (ph < 16) bad.push(`大型垃圾頁只剩 ${ph} 區抓到預約電話（上線時 20），看 fetch-ward-sodai.cjs 那一步的 log`);
      if (on < 18) bad.push(`大型垃圾頁只剩 ${on} 區抓到網路預約（上線時 22）`);
      if (ageD > 16) bad.push(`ward-sodai.json 已經 ${ageD} 天沒更新`);
      const stale2 = ["tokyo-oversized-garbage.html", "tokyo-oversized-garbage-ja.html"]
        .filter(p => fs.existsSync(path.join(ROOT, p)) && !read(p).includes(j.updated));
      if (stale2.length) bad.push(`大型垃圾頁的資料更新日還停在舊版（JSON 已是 ${j.updated}）：${stale2.join("、")} → 重跑六支產生器`);
    } catch (e) { bad.push("ward-sodai.json 讀不開：" + e.message); }
  }

  add("A12", "23區垃圾分類連結＋全站外部連結", bad.length ? "FAIL" : "OK",
    summary || "無資料", bad.slice(0, 8));
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
  /* sitemap 的 diff 是否「只差 lastmod 的日期」：把 - 行與 + 行配對，
     兩邊都把 <lastmod>…</lastmod> 的日期抹掉之後若完全相同，就是只差日期。
     行數不等（表示有 url 被加或被刪）一律不算。 */
  const lastmodOnly = d => {
    const minus = d.filter(x => x[0] === "-").map(x => x.slice(1));
    const plus  = d.filter(x => x[0] === "+").map(x => x.slice(1));
    if (!minus.length || minus.length !== plus.length) return false;
    const strip = x => x.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, "<lastmod/>");
    return minus.every((x, i) => strip(x) === strip(plus[i]));
  };

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
    let onlyStamp = d.length && d.every(x => DATESTAMP.test(x));
    /* sitemap.xml 的 <lastmod> 取自「該檔在 git 的最後 commit 日」，而 sitemap 是在
       commit 之前產生的——所以只要 index.html 這種頁改了又還沒 commit，重跑一定會
       差那個日期，而且永遠差一個 commit。這是設計上必然，不是產生器壞掉。
       只有在「每一組 +/- 行除了 <lastmod> 的日期以外完全一樣」時才放行；
       多一筆或少一筆 <url> 都還是會 FAIL。 */
    if (!onlyStamp && file === "sitemap.xml") onlyStamp = lastmodOnly(d);
    (onlyStamp ? stampOnly : real).push(file);
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
  /* 同一頁的三語版本（X.html／X-cn.html／X-ja.html）標題相同不是錯：
     繁中與簡中在沒有可簡化字的短標題上本來就會一模一樣，而且它們之間
     有 hreflang 互指，Google 會當成語言版本而不是重複內容。
     只有「不同頁」撞標題才算問題。（2026-10-03 物件獨立頁上線後補上） */
  const langBase = f => f.replace(/-(cn|ja)\.html$/, ".html");
  const dup = Object.entries(titles)
    .filter(([, v]) => v.length > 1 && new Set(v.map(langBase)).size > 1)
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
    const noImg = Math.max(0, items.filter(x => !(x.item && x.item.image)).length - OK.pendingPhoto.size);
    const noOffer = items.filter(x => !(x.item && x.item.offers)).length;
    if (noImg) bad.push(`${f}: ${noImg} 筆缺 image`);
    if (noOffer) bad.push(`${f}: ${noOffer} 筆缺 offers`);
    // 產生器塞的 noscript 清單，沒有它搜尋引擎讀不到任何物件
    if (!/<!--PROP-SEO-->/.test(read(f))) bad.push(`${f}: 缺 PROP-SEO 區塊`);
  }
  // VideoObject 的 uploadDate 要有時間＋時區（Search Console 2026-11-05 報「datetime 無效／缺少時區」）
  for (const f of fs.readdirSync(ROOT).filter(x => /\.html$/.test(x))) {
    for (const m of read(f).matchAll(/"uploadDate":"([^"]*)"/g))
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(m[1])) bad.push(`${f}: VideoObject uploadDate 沒有時區（${m[1]}）`);
  }
  // 脆文精選的 SocialMediaPosting（Google 歸在「討論區」）datePublished 也要帶時區（Search Console 2026-11-08 報錯）
  for (const f of fs.readdirSync(ROOT).filter(x => /^threads-.*\.html$/.test(x))) {
    for (const m of read(f).matchAll(/"@type":"SocialMediaPosting"[^{}]*?"datePublished":"([^"]*)"/g))
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(m[1])) { bad.push(`${f}: SocialMediaPosting datePublished 沒有時區（${m[1]}）`); break; }
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

/* B10：產出的 -cn／-ja 頁面本身有沒有連回繁中頁。
   B9 只看 ja-content.json 的文章內文，抓不到「產生器沒把連結改寫掉」這種漏。
   2026-09-24 就是這樣漏掉的：index-cn.html 裡被 JS 渲染的文章內文有 104 條連結
   （寫成 href=\"xxx.html\"、引號是跳脫過的）整批沒被 build-cn 改寫，簡中讀者點了就跳出簡中版；
   ja.html 的民泊卡片 url 也直接指向繁中的 minpaku.html。
   兩種引號形式都要掃，因為出問題的正是跳脫過的那一種。 */
/* B11：可被收錄的頁面不該把內部連結指到 noindex 的殼頁。
   2026-10-03 物件獨立頁（prop-<id>.html）上線後，文章裡的「相關物件」卡片、
   自社專區與文章內文的手寫連結仍指向 property*.html?id=（noindex），
   等於內部連結的權重整個丟掉、使用者也被送到不可收錄的頁。
   2026-10-04 全部改掉，這裡把規則固化，避免以後新增連結又漏。
   允許的例外：殼頁自己，以及各物件靜態頁底部那條「看互動版（相簿可滑）」。 */
function b11_noindexLinks() {
  const shells = ["property.html", "property-cn.html", "property-ja.html"];
  const bad = [];
  for (const f of seoPages()) {
    if (shells.includes(f)) continue;
    const s = read(f);
    const isPropPage = /^prop-[A-Za-z0-9_-]+(-cn|-ja)?\.html$/.test(f);
    for (const sh of shells) {
      const n = (s.match(new RegExp('href="' + sh.replace(/\./g, "\\.") + '\\?id=', "g")) || []).length;
      if (!n) continue;
      /* 物件靜態頁本身允許一條：底部的「看互動版」 */
      if (isPropPage && n === 1) continue;
      bad.push(`${f} → ${sh}?id=（${n} 條）`);
    }
  }
  add("B11", "內部連結指向 noindex 殼頁", bad.length ? "FAIL" : "OK",
    bad.length ? `${bad.length} 頁有多餘的殼頁連結` : "沒有（物件連結都指向可收錄的靜態頁）",
    bad.slice(0, 8));
}

function b10_langLeak() {
  const FILE_RE = "([A-Za-z0-9_-]+)\\.html";
  const bad = [];
  for (const f of htmlFiles()) {
    const m = f.match(/^(.*?)(?:-(cn|ja))?\.html$/);
    const lang = f === "ja.html" ? "ja" : f === "index-cn.html" ? "cn" : (m && m[2]);
    if (!lang) continue;
    const suffix = "-" + lang;
    const s = read(f);
    const seen = new Set();
    for (const re of [new RegExp(`href="${FILE_RE}`, "g"),
                      new RegExp(`href=\\\\"${FILE_RE}`, "g"),
                      new RegExp(`"url":"${FILE_RE}`, "g")]) {
      for (const g of s.matchAll(re)) {
        const stem = g[1];
        if (stem.endsWith(suffix)) continue;
        if (OK.langLeakAllow.includes(stem + ".html")) continue;
        // 只有同時存在對應語系檔時才算漏（共用頁如 translate.html 沒有分身，不算）
        if (!fs.existsSync(path.join(ROOT, stem + suffix + ".html"))) continue;
        const key = `${f} → ${stem}.html`;
        if (!seen.has(key)) { seen.add(key); bad.push(`${key}（應為 ${stem}${suffix}.html）`); }
      }
    }
  }
  add("B10", "簡中／日文頁連回繁中", bad.length ? "FAIL" : "OK",
    bad.length ? `有 ${bad.length} 處連回繁中頁` : "沒有連回繁中頁",
    bad.slice(0, 12));
}

function b7_props() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const PJ = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
  const onSale = P.filter(p => !p.sold && p.status === "在售");
  const noPhoto = onSale.filter(p => !(p.photos || []).length && !OK.pendingPhoto.has(p.id)).map(p => p.id);
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
    if (!j || !j.price || !p.price || OK.priceTextAllow.has(p.id)) continue;
    if (norm(p.price) !== norm(j.price)) priceDiff.push(`${p.id}\n      TW: ${p.price}\n      JA: ${j.price}`);
  }
  // 物件地圖（2026-10-31）：在售物件都要有座標，不然地圖上會少一顆。缺了就跑 node geo-props.cjs
  let geo = {};
  try { geo = JSON.parse(fs.readFileSync(path.join(ROOT, "prop-geo.json"), "utf8")); } catch (e) { geo = {}; }
  const noGeo = onSale.filter(p => !geo[p.id]).map(p => p.id);
  const bad = noPhoto.map(i => `缺照片: ${i}`).concat(priceDiff.map(x => `中日價格不一致: ${x}`))
    .concat(noGeo.map(i => `缺地圖座標（跑 node geo-props.cjs）: ${i}`));
  metrics.noPlan = noPlan.length;
  add("B7", "物件呈現", bad.length ? "FAIL" : "OK",
    `在售 ${onSale.length}｜缺照片 ${noPhoto.length}｜缺間取圖 ${noPlan.length}｜中日價格不一致 ${priceDiff.length}｜缺地圖座標 ${noGeo.length}`,
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
/* 文章的 date 是「發表日」，周周刻意設早，CLAUDE.md 明訂更新時不可改。
   所以拿 date 排「資料時效」會永遠指向同一批 2024 年的文章，查過也清不掉。
   改看選填的 checked 欄位＝「數據最後查核日」：有 checked 就用它，沒有才退回 date。
   查核過但不需要改數字的文章，在 ART 補上 "checked":"YYYY-MM-DD" 即可。 */
function c1_stale() {
  const { ART } = loadIndexData();
  const score = a => ((a.body || []).join("")
    .match(/20\d\d年|[\d.]+%|[\d,]+万円|[\d,]+日圓|利率|稅率|行情|坪單價/g) || []).length;
  const list = ART.filter(a => score(a) >= 3)
    .map(a => ({ a, when: String(a.checked || a.date), via: a.checked ? "查核" : "發表" }))
    .sort((x, y) => x.when.localeCompare(y.when)).slice(0, 5)
    .map(({ a, when, via }) =>
      `${when}（${via}）${a.id}（${score(a)} 處數字）${String(a.title).slice(0, 34)}`);
  add("C1", "資料時效", "INFO",
    "含數字最多、且最久沒查核的 5 篇（date 不可改；查過就補 checked 欄位）", list);
}

function c2_images() {
  const imgRe = /\.(webp|jpg|jpeg|png|svg|gif)$/i;
  const refs = new Set();
  for (const f of fs.readdirSync(ROOT).filter(x => /\.(html|js|cjs|json|md)$/i.test(x))) {
    const s = read(f);
    /* 檔名可能含中文。過去只收 URL 編碼過的那種寫法，但站上多數地方是直接寫
       src="櫻花.webp" 這種未編碼的中文檔名，而 \w 不含中日文字，整批比對不到——
       於是「未被引用」每個週日都固定誤報同一批 11 張（2026-09-28 查出）。
       字元類補上中日文字範圍，兩種寫法都收得到。 */
    for (const m of s.matchAll(/[\w\-.()（）%\u3040-\u30ff\u4e00-\u9fff]+\.(?:webp|jpg|jpeg|png|svg|gif)/gi)) {
      refs.add(m[0]);
      try { refs.add(decodeURIComponent(m[0])); } catch (e) { }
    }
  }
  /* 2026-09-29：物件写真は prop/ に移動（root が 1000 件に近づいたため）。
     root と prop/ の両方を見る。参照側は "prop/xxx.webp" と書かれるが、
     上の正規表現は「/」を含まないので basename で照合される。 */
  const sub = ["prop", "img"].flatMap(d => fs.existsSync(path.join(ROOT, d))
    ? fs.readdirSync(path.join(ROOT, d)).filter(f => imgRe.test(f)).map(f => d + "/" + f) : []);
  const imgs = fs.readdirSync(ROOT).filter(f => imgRe.test(f)).concat(sub);
  const unused = imgs.filter(f => { const b = f.split("/").pop(); return !refs.has(b) && !refs.has(encodeURIComponent(b)); });
  const big = imgs.filter(f => fs.statSync(path.join(ROOT, f)).size > 500 * 1024)
    .map(f => `${f}(${Math.round(fs.statSync(path.join(ROOT, f)).size / 1024)}KB)`);
  // ⚠️ 只看靜態 HTML 裡的 <img>。JS 樣板字串裡的 <img> 尺寸是執行時才知道的，
  //    不算缺失（2026-09 曾誤報 40 個）。
  let total = 0, noWH = 0;
  for (const f of htmlFiles()) {
    /* 電子雜誌頁（magazine-YYYY-MM.html）：noindex、圖都放在固定比例的框裡，不需要 width/height（2026-11-26） */
    if (/^magazine-/.test(path.basename(f))) continue;
    for (const m of stripScriptsAndComments(read(f)).matchAll(/<img\b[^>]*>/g)) {
      if (m[0].includes("${") || m[0].includes("'+")) continue;
      total++;
      if (!/\bwidth=/.test(m[0]) || !/\bheight=/.test(m[0])) noWH++;
    }
  }
  /* 反過來查：被引用、但 root 找不到的圖（破圖）。
     A4 只查文章封面與物件照片，像 quiz.html 拿某件物件的照片當裝飾圖這種
     就落在檢查之外——2026-09-25 下架淺草三丁目、把照片搬進 img-original/ 之後，
     quiz.html 與 quiz-cn.html 就這樣默默破圖了。 */
  const have = new Set(imgs);
  const missing = [];
  /* img-size.json 只是尺寸索引，留著已封存圖片的舊資料不會造成破圖，不列入 */
  for (const f of fs.readdirSync(ROOT).filter(x => /\.(html|js|json)$/i.test(x) && x !== "img-size.json")) {
    const s = read(f);
    /* 只認「整個引號裡就是一個相對檔名」的寫法（src="a.webp"、img:'a.webp'、url(a.webp)）。
       不然會把外連網址的檔名也抓進來——例如 YouTube 縮圖
       https://i.ytimg.com/vi/xxx/maxresdefault.jpg，那不是站內檔案。 */
    for (const m of s.matchAll(/["'(]([\w\-.()（）%]+\.(?:webp|jpg|jpeg|png|svg|gif))["')]/gi)) {
      let n = m[1];
      try { n = decodeURIComponent(n); } catch (e) { }
      if (have.has(n) || have.has(m[1])) continue;
      if (OK.notImageNames.has(n)) continue;
      if (fs.existsSync(path.join(ROOT, n))) continue;
      missing.push(`${f} → ${n}`);
    }
  }
  metrics.images = imgs.length; metrics.unusedImages = unused.length; metrics.imgNoWH = noWH;
  add("C2", "圖片健檢", missing.length ? "FAIL" : (noWH ? "WARN" : "INFO"),
    `root ${imgs.length} 張｜未被引用 ${unused.length}｜引用了但檔案不存在 ${missing.length}｜>500KB ${big.length}｜靜態 <img> ${total} 個、缺 width/height ${noWH}`,
    [missing.length ? `破圖: ${[...new Set(missing)].slice(0, 8).join("｜")}` : "",
     unused.length ? `未引用: ${unused.join(" ")}` : "",
     big.length ? `大圖: ${big.join(" ")}` : ""].filter(Boolean));
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
   D 段：每天都做（2026-11-19 周周：「每天的巡迴再強化，你來想還可以怎麼巡，
   什麼應該巡沒巡過」）。這幾項都是「出過事、或 CLAUDE.md 有明文規定，
   但以前只靠人記得」的東西，改成每天自動抓。
   ══════════════════════════════════════════════════════════════════════ */
const JST_TODAY = new Date(JST.date + "T00:00:00+09:00");
const daysFromToday = d => Math.round((d - JST_TODAY) / 86400000);

/* D1 物件的交地／交屋／營運日期過期
   以前只有每週四盤點才算一次（而且是在 prompt 裡手跑一段 node）。
   2026-11-12 就發生過：上午把過期日改成「請洽詢」，下午依新図面更新時又把舊日期寫回去，
   直到 11/19 盤點才發現——中間一整週站上掛著過期廣告。改成每天抓。 */
function d1_propDates() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const PJ = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
  /* 期間的「最後一天」才算過期（2026-11-26 修：原本下旬＝25 日，11/26 把「11月下旬交地」誤報成過期）。
     上旬＝10 日、中旬＝20 日、下旬與只寫「N月」＝該月最後一天。 */
  const MON = { "上旬": 10, "中旬": 20 };
  /* 只抓「預告」：日期前面有「預計」，或後面 16 字內有「預定／預計（予定）」。
     「2026年7月剛完成全面翻新」「2026年6月8日開始營運」是已經發生的事實，不算過期
     （第一版 2026-11-19 誤報過這兩種）。 */
  const reTW = /(預計)?(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?(上旬|中旬|下旬)?(?=([^。\n、，]{0,16}))/g;
  const reJA = /()(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?(上旬|中旬|下旬)?(?=([^。\n・、]{0,16}))/g;
  const scan = (txt, re) => {
    const out = []; re.lastIndex = 0; let m;
    const t = String(txt || "").replace(/<[^>]+>/g, "");
    while ((m = re.exec(t))) {
      if (/^築/.test(m[6])) continue;                       // 「1972年11月築」是屋齡，不是預告
      if (!(m[1] || /預定|預計|予定/.test(m[6]))) continue;
      const d = m[4] ? new Date(+m[2], +m[3] - 1, +m[4]) : (MON[m[5]] ? new Date(+m[2], +m[3] - 1, MON[m[5]]) : new Date(+m[2], +m[3], 0));
      out.push({ when: d, text: m[0] + m[6] });
    }
    return out;
  };
  const past = [], soon = [], known = [];
  for (const p of P.filter(x => !x.sold && x.status === "在售")) {
    const j = PJ[p.id] || {};
    const hits = [
      ...["age", "note", "title", "title_cn"].flatMap(k => scan(p[k], reTW).map(h => ({ ...h, lang: "TW", k }))),
      ...["age", "note", "title"].flatMap(k => scan(j[k], reJA).map(h => ({ ...h, lang: "JA", k }))),
    ];
    for (const h of hits) {
      const dd = daysFromToday(h.when);
      const row = `${p.id}［${h.lang}・${h.k}］${h.text}`;
      if (dd < 0) (OK.knownExpired.has(p.id) ? known : past).push(row);
      else if (dd <= 7) soon.push(`${row}（${dd} 天後）`);
    }
  }
  metrics.propDatesPast = past.length;
  add("D1", "物件日期過期（交地／交屋／營運）", past.length ? "FAIL" : (soon.length ? "INFO" : "OK"),
    `已過期 ${past.length}｜7 天內到期 ${soon.length}｜周周說晚點處理 ${known.length}` +
    (past.length ? "　→ 自社：雲端図面沒新日期就改「請洽詢」（10/29 規則）；他社：列給周周" : ""),
    past.concat(soon).slice(0, 14));
}

/* D2 合規禁語（CLAUDE.md §4：不寫「保證」「一定」「穩賺」「包過」）
   「保證金」「保證人」「不保證」「包租保證」這些是正當用語或否定句，不算。
   只抓肯定語氣的組合，例如「保證獲利」「一定可以貸」「穩賺」。 */
function d2_compliance() {
  const { ART } = loadIndexData();
  let JA = {}; try { JA = JSON.parse(read("ja-content.json")); } catch (e) { }
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const PJ = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
  const TW_BAD = /穩賺|包過|一定賺|保證(獲利|賺錢|會漲|能貸|貸得到|通過|過件|收益)|一定(可以|能|會)貸(得到|過)?|絕對(賺|不會虧)/g;
  const JA_BAD = /必ず(儲か|借りられ|審査に通)|確実に(儲か|借りられ)|絶対に(儲か|損しない)|保証いたします|利益を保証/g;
  const negBefore = /(不|非|沒|無|並非|不是|不等於|不代表|不構成|不能|無法|ない)[^。！？\n]{0,8}$/;
  const negAfter = /^[^。！？\n]{0,22}(不是|不等於|不代表|嗎|？|わけでは|とは限り|ではありません|ではない|ません|でしょうか)/;
  const strip = t => String(t || "").replace(/<[^>]+>/g, "");
  const hits = [];
  const check = (id, txt, re) => {
    const t = strip(txt); re.lastIndex = 0; let m;
    while ((m = re.exec(t))) {
      const pre = t.slice(Math.max(0, m.index - 10), m.index), post = t.slice(m.index + m[0].length);
      if (negBefore.test(pre) || negAfter.test(post) || /[「『]$/.test(pre)) continue;
      hits.push(`${id}：…${t.slice(Math.max(0, m.index - 12), m.index + m[0].length + 10)}…`);
    }
  };
  for (const a of ART) check(a.id, [a.title, a.ex, ...(a.body || [])].join("\n"), TW_BAD);
  for (const [id, a] of Object.entries(JA)) check(id + "（日）", [a.title, a.ex, ...(a.body || [])].join("\n"), JA_BAD);
  for (const p of P) check(p.id, [p.title, p.title_cn, p.catch, p.note].join("\n"), TW_BAD);
  for (const [id, p] of Object.entries(PJ)) check(id + "（日）", [p.title, p.catch, p.note].join("\n"), JA_BAD);
  metrics.complianceHits = hits.length;
  add("D2", "合規禁語（保證／穩賺／包過／一定貸）", hits.length ? "WARN" : "OK",
    hits.length ? `${hits.length} 處肯定語氣的保證說法，請改成「依審查為準」` : "文章與物件都沒有肯定語氣的保證說法",
    hits.slice(0, 10));
}

/* D3 介面文字提到「其他公司／他社」（CLAUDE.md §3，周周 2026-11-12：不要讓客人覺得要去找別人）
   文章裡解釋制度（REINS 讓其他公司查得到、電力公司可以換別家）是中性的，不在這裡管；
   這裡只看「工具、按鈕、物件頁、會員頁」這些介面。 */
function d3_otherCompany() {
  const { SLUG } = loadIndexData();
  const artPages = new Set(Object.values(SLUG).flatMap(s => [s + ".html", s + "-cn.html", s + "-ja.html"]));
  const files = fs.readdirSync(ROOT).filter(f => /\.(html|js)$/.test(f)
    && !artPages.has(f) && !/^(prop-|threads-|llms|google)/.test(f) && !/\.min\.js$/.test(f)
    && !["properties.js", "properties-ja.js", "patrol.cjs"].includes(f));
  const re = /其他公司|别家公司|別家公司|別家仲介|别家中介|其他仲介|其他中介|其他房仲|他社|他の不動産会社|別の不動産会社/g;
  const hits = [];
  for (const f of files) {
    let t = read(f);
    if (f === "index.html" || f === "index-cn.html") t = t.replace(/const ART\s*=\s*\[[\s\S]*?\n\];/, "");
    t = t.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of t.matchAll(re)) {
      const ctx = t.slice(Math.max(0, m.index - 14), m.index + m[0].length + 10).replace(/\s+/g, " ");
      if (OK.otherCoAllow.some(a => ctx.includes(a))) continue;
      hits.push(`${f}：…${ctx}…`);
    }
  }
  add("D3", "介面文字提到其他公司", hits.length ? "WARN" : "OK",
    hits.length ? `${hits.length} 處，確認是不是在叫客人去找別家（制度說明可加進 OK.otherCoAllow）` : `掃 ${files.length} 個介面檔，沒有`,
    hits.slice(0, 8));
}

/* D4 新文章的粗體數量（CLAUDE.md §3：周周多次提醒「粗體太多眼花」，整篇 8～10 個以內）
   舊文章很多超標，那是規則訂下之前寫的，不追溯；只盯最近 14 天上線的。 */
function d4_boldNew() {
  const { ART } = loadIndexData();
  const recent = ART.filter(a => a.id !== "a2" && daysFromToday(new Date(a.date + "T00:00:00+09:00")) >= -14);
  const over = recent.map(a => [a, ((a.body || []).join("").match(/<b>/g) || []).length])
    .filter(([, n]) => n > 12).map(([a, n]) => `${a.id}（${a.date}）粗體 ${n} 個：${String(a.title).slice(0, 26)}`);
  add("D4", "新文章粗體數量", over.length ? "WARN" : "OK",
    `最近 14 天 ${recent.length} 篇｜超過 12 個 <b> 的 ${over.length} 篇`, over);
}

/* D5 自動更新的資料有沒有停擺
   SUUMO 行情每週一排程重抓、Flat35 利率每月 1 號排程核對。排程掛掉的話，
   買房定位分析會默默用舊數字，沒人會發現。 */
function d5_dataFresh() {
  const bad = [], info = [];
  try {
    const f = JSON.parse(read("souba.json")).fetched;
    const age = -daysFromToday(new Date(f + "T00:00:00+09:00"));
    (age > 9 ? bad : info).push(`SUUMO 行情 souba.json：${f}（${age} 天前）${age > 9 ? "← 每週一的排程可能沒跑" : ""}`);
  } catch (e) { bad.push("souba.json 讀不到 fetched 日期"); }
  try {
    const m = read("flat35-rate.js").match(/year:\s*(\d+),\s*month:\s*(\d+)/);
    const [y, mo] = JST.date.split("-").map(Number);
    const ok = m && (+m[1] === y && +m[2] === mo || +JST.date.slice(8) <= 3);
    (ok ? info : bad).push(`Flat35 利率 flat35-rate.js：${m ? m[1] + "-" + m[2] : "?"}${ok ? "" : " ← 每月 1 號的核對排程可能沒跑"}`);
  } catch (e) { bad.push("flat35-rate.js 讀不到年月"); }
  add("D5", "自動更新資料的新鮮度", bad.length ? "WARN" : "OK", bad.concat(info).join("｜"));
}

/* D6 有時效的文章（活動、時事）過期
   ART 可加選填欄位 expires:"YYYY-MM-DD"（例：六本木點燈 12/25 結束）。
   過了這天就提醒改寫或更新；7 天內到期先預告。expires 不進內容雜湊，加了不會動到「更新日」。 */
function d6_articleExpiry() {
  const { ART } = loadIndexData();
  const rows = [], soon = [];
  for (const a of ART.filter(x => x.expires)) {
    const dd = daysFromToday(new Date(a.expires + "T00:00:00+09:00"));
    if (dd <= 0) rows.push(`${a.id} 已到期（${a.expires}）：${String(a.title).slice(0, 30)}`);
    else if (dd <= 7) soon.push(`${a.id} ${dd} 天後到期（${a.expires}）：${String(a.title).slice(0, 30)}`);
  }
  add("D6", "有時效的文章", rows.length ? "WARN" : (soon.length ? "INFO" : "OK"),
    `設了到期日的 ${ART.filter(x => x.expires).length} 篇｜已到期 ${rows.length}｜7 天內 ${soon.length}`, rows.concat(soon));
}

/* D7 分享預覽標籤（LINE／FB 貼連結要有縮圖與標題，周周 2026-11-15）
   手寫頁新增後忘了跑 og-fill.cjs 就會缺。 */
function d7_og() {
  const out = sh("node og-fill.cjs --check");
  const miss = out.split("\n").filter(l => l.includes("←"));
  add("D7", "分享預覽標籤（og）", miss.length ? "FAIL" : "OK",
    miss.length ? `${miss.length} 頁缺 og 標籤 → 跑 node og-fill.cjs` : "手寫頁都有 og 標籤", miss.slice(0, 8));
}

/* D9 已完工的物件還在用完成預想圖（-pers）
   properties.js 開頭的規則（周周 2026-08-23）：房子蓋好了就要換實景照。
   2026-11-19 周周：「如果有蓋好的都提醒我補圖」——東が丘・駒場・西品川 part5
   都是完工好幾週還掛著 CG 才被發現。改成每天抓，WARN 就是要請周周（或去雲端「完成写真」）補照片。 */
function d9_completedCG() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const done = /已完工|完工済|現況完成|完成済/;
  const notDone = /尚未完工|未完工|建築中|未著工/;
  const onlyCG = [], mixed = [];
  for (const p of P.filter(x => !x.sold && x.status === "在售")) {
    const txt = String(p.age || "") + "\n" + String(p.note || "");
    const age = String(p.age || "");
    if (!(done.test(age) || (done.test(txt) && !notDone.test(age)))) continue;
    if (notDone.test(age)) continue;
    const ph = (p.photos || []).filter(f => !/-plan\.|-illust\./.test(f));
    const cg = ph.filter(f => /-pers\./.test(f));
    if (!cg.length) continue;
    (cg.length === ph.length ? onlyCG : mixed).push(`${p.id}（${p.title || ""}）CG ${cg.length}／照片 ${ph.length}`);
  }
  metrics.completedCG = onlyCG.length + mixed.length;
  add("D9", "已完工物件還在用完成預想圖", (onlyCG.length || mixed.length) ? "WARN" : "OK",
    `只有 CG ${onlyCG.length}｜CG 跟實景混著 ${mixed.length}` +
    ((onlyCG.length || mixed.length) ? "　→ 先翻雲端該物件的「完成写真」，沒有就請周周補實景照" : ""),
    onlyCG.concat(mixed).slice(0, 14));
}

/* D10 日文物件頁退回顯示繁中文字
   property-ja.html 是 Object.assign(繁中資料, 日文資料)：日文那邊漏寫的欄位會直接顯示繁中原文。
   2026-11-19 抓到上野毛・ベリスタ的「権利」欄顯示「所有權」，11/20 又抓到金町「高樓層」、中野本町「中野區」。
   只看日文頁實際會顯示、且繁中值裡有日文不用的字形的欄位。 */
function d10_jaFallback() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const PJ = loadProps("properties-ja.js", "PROPERTIES_JA") || {};
  const F = ["title", "station", "location", "layout", "size", "age", "facing", "mgmt", "right", "yield"];   // price 由頁面自動轉「税込」，A13 另外查
  const TW = /[權稅樓區續價們這於與為過還應點]|含稅|徒步/;
  const bad = [];
  for (const p of P.filter(x => !x.sold && x.status === "在售")) {
    const j = PJ[p.id] || {};
    for (const f of F) {
      if (j[f] !== undefined) continue;
      const v = String(p[f] || "");
      if (v && TW.test(v)) bad.push(`${p.id}.${f}：${v.slice(0, 40)}`);
    }
  }
  add("D10", "日文物件頁退回顯示繁中", bad.length ? "FAIL" : "OK",
    bad.length ? `${bad.length} 處　→ 在 properties-ja.js 該物件補上日文欄位` : "日文頁沒有退回顯示繁中的欄位", bad.slice(0, 14));
}

/* D11 物件介紹裡的「現場感受」說法（平路、日照、眺望、安靜…）
   2026-11-20 瀬田ハイツ：照抄賣方図面「駅までフラットアプローチ」寫成「到車站平路」，周周說實際不是平路。
   図面上的宣傳句不一定對，客人到現場一看就穿幫。這項只列出來給周周確認（INFO，不算錯），
   確認過的放進 OK.feelOk，之後不再列。 */
function d11_feelWords() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const RE = /平路|不用爬坡|沒有坡|無坡|坡道少|日照(良好|佳|很好|充足)|採光(良好|佳|很好|極佳)|眺望(良好|佳|很好|極佳|開闊)|視野(開闊|很好|極佳)|很安靜|安靜的住宅|環境安靜|閑靜|通風(良好|佳|很好)/g;
  const rows = [];
  for (const p of P.filter(x => !x.sold && x.status === "在售")) {
    const t = [p.title_cn, p.note, p.facing].join(" ").replace(/<[^>]+>/g, "");
    const ok = OK.feelOk[p.id] || [];
    const m = [...new Set(t.match(RE) || [])].filter(w => !ok.includes(w));
    if (m.length) rows.push(`${p.id}（${p.title || ""}）：${m.join("、")}`);
  }
  add("D11", "物件介紹的現場感受說法（待周周確認）", rows.length ? "INFO" : "OK",
    rows.length ? `${rows.length} 件還沒確認　→ 周周看過說 OK 就加進 OK.feelOk；不對就改掉` : "都確認過了", rows.slice(0, 20));
}

/* D12 物件照片沒登記在 img-size.json
   沒登記的話，產生器寫不出 width/height，物件頁會跳版（CLS）。2026-11-22 大巡邏才抓到 11/16 上架的
   kyodo-palace201、kumanomae-ekimae 漏登（C2 只有週日跑），改成每天查。修法：補進 img-size.json 再重跑六支。 */
function d12_imgSize() {
  const P = loadProps("properties.js", "PROPERTIES") || [];
  let sz = {}; try { sz = JSON.parse(read("img-size.json")); } catch (e) { }
  const miss = [];
  for (const p of P) for (const f of (p.photos || [])) if (!/^https?:/.test(f) && !sz[f]) miss.push(`${p.id}：${f}`);
  add("D12", "物件照片登記尺寸（img-size.json）", miss.length ? "FAIL" : "OK",
    miss.length ? `${miss.length} 張沒登記　→ 補進 img-size.json 後重跑六支產生器` : "全部有登記", miss.slice(0, 14));
}

/* D8 手機版實測：橫向溢出、站內破圖（用 Playwright 真的開頁、捲到底）
   A8 只看 console error 與有沒有渲染；版面在手機上被撐寬、內文圖片載不出來它抓不到。
   2026-11-18 Suica 文章的候選圖被 .post img 裁成 3:2，就是截圖才發現的。
   這裡至少保證：手機寬 390 不會左右滑、站內圖片都載得出來。 */
async function d8_mobile() {
  let pw; try { pw = require("playwright"); } catch (e) { add("D8", "手機版實測", "WARN", "沒有 playwright，略過"); return; }
  const { ART, SLUG } = loadIndexData();
  const newest = ART.slice().sort((x, y) => String(y.date).localeCompare(String(x.date)))[0];
  const P = loadProps("properties.js", "PROPERTIES") || [];
  const prop = P.find(p => !p.sold && p.status === "在售" && fs.existsSync(path.join(ROOT, `prop-${p.id}.html`)));
  const pages = ["index.html", "properties.html", "tokyo-home-match.html", "ja.html"];
  if (newest && SLUG[newest.id]) pages.push(SLUG[newest.id] + ".html", SLUG[newest.id] + "-ja.html");
  if (prop) pages.push(`prop-${prop.id}.html`);
  const bad = [];
  let browser;
  try {
    browser = await pw.chromium.launch();
    await Promise.all(pages.filter(f => fs.existsSync(path.join(ROOT, f))).map(async f => {
      const pg = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await pg.goto("file://" + path.join(ROOT, f), { waitUntil: "load", timeout: 30000 });
        for (let i = 0; i < 12; i++) { await pg.evaluate(y => window.scrollTo(0, y), i * 900); await pg.waitForTimeout(120); }
        await pg.waitForTimeout(800);
        const r = await pg.evaluate(() => {
          const w = document.documentElement.scrollWidth;
          const broken = [...document.images].filter(im => {
            const src = im.getAttribute("src") || "";
            if (!src || /^(https?:|data:)/.test(src) || im.loading === "lazy" && !im.complete) return false;
            return im.complete && im.naturalWidth === 0;
          }).map(im => im.getAttribute("src"));
          return { w, broken: [...new Set(broken)] };
        });
        if (r.w > 392) bad.push(`${f}：手機版寬 ${r.w}px（會左右滑）`);
        for (const b of r.broken.slice(0, 3)) bad.push(`${f}：圖片載不出來 ${b}`);
      } catch (e) { bad.push(`${f}：開頁失敗 ${String(e.message).slice(0, 60)}`); }
      await pg.close();
    }));
  } finally { if (browser) await browser.close(); }
  add("D8", "手機版實測（橫向溢出・站內破圖）", bad.length ? "FAIL" : "OK",
    `390px 寬實際開 ${pages.length} 頁（含最新文章 ${newest ? newest.id : "-"} 三語中的繁／日、物件頁）→ 問題 ${bad.length}`, bad.slice(0, 10));
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
  if (doA) { a1_syntax(); a2_links(); a3_sitemap(); a4_data(); a5_firestore(); a6_secrets(); a9_uptime(); a10_llms(); a11_imgguard(); a12_wardgomi(); a13_jaPriceWords(); await a8_runtime(); a7_idempotent(); }
  if (doB) { b1_trilingual(); b2_meta(); b3_hreflang(); b4_structured(); b5_cta(); b6_contextLinks(); b7_props(); b8_lang(); b9_jaLinks(); b10_langLeak(); b11_noindexLinks(); }
  // D 段每天都跑（2026-11-19 起）
  d1_propDates(); d2_compliance(); d3_otherCompany(); d4_boldNew(); d5_dataFresh(); d6_articleExpiry(); d7_og(); d9_completedCG(); d10_jaFallback(); d11_feelWords(); d12_imgSize(); await d8_mobile();
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
