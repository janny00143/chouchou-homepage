/* ══════════════════════════════════════════════════════════════════
   SUUMO 價格相場 → souba.json／souba.js（買房定位分析 tokyo-home-match 用）
   周周 2026-11-12：「可以用網站搜 SUUMO」「去爬各式網站丟資訊，時時更新」
   ・中古マンション：23 區各區 5 個面積帶（～40㎡／40～60／60～80／80～100／100㎡～）× 各車站「中央值・價格帶」。
   ・一戶建（新築／中古）：4 個建物面積帶（～80／80～100／100～120／120㎡～）× 各車站（2026-11-12 起）。
   ・土地：區全體＋6 個土地面積帶的「坪單價」與件數（2026-11-12 起）。
   ・都是 SUUMO 依掲載價格（開價，不是成交價）彙整的公開數字。
   ・一頁一個請求、間隔 2 秒；23 區 × 4 種約 3〜4 分鐘。
   ・抓失敗的區保留上一版（keep-last-good），不會把資料洗成空的。
   ・用法：node fetch-souba.cjs          （更新 souba.json／souba.js；每週一跑一次，有排程）
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
/* 一戶建：分頁標籤每區不一樣（例：品川中古只有 60～80／80～100／100～120／140～），所以逐區讀標籤，再歸到固定的 4 個帶 */
const HB = [[0, 80], [80, 100], [100, 120], [120, 9999]];
function parseHouse(html, kind) {
  const ci = html.indexOf("js-ranking_content"); if (ci < 0) throw new Error("版面改了：沒有分頁");
  const cut = html.indexOf("ranking-table", ci), head = html.slice(ci, cut > ci ? cut : ci + 1500).replace(/<[^>]+>/g, "").replace(/\s+/g, "");
  const labs = []; const lre = /(\d*)～(\d*)m2|(\d+)m2～/g; let lm;
  while ((lm = lre.exec(head))) labs.push(lm[3] ? [+lm[3], 9999] : [lm[1] ? +lm[1] : 0, lm[2] ? +lm[2] : 9999]);
  if (!labs.length) throw new Error("版面改了：讀不到面積標籤");
  const blocks = html.split(/class="ranking ranking--layout js-ranking_table/).slice(1, 1 + labs.length);
  const re = new RegExp('<a href="/' + kind + '/soba/tokyo/ek_\\d+/">([^<]+?)駅</a></td>\\s*<td class="ranking-td">([\\d,]+)万円</td>\\s*<td class="ranking-td">([\\d,]+)～([\\d,]+)万円</td>', "g");
  const out = HB.map(() => []);
  blocks.forEach((b, i) => {
    const lo = labs[i][0], bi = HB.findIndex(r => lo >= r[0] && lo < r[1]); if (bi < 0) return;
    let m; re.lastIndex = 0; while ((m = re.exec(b))) out[bi].push({ st: m[1], med: num(m[2]), lo: num(m[3]), hi: num(m[4]) });
  });
  return out;
}
/* 土地：「○○区全体の土地価格相場 450.3 万円/坪（195件）」＋ 140㎡以上／120〜140／…／60㎡未満 各列的坪單價 */
const LB = [[0, 60, 50], [60, 80, 70], [80, 100, 90], [100, 120, 110], [120, 9999, 135]];   // [下限, 上限, 估總價用的代表面積㎡]
const TSUBO = 3.30579;
function parseLand(html) {
  const t = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "|").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/(\| ?)+/g, "|");
  const all = t.match(/全体の土地価格相場\|([\d.]+)\|万円 \/ 坪\|（\|(\d+)件/); if (!all) throw new Error("版面改了：沒有全體坪單價");
  const rows = []; const re = /\|(?:(\d+)m2未満\|)?(\d+)m2(以上|未満)\|[^（]*?([\d.]+)万円\/坪 \|（\|(\d+)件/g; let m;
  while ((m = re.exec(t))) { const lo = m[3] === "以上" ? +m[2] : 0, hi = m[3] === "以上" ? (m[1] ? +m[1] : 9999) : +m[2]; rows.push({ lo, hi, tsubo: +m[4], n: +m[5] }); }
  if (rows.length < 4) throw new Error("版面改了：面積列只有 " + rows.length);
  const bands = LB.map(([lo, hi, mid]) => {
    const rs = rows.filter(r => r.lo >= lo && r.lo < hi), n = rs.reduce((s, r) => s + r.n, 0);
    const ts = n ? Math.round(rs.reduce((s, r) => s + r.tsubo * r.n, 0) / n * 10) / 10 : null;
    return { n, tsubo: ts, med: ts ? Math.round(ts * mid / TSUBO) : null };
  });
  return { tsubo: +all[1], n: +all[2], bands };
}
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2); };
const sumBands = bands => bands.map(rows => ({ n: rows.length, med: median(rows.map(r => r.med)), lo: rows.length ? Math.min(...rows.map(r => r.lo)) : null, hi: rows.length ? Math.max(...rows.map(r => r.hi)) : null, stations: rows }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { }
  const out = { source: "SUUMO 中古マンション価格相場（SUUMO掲載物件の価格を集計・各駅徒歩15分以内）", url: "https://suumo.jp/ms/chuko/soba/tokyo/", unit: "万円", bands: BANDS, fetched: new Date().toISOString().slice(0, 10), wards: {},
    types: {
      hnew: { source: "SUUMO 新築一戸建て価格相場", url: "https://suumo.jp/ikkodate/soba/tokyo/", bands: HB, wards: {} },
      hused: { source: "SUUMO 中古一戸建て価格相場", url: "https://suumo.jp/chukoikkodate/soba/tokyo/", bands: HB, wards: {} },
      land: { source: "SUUMO 土地価格相場（坪単価）", url: "https://suumo.jp/tochi/soba/tokyo/", bands: LB, wards: {} } } };
  const keep = (dst, src, code, err, slug) => { console.error("✗", slug, err.message); if (src && src.wards && src.wards[code]) dst.wards[code] = Object.assign({}, src.wards[code], { stale: prev.fetched }); };
  let ok = 0, okT = { hnew: 0, hused: 0, land: 0 };
  for (const [code, slug] of WARDS) {
    try {
      const html = await get(`https://suumo.jp/ms/chuko/soba/tokyo/sc_${slug}/`);
      out.wards[code] = { slug, bands: sumBands(parse(html)) };
      ok++;
    } catch (e) { keep(out, prev, code, e, "ms " + slug); }
    await sleep(2000);
    for (const [k, kind] of [["hnew", "ikkodate"], ["hused", "chukoikkodate"]]) {
      try { out.types[k].wards[code] = { bands: sumBands(parseHouse(await get(`https://suumo.jp/${kind}/soba/tokyo/sc_${slug}/`), kind)) }; okT[k]++; }
      catch (e) { keep(out.types[k], prev.types && prev.types[k], code, e, k + " " + slug); }
      await sleep(2000);
    }
    try { out.types.land.wards[code] = parseLand(await get(`https://suumo.jp/tochi/soba/tokyo/sc_${slug}/`)); okT.land++; }
    catch (e) { keep(out.types.land, prev.types && prev.types.land, code, e, "land " + slug); }
    await sleep(2000);
  }
  if (ok < 20) { console.error("中古マンション只成功 " + ok + " 區，太少，不覆寫 souba.json"); process.exit(1); }
  for (const k in okT) if (okT[k] < 18 && !(prev.types && prev.types[k])) console.error("⚠️ " + k + " 只成功 " + okT[k] + " 區");
  fs.writeFileSync(OUT, JSON.stringify(out));
  /* 網頁直接用 <script src="souba.js"> 載入（file:// 也能開） */
  fs.writeFileSync(path.join(__dirname, "souba.js"), "/* 由 fetch-souba.cjs 產生，勿手改 */\nwindow.SOUBA=" + JSON.stringify(out) + ";\n");
  console.log("souba.json 已更新：中古マンション " + ok + "/23 區，新築戶建 " + okT.hnew + "、中古戶建 " + okT.hused + "、土地 " + okT.land + "（" + out.fetched + "）");
})();
