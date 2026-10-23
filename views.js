/* ============================================================
   文章點閱計數（周周 2026-10-23 指示）
   ------------------------------------------------------------
   ▍怎麼用？
     文章頁放：<span class="vcnt" data-vid="a61" data-count="1"></span>
       data-vid   ＝ 文章 id（不是 slug）。用 id 是因為 slug 有可能換，
                     換了之後數字不會歸零（a61 在 2026-10-23 就換過一次）。
       data-count ＝ 有這個屬性才會「+1」；統計頁只讀不加，就不要帶。
     統計頁放：<div id="vstats"></div>，會自己把全部文章列出來。

   ▍資料存在 Firebase Firestore 的 views 集合
     views/{文章id} = { n: 累計次數, base: 歷史基數 }
     顯示的數字 ＝ base + n。
     base 是「這個計數器上線以前」的點閱數（從 Google Analytics 匯入），
     由周周在 Firebase 主控台填，或用匯入腳本寫入；前端永遠不會動到它。

   ▍三語合併計算
     繁中／簡中／日文看的是同一篇文章，所以共用同一個 id，數字是加總。

   ▍防灌水
     同一台裝置、同一篇文章，6 小時內只算一次（存在 localStorage）。
     擋得住自己重新整理和一般的重複造訪，擋不住蓄意者——
     這跟物件圖的浮水印一樣，是擋一般人，不是擋有心人。
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, increment }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

/* 跟 comments.js 同一個 Firebase 專案（這些本來就是公開的前端設定，不是密碼）。
   兩支程式都可能先跑，所以用 getApps() 判斷，不要重複 initializeApp。 */
const firebaseConfig = {
  apiKey: "AIzaSyAzwbqz1f7PqDifv4GNd6b1v4Y-JK5tli4",
  authDomain: "chouchou-homepage.firebaseapp.com",
  projectId: "chouchou-homepage",
  storageBucket: "chouchou-homepage.firebasestorage.app",
  messagingSenderId: "487849516915",
  appId: "1:487849516915:web:62fb4b31c8e358595aef06"
};
const RECAPTCHA_SITE_KEY = "6Lf0joMtAAAAANfTspfN91tDC5pWQ-oG6fzfgLb2";

/* 同一篇文章幾小時內不重複計數 */
const DEDUP_HOURS = 6;

let db = null;
function getDb() {
  if (db) return db;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (RECAPTCHA_SITE_KEY && !window.__appCheckDone) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      window.__appCheckDone = true;
    } catch (e) { /* comments.js 已經初始化過就會丟錯，忽略即可 */ }
  }
  db = getFirestore(app);
  return db;
}

function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }

/* 這台裝置最近有沒有看過這篇？看過就不再 +1（但照樣顯示數字） */
function shouldCount(id) {
  try {
    const k = "vw_" + id;
    const last = Number(localStorage.getItem(k) || 0);
    if (Date.now() - last < DEDUP_HOURS * 3600 * 1000) return false;
    localStorage.setItem(k, String(Date.now()));
    return true;
  } catch (e) { return true; }   // 無痕模式等讀不到 localStorage，就照算
}

/* ── 文章頁：顯示（並視情況 +1）── */
async function runCounters() {
  const els = Array.from(document.querySelectorAll(".vcnt[data-vid]"));
  if (!els.length) return;
  const d = getDb();
  for (const el of els) {
    const id = el.dataset.vid;
    if (!id) continue;
    const ref = doc(d, "views", id);
    try {
      if (el.hasAttribute("data-count") && shouldCount(id)) {
        await setDoc(ref, { n: increment(1) }, { merge: true });
      }
      const snap = await getDoc(ref);
      const v = snap.exists() ? snap.data() : {};
      const total = Number(v.base || 0) + Number(v.n || 0);
      el.textContent = "👁 " + fmt(total) + (el.dataset.unit || "");
      el.style.visibility = "visible";
    } catch (e) {
      el.style.display = "none";   // 讀不到就安靜地不顯示，不要在文章頁丟錯誤給讀者看
    }
  }
}

/* ── 統計頁：全部文章的排行榜 ── */
async function runStats() {
  const box = document.getElementById("vstats");
  if (!box) return;
  let meta = [];
  try { meta = JSON.parse(document.getElementById("vmeta").textContent); }
  catch (e) { box.textContent = "讀不到文章清單。"; return; }

  let rows = [];
  try {
    const snap = await getDocs(collection(getDb(), "views"));
    const m = {};
    snap.forEach(s => { const v = s.data() || {}; m[s.id] = Number(v.base || 0) + Number(v.n || 0); });
    rows = meta.map(a => ({ ...a, v: m[a.id] || 0 }));
  } catch (e) {
    box.innerHTML = '<p style="color:#dc2626">讀不到點閱資料，請確認 Firestore 規則已發布。</p>';
    return;
  }

  rows.sort((a, b) => b.v - a.v);
  const max = Math.max(1, rows[0] ? rows[0].v : 1);
  const sum = rows.reduce((s, r) => s + r.v, 0);
  const zero = rows.filter(r => r.v === 0).length;

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let html = '<div class="vsum"><b>' + fmt(sum) + '</b> 次總點閱　·　' + rows.length + ' 篇文章'
    + (zero ? '　·　' + zero + ' 篇還沒有人看過' : '') + '</div>';
  html += '<div class="vlist">';
  rows.forEach((r, i) => {
    const w = Math.max(2, Math.round(r.v / max * 100));
    html += '<div class="vrow">'
      + '<div class="vno">' + (i + 1) + '</div>'
      + '<div class="vmain">'
      + '<a class="vt" href="' + esc(r.url) + '">' + esc(r.title) + '</a>'
      + '<div class="vbar"><i style="width:' + w + '%"></i></div>'
      + '<div class="vmeta">' + esc(r.cat) + '　·　' + esc(r.date) + '</div>'
      + '</div>'
      + '<div class="vv">' + fmt(r.v) + '</div>'
      + '</div>';
  });
  html += "</div>";
  box.innerHTML = html;
}

runCounters();
runStats();
