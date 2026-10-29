/* ══════════════════════════════════════════════════════════════════
   東京 23 區・大型垃圾（粗大ごみ）受理窗口表
   繁中（generate-pages.cjs）與日文（build-ja.cjs）共用，簡中由 build-cn 轉。

   資料來源是 ward-sodai.json，由 .github/workflows/ward-gomi.yml 每週在
   GitHub 的機器上跑 fetch-ward-sodai.cjs 抓回來（容器連不到各區官網）。
   ⚠️ 不要手改 JSON 裡的電話——下週自動抓取就會蓋掉；抓錯要修的是抓取程式。

   抓不到電話或線上申請的區，表格只放「官方頁」，不留空白讓人以為壞掉。
   ══════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");

function wardSodaiTable(lang, esc) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(__dirname, "ward-sodai.json"), "utf8")); }
  catch (e) { return ""; }      // 檔案還沒產生就當作沒有這一段，不要讓產生器掛掉
  const tw = lang === "tw";
  const TD = "padding:9px 11px;border-bottom:1px solid #e7e5e4;vertical-align:top";
  const head = tw ? ["區", "電話預約", "網路預約"] : ["区", "電話受付", "インターネット受付"];
  const rows = data.wards.map(w => {
    const name = tw ? w.ward : w.wardJa;
    const official = w.sodaiPage || w.from;
    const tel = w.phone
      ? `<a href="tel:${esc(w.phone.replace(/-/g, ""))}" style="color:inherit;font-weight:700;white-space:nowrap">${esc(w.phone)}</a>`
      : `<a href="${esc(official)}" target="_blank" rel="noopener" style="color:#78716c;font-size:13px">${tw ? "看官方頁" : "公式ページ"}</a>`;
    const web = w.online
      ? `<a href="${esc(w.online.url)}" target="_blank" rel="noopener" style="color:#15803d;font-weight:700;white-space:nowrap">${tw ? "前往預約 ↗" : "受付ページ ↗"}</a>`
      : `<a href="${esc(official)}" target="_blank" rel="noopener" style="color:#78716c;font-size:13px">${tw ? "看官方頁" : "公式ページ"}</a>`;
    return `<tr><td style="${TD};white-space:nowrap"><a href="${esc(official)}" target="_blank" rel="noopener" style="color:inherit;font-weight:700">${name}</a></td><td style="${TD}">${tel}</td><td style="${TD}">${web}</td></tr>`;
  }).join("");
  const note = tw
    ? `＊點區名會開該區官方的大型垃圾說明頁。電話與預約網址每週自動從各區官網重新抓取，資料更新日 ${esc(data.updated)}。打電話前若不放心，以官方頁為準。`
    : `＊区名をクリックすると各区公式の粗大ごみ案内ページが開きます。電話番号と受付ページは毎週自動で各区公式サイトから再取得しております（最終確認日 ${esc(data.updated)}）。`;
  return `<div style="overflow-x:auto;margin:14px 0"><table style="width:100%;border-collapse:collapse;font-size:14.5px;line-height:1.7">`
    + `<thead><tr style="background:#f0fdf4">`
    + head.map(h => `<th style="text-align:left;padding:10px 11px;border-bottom:2px solid #bbf7d0;white-space:nowrap">${h}</th>`).join("")
    + `</tr></thead><tbody>${rows}</tbody></table>`
    + `<p style="font-size:12.5px;color:#78716c;margin-top:8px">${note}</p></div>`;
}

function sodaiUpdated() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "ward-sodai.json"), "utf8")).updated || ""; }
  catch (e) { return ""; }
}

module.exports = { wardSodaiTable, sodaiUpdated };
