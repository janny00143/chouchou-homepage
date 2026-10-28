/* ══════════════════════════════════════════════════════════════════
   東京 23 區的官方垃圾頁清單（共用）

   fetch-ward-gomi.cjs（抓中文版 PDF）與 fetch-ward-sodai.cjs（抓大型垃圾
   受理窗口）都從這 23 個網址出發，所以抽出來放一份。
   ⚠️ 兩邊各留一份的話，某一區改版時一定會有一邊忘了改。

   這些網址每週由 .github/workflows/ward-gomi.yml 實際打過一次，
   抓不到會讓 workflow 紅字，所以是站上最可靠的一份。
   ══════════════════════════════════════════════════════════════════ */

/* 23 區的官方垃圾分類／外語版頁面。
   ⚠️ 這些網址是搜尋引擎實際回傳的，不是拼湊的。改版時請更新這裡。 */
const WARDS = [
  ["千代田區", "千代田区", "https://www.city.chiyoda.lg.jp/koho/kurashi/gomi/wakekata/index.html"],
  ["中央區", "中央区", "https://www.city.chuo.lg.jp/a0039/kurashi/gomi/bunbetsu/wakekata/panhuretto.html"],
  ["港區", "港区", "https://www.city.minato.tokyo.jp/gomigenryou/kurashi/gomi/kate/k-wakekata/guidebook.html"],
  ["新宿區", "新宿区", "https://www.city.shinjuku.lg.jp/seikatsu/file09_02_00001.html"],
  ["文京區", "文京区", "https://www.city.bunkyo.lg.jp/b039/p000928.html"],
  ["台東區", "台東区", "https://www.city.taito.lg.jp/kurashi/gomi/wakekata/20180124165732477.html"],
  ["墨田區", "墨田区", "https://www.city.sumida.lg.jp/kurashi/gomi_recycle/wakedashi_pamphlet/foreignlanguage.html"],
  ["江東區", "江東区", "https://www.city.koto.lg.jp/388010/kurashi/gomi/kate/7348.html"],
  ["品川區", "品川区", "https://www.city.shinagawa.tokyo.jp/PC/kankyo/kankyo-gomi/gomi-kateigomi/gomi-kateigomi-dashikata/hpg000005617.html"],
  ["目黑區", "目黒区", "https://www.city.meguro.tokyo.jp/recycle/kurashi/gomi/shigengomipdf.html"],
  ["大田區", "大田区", "https://www.city.ota.tokyo.jp/seikatsu/gomi/gaikokujinnmukepannfure.html"],
  ["世田谷區", "世田谷区", "https://www.city.setagaya.lg.jp/02241/409.html"],
  ["澀谷區", "渋谷区", "https://www.city.shibuya.tokyo.jp/kurashi/gomi/kateigomi/gomi_panf.html"],
  ["中野區", "中野区", "https://www.city.tokyo-nakano.lg.jp/kurashi/gomi/dashikata/leaflet.html"],
  ["杉並區", "杉並区", "https://www.city.suginami.tokyo.jp/s104/5928.html"],
  ["豐島區", "豊島区", "https://www.city.toshima.lg.jp/gomi-fl/foreignlanguage.html"],
  ["北區", "北区", "https://www.city.kita.lg.jp/living/bins/1002013/1002019.html"],
  ["荒川區", "荒川区", "https://www.city.arakawa.tokyo.jp/a025/bunbetusassi.html"],
  ["板橋區", "板橋区", "https://www.city.itabashi.tokyo.jp/tetsuduki/gomi/shigen/1001856.html"],
  ["練馬區", "練馬区", "https://www.city.nerima.tokyo.jp/kurashi/gomi/recycle/downloads.html"],
  ["足立區", "足立区", "https://www.city.adachi.tokyo.jp/seso/manual.html"],
  ["葛飾區", "葛飾区", "https://www.city.katsushika.lg.jp/information/1000087/1030269/1025771/1018561.html"],
  ["江戶川區", "江戸川区", "https://www.city.edogawa.tokyo.jp/e025/kurashi/gomi_recycle/kategomi/bunbetsu/shigengomi/pamphlet/china.html"],
];

module.exports = { WARDS };
