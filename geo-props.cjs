/* ============================================================
   物件地圖的座標 → prop-geo.json（周周 2026-10-31：「物件專區做一個地圖，
   沒點開看得到物件大概位置，點開跳到物件頁」）

   用法：node geo-props.cjs
   ・每次新增／改了物件地址之後跑一次，再照第 9 節重跑產生器即可。

   ⚠️ 隱私：座標刻意只取到「町丁目的中心點」，不是番地。
     獨家物件、地址只寫到丁目的物件也一樣；地圖上看得到大概在哪一帶，
     但不會指到某一棟。前端再把同一丁目的多筆物件稍微錯開，免得疊成一點。

   資料來源：Geolonia「住所データ」（國土交通省位置參照情報＋國土地理院等，CC BY 4.0）
     https://github.com/geolonia/japanese-addresses
     容器連不到國土地理院的 API，但 raw.githubusercontent.com 連得到，所以從這裡抓。
     抓下來的區資料暫存在系統暫存資料夾，不放進 repo。
   ============================================================ */
const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "properties.js"), "utf8") + ";" +
  fs.readFileSync(path.join(ROOT, "properties-ja.js"), "utf8"), ctx);
const PROPS = ctx.window.PROPERTIES, JA = ctx.window.PROPERTIES_JA || {};

const CACHE = path.join(os.tmpdir(), "chouchou-geo-cache");
fs.mkdirSync(CACHE, { recursive: true });
function cityData(pref, city) {
  const f = path.join(CACHE, pref + "_" + city + ".json");
  if (!fs.existsSync(f)) {
    const url = "https://raw.githubusercontent.com/geolonia/japanese-addresses/master/api/ja/"
      + encodeURIComponent(pref) + "/" + encodeURIComponent(city) + ".json";
    // Node 的 https 不會走容器的 proxy，用 curl 抓最省事
    const body = execFileSync("curl", ["-sf", "-m", "30", url], { encoding: "utf8" });
    fs.writeFileSync(f, body);
  }
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

const KAN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const toKan = n => n <= 10 ? KAN[n] : (n < 20 ? "十" + KAN[n - 10] : KAN[Math.floor(n / 10)] + "十" + KAN[n % 10]);

/* 「東京都江東区森下1-18-2」→ { pref, city, town:"森下", chome:1 } */
function parse(loc) {
  let s = String(loc || "").replace(/[（(].*?[）)]/g, "").replace(/\s/g, "").trim();
  s = s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const m = s.match(/^(東京都|北海道|(?:大阪|京都)府|.{2,3}県)(.+?[市区町村])(.*)$/);
  if (!m) return null;
  let [, pref, city, rest] = m;
  // 政令市：「大阪市西成区」「横浜市鶴見区」這種要連區一起當 city
  const sub = rest.match(/^(.+?区)(.*)$/);
  if (/市$/.test(city) && sub && !/^\d/.test(sub[1])) { city += sub[1]; rest = sub[2]; }
  let town = rest, chome = 0, mm;
  if ((mm = rest.match(/^(.*?)(\d+)丁目/))) { town = mm[1]; chome = +mm[2]; }
  else if ((mm = rest.match(/^(.*?)([一二三四五六七八九十]+)丁目/))) { town = mm[1]; chome = KAN.indexOf(mm[2]) > 0 ? KAN.indexOf(mm[2]) : 0; }
  else if ((mm = rest.match(/^(.*?[^\d])(\d+)-\d/))) { town = mm[1]; chome = +mm[2]; }
  else { town = rest.replace(/\d.*$/, ""); }
  return { pref, city, town, chome };
}

const out = {}, miss = [];
for (const p of PROPS) {
  if (p.sold) continue;
  const loc = (JA[p.id] && JA[p.id].location) || p.location;
  const a = parse(loc);
  if (!a) { miss.push(p.id + "（地址讀不懂：" + loc + "）"); continue; }
  let data;
  try { data = cityData(a.pref, a.city); } catch (e) { miss.push(p.id + "（抓不到 " + a.city + "）"); continue; }
  const want = a.chome ? a.town + toKan(a.chome) + "丁目" : a.town;
  let hits = data.filter(t => t.town === want);
  if (!hits.length) hits = data.filter(t => t.town === a.town);
  if (!hits.length && a.town) hits = data.filter(t => t.town.indexOf(a.town) === 0);   // 沒有丁目的町：取各丁目平均
  if (!hits.length) { miss.push(p.id + "（" + a.city + " 找不到「" + want + "」）"); continue; }
  const lat = hits.reduce((s, t) => s + t.lat, 0) / hits.length;
  const lng = hits.reduce((s, t) => s + t.lng, 0) / hits.length;
  out[p.id] = [+lat.toFixed(5), +lng.toFixed(5)];
}
fs.writeFileSync(path.join(ROOT, "prop-geo.json"), JSON.stringify(out, null, 1) + "\n");
console.log("prop-geo.json：" + Object.keys(out).length + " 筆");
if (miss.length) console.log("對不到 " + miss.length + " 筆：\n  " + miss.join("\n  "));
