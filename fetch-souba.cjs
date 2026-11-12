/* ══════════════════════════════════════════════════════════════════
   SUUMO 中古マンション價格相場 → souba.json（買房定位分析 match.html 用）
   周周 2026-11-12：「可以用網站搜 SUUMO」「去爬各式網站丟資訊，時時更新」
   ・抓 23 區各區的「中古マンション相場」頁：5 個面積帶（～40㎡／40～60／60～80／80～100／100㎡～）
     × 每個車站的「中央值・價格帶」。這是 SUUMO 依掲載價格（開價，不是成交價）彙整的公開數字。
   ・一區一個請求、間隔 2 秒；23 區約 1 分鐘。
   ・抓失敗的區保留上一版（keep-last-good），不會把資料洗成空的。
   ・用法：node fetch-souba.cjs          （更新 souba.json）
   ══════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "souba.json");
const WARDS = [["13101","chiyoda"],["13102","chuo"],["13103","minato"],["13104","shinjuku"],["13105","bunkyo"],["13106","taito"],["13107","sumida"],["13108","koto"],["13109","shinagawa"],["13110","meguro"],["13111","ota"],["13112","setagaya"],["13113","shibuya"],["13114","nakano"],["13115","suginami"],["13116","toshima"],["13117","kita"],["13118","arakawa"],["13119","itabashi"],["13120","nerima"],["13121","adachi"],["13122","katsushika"],["13123","edogawa"]];
const BANDS = ["0-40", "40-60", "60-80", "80-100", "100-"];
/* 用 curl 抓：會自動走環境的 HTTPS_PROXY（node 內建 https 不會） */
const { execFileSync } = require("child_process");
function get(url) {
  return Promise.resolve().then(() => execFileSync("curl", ["-sS", "-m", "40", "--fail", "-A", "Mozilla/5.0 (compatible; chouchou-market-summary/1.0)", "-H", "Accept-Language: ja", url], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
}
const num = s => parseInt(String(s).replace(/[^\d]/g, ""), 10);
function parse(html) {
  const blocks = html.split(/class="ranking ranking--layout js-ranking_table/).slice(1, 6); // 前 5 塊＝「價格高→低」的 5 個面積帶
  if (blocks.length !== 5) throw new Error("版面改了：找到 " + blocks.length + " 個面積帶");
  return blocks.map(b => {
    const rows = [];
    const re = /<a href="\/ms\/chuko\/soba\/tokyo\/ek_\d+\/">([^<]+?)駅<\/a><\/td>\s*<td class="ranking-td">([\d,]+)万円<\/td>\s*<td class="ranking-td">([\d,]+)～([\d,]+)万円<\/td>/g;
    let m; while ((m = re.exec(b))) rows.push({ st: m[1], med: num(m[2]), lo: num(m[3]), hi: num(m[4]) });
    return rows;
  });
}
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2); };
(async () => {
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { }
  const out = { source: "SUUMO 中古マンション価格相場（SUUMO掲載物件の価格を集計・各駅徒歩15分以内）", url: "https://suumo.jp/ms/chuko/soba/tokyo/", unit: "万円", bands: BANDS, fetched: new Date().toISOString().slice(0, 10), wards: {} };
  let ok = 0;
  for (const [code, slug] of WARDS) {
    try {
      const html = await get(`https://suumo.jp/ms/chuko/soba/tokyo/sc_${slug}/`);
      const bands = parse(html);
      out.wards[code] = { slug, bands: bands.map(rows => ({ n: rows.length, med: median(rows.map(r => r.med)), lo: rows.length ? Math.min(...rows.map(r => r.lo)) : null, hi: rows.length ? Math.max(...rows.map(r => r.hi)) : null, stations: rows })) };
      ok++;
    } catch (e) {
      console.error("✗", slug, e.message);
      if (prev.wards && prev.wards[code]) out.wards[code] = Object.assign({}, prev.wards[code], { stale: prev.fetched });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (ok < 20) { console.error("成功 " + ok + " 區，太少，不覆寫 souba.json"); process.exit(1); }
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log("souba.json 已更新：" + ok + "/23 區（" + out.fetched + "）");
})();
