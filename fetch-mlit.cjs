/* ══════════════════════════════════════════════════════════════════
   國土交通省「不動産情報ライブラリ」實際成交價 → mlit.json／mlit.js
   （周周 2026-11-12 已申請 API 金鑰，約 5 個工作天下來；這支先寫好等金鑰）
   ・API：XIT001（不動産価格（取引価格・成約価格）情報取得），東京都 23 區，最近 4 季。
   ・彙整成：中古マンション＝區 × 面積帶 × 屋齡帶 的成交價中央值；土地＝區的㎡單價中央值。
     之後 match.js 會改用這份「真實成交價」，SUUMO（開價）留作對照。
   ・⚠️ 金鑰不可以寫進 repo（這個 repo 是 Public）。
     做法：在對話裡用 request_credential 存成環境的 network secret
       host＝www.reinfolib.mlit.go.jp、header＝Ocp-Apim-Subscription-Key
     proxy 會自動把金鑰塞進請求；本機測試也可以用環境變數 MLIT_KEY（不要 commit）。
   ・還沒有金鑰（回 401／403）時：什麼都不寫、正常結束，不會把舊資料洗掉。
   ・用法：node fetch-mlit.cjs
   ══════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const OUT = path.join(__dirname, "mlit.json");
const API = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001";
const CODES = Array.from({ length: 23 }, (_, i) => String(13101 + i));
const MS_BANDS = [[0, 40], [40, 60], [60, 80], [80, 100], [100, 9999]];   // 跟 match.js 的公寓面積帶一致
const AGE_BANDS = [[0, 10], [10, 20], [20, 30], [30, 999]];

function get(url) {
  const args = ["-sS", "-m", "60", "--compressed", "-w", "\n%{http_code}", "-H", "Accept: application/json"];
  if (process.env.MLIT_KEY) args.push("-H", "Ocp-Apim-Subscription-Key: " + process.env.MLIT_KEY);
  const out = execFileSync("curl", args.concat([url]), { encoding: "utf8", maxBuffer: 200 * 1024 * 1024 });
  const i = out.lastIndexOf("\n"), code = +out.slice(i + 1);
  return { code, body: out.slice(0, i) };
}
/* 最近 4 季（成交資料大約晚一季公布，所以從上上季往回抓） */
function quarters() {
  const d = new Date(), q = [];
  let y = d.getFullYear(), k = Math.floor(d.getMonth() / 3) + 1 - 2;
  while (k <= 0) { k += 4; y--; }
  for (let i = 0; i < 4; i++) { q.push([y, k]); k--; if (k === 0) { k = 4; y--; } }
  return q;
}
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2); };
const bandIdx = (B, v) => B.findIndex(([lo, hi]) => v >= lo && v < hi);
function builtAge(s, period) {
  const m = String(s || "").match(/(\d{4})年/), p = String(period || "").match(/(\d{4})年/);
  return m && p ? Math.max(0, +p[1] - +m[1]) : null;
}

(async () => {
  const qs = quarters(), out = { source: "国土交通省 不動産情報ライブラリ（不動産取引価格情報）", url: "https://www.reinfolib.mlit.go.jp/", quarters: qs.map(([y, k]) => y + "Q" + k), fetched: new Date().toISOString().slice(0, 10), unit: "万円", wards: {} };
  let ok = 0;
  for (const code of CODES) {
    const ms = MS_BANDS.map(() => AGE_BANDS.map(() => [])), land = [];
    let n = 0;
    for (const [y, k] of qs) {
      const r = get(`${API}?year=${y}&quarter=${k}&area=13&city=${code}&priceClassification=01&language=ja`);
      if (r.code === 401 || r.code === 403) { console.error("還沒有 API 金鑰（HTTP " + r.code + "）——金鑰下來後用 request_credential 存好再跑。這次不寫任何檔案。"); process.exit(0); }
      if (r.code !== 200) { console.error("✗", code, y + "Q" + k, "HTTP " + r.code); continue; }
      let j; try { j = JSON.parse(r.body); } catch (e) { console.error("✗", code, "JSON 讀不到"); continue; }
      for (const t of j.data || []) {
        const price = +t.TradePrice / 10000; if (!(price > 0)) continue;
        if (/中古マンション/.test(t.Type)) {
          const a = +t.Area, ag = builtAge(t.BuildingYear, t.Period), bi = bandIdx(MS_BANDS, a), ai = ag == null ? -1 : bandIdx(AGE_BANDS, ag);
          if (bi >= 0 && ai >= 0) { ms[bi][ai].push(Math.round(price)); n++; }
        } else if (/宅地\(土地\)/.test(t.Type) && +t.UnitPrice > 0) { land.push(Math.round(+t.UnitPrice / 1000) / 10); n++; }   // ㎡單價（萬円）
      }
      await new Promise(r => setTimeout(r, 1200));
    }
    out.wards[code] = {
      n,
      ms: ms.map(row => row.map(v => ({ n: v.length, med: median(v) }))),
      land: { n: land.length, sqm: median(land) }
    };
    if (n) ok++;
  }
  if (ok < 20) { console.error("只有 " + ok + " 區有資料，太少，不覆寫 mlit.json"); process.exit(1); }
  fs.writeFileSync(OUT, JSON.stringify(out));
  fs.writeFileSync(path.join(__dirname, "mlit.js"), "/* 由 fetch-mlit.cjs 產生，勿手改 */\nwindow.MLIT=" + JSON.stringify(out) + ";\n");
  console.log("mlit.json 已更新：" + ok + "/23 區（" + out.quarters.join("・") + "）");
})();
