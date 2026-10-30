/* ============================================================
   GA 歷史點閱 → views-base.json（周周 2026-10-30）
   ------------------------------------------------------------
   周周在統計頁自己匯入 CSV 會遇到亂碼／要登入的麻煩，所以改成：
   她把 GA 匯出的 CSV 丟進對話或 repo，由 AI 跑這支，產生靜態的
   views-base.json（{ 文章id: 歷史點閱數 }），views.js 會讀它當「歷史基數」。

   用法：node ga-base.cjs <GA匯出的.csv>
   ・CSV 的格式、標題對照、簡繁模糊比對，全部沿用 stats.html 裡的匯入程式
     （直接從 stats.html 抽出來執行），兩邊永遠同一套規則，不會各算各的。
   ・Firestore 裡如果有周周手動寫入的 base，以 Firestore 為準；
     views-base.json 只在 Firestore 沒有 base 時補上。
   ・重跑會整份覆蓋 views-base.json（不是累加），所以 CSV 要給「到計數器上線前一天」
     的完整區間：計數器是 2026-10-23 上線的，理想是 GA 選到 2026-10-22。
   ============================================================ */
const fs = require("fs");
const path = require("path");

const csvPath = process.argv[2];
if (!csvPath) { console.error("用法：node ga-base.cjs <GA匯出的.csv>"); process.exit(1); }

const html = fs.readFileSync(path.join(__dirname, "stats.html"), "utf8");
const block = id => JSON.parse(html.match(new RegExp('id="' + id + '">([\\s\\S]*?)</script>'))[1]);
const SLUGMAP = block("vslug"), TITLEMAP = block("vtitle"), META = block("vmeta");
const TITLE = {}; META.forEach(m => TITLE[m.id] = m.title);

// 從 stats.html 抽出 normT／matchTitle／parseCsv 三個函式
const src = html.match(/function normT[\s\S]*?\nfunction render/);
if (!src) { console.error("stats.html 裡找不到匯入程式，產生器改過了嗎？"); process.exit(1); }
const parseCsv = new Function("SLUGMAP", "TITLEMAP",
  src[0].replace(/\nfunction render$/, "") + "\nreturn parseCsv;")(SLUGMAP, TITLEMAP);

let txt = fs.readFileSync(csvPath);
// GA 有時匯出 UTF-16（Excel 存檔）或帶 BOM，統一轉成 UTF-8 字串
if (txt[0] === 0xff && txt[1] === 0xfe) txt = txt.slice(2).toString("utf16le");
else txt = txt.toString("utf8").replace(/^﻿/, "");

const res = parseCsv(txt);
const ids = Object.keys(res.out).sort((a, b) => res.out[b] - res.out[a]);
const out = {};
ids.forEach(k => out[k] = res.out[k]);
fs.writeFileSync(path.join(__dirname, "views-base.json"), JSON.stringify(out, null, 1) + "\n");

console.log("views-base.json：" + ids.length + " 篇，合計 " + ids.reduce((s, k) => s + out[k], 0) + " 次");
ids.slice(0, 10).forEach(k => console.log("  " + k + "  " + out[k] + "  " + (TITLE[k] || "")));
if (res.skipped.length) console.log("對不到文章、略過 " + res.skipped.length + " 列（物件頁、工具頁、首頁本來就不算）");
