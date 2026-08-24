/**
 * check-lang.cjs — 中文頁面的日文殘留檢查（依 CLAUDE.md §7）
 *
 * 規則：日文詞只能以「中文在前、括號標日文原文」出現。
 *   ✅ 實質投報率（実質利回り）  ← 日文緊接在（「『〈之後 → 通過
 *   ❌ 実質利回り做兩件事         ← 日文直接當正文 → 報出來
 *
 * 抓什麼：平假名（日文語法的鐵證）＋ 繁中不會用的日文漢字（実／収／済／届／税…）。
 * 不抓什麼：純片假名（幾乎都是建物名、店名、外來語）、「・」分隔符、
 *          網址、法定登記資訊、法規與資料來源正式名稱。
 * 物件檔（properties.js）只查 title_cn 與 note——其餘欄位是物件原名與地名，
 * 周周 2026-08-24 決定保留日文漢字。
 *
 * 只回報、不讓流程失敗。排在五支產生器之後跑。
 */
const fs = require("fs");

const FILES = ["index.html","about.html","minpaku.html","feedback.html","quiz.html","partners.html","privacy.html",
"404.html","properties.html","property.html","property-types.html","tokyo-area-guide.html","tools.html","videos.html",
"tool-agent.html","tool-area.html","tool-convert.html","tool-cost.html","tool-fx.html","tool-loan.html","tool-yield.html",
"properties.js"];

const JPKANJI = new Set(("収実対図売発検済験転経営産応広関変続総独読楽気帰単団囲圧桜沢浜児会学国号数体従悪戦拡挙断昼残湾満焼状"+
"画県窓竜絵継縁声蔵覚覧観訳証説豊賛辺郷鉄銭隠険静顔駅髪麦涙帯庁択拝拠捜掲撃条来楼様歯歴毎浄湿瀬犠獣畳価剤効励労勧巻参双"+
"増壊壮奨娯嬢寛寝寿将専届峡巣廃弁弾径徴恵悩懐抜担挟挿摂斉旧暁栄桟権欧歓殻浅渓渋滝滞灯献猟畑盗砕禅稲穂穏窃粛粋緑繊缶聴脳"+
"臓舗舎艶芸茎荘薬蚕装覇触詰謡譲践辞逓遅酔醸闘陥雑霊頼顕駆騒髄齢黒戸圏税写歳").split(""));
const HIRA = c => c >= "ぁ" && c <= "ゟ";
const KATA = c => (c >= "ァ" && c <= "ヺ") || c === "ー";
const KANJI = c => c >= "㐀" && c <= "鿿";
const PART = c => HIRA(c) || KATA(c) || KANJI(c);     // 可組成一個詞的字（「・」刻意不算）
const OPEN = "（(「『〈《【〔";                        // 中文在前、日文在括號內 → 合格

const ALLOW = [
// 法定登記資訊
"株式会社アンドプラス","住宅営業部","東京都渋谷区鶯谷町","ＳＵビル","シュウ シンユウ","宅地建物取引業者免許番号",
"宅地建物取引士","東京都知事","第102938号",
// 法規／官方頁面／資料來源正式名稱
"宅地建物取引業者検索","事務所一覧","犯罪収益移転防止法","犯収法","賃貸住宅の管理業務等の適正化に関する法律",
"賃貸住宅管理業法","マンションの修繕積立金に関するガイドライン","マンション総合調査","収益物件 市場動向",
"住宅宿泊事業法","届出住宅に係るゼロ日規制等について","経営・管理","の許可基準の改正等について","に係る上陸基準省令等",
"外国免許切替","国家戦略特別区域","外国人滞在施設経営事業","弁済業務保証金制度","主な減価償却資産の耐用年数表",
"非居住者等に不動産の賃借料を支払ったとき","オフィス・事務所の敷金の相場は？","オフィスの敷金相場はいくら？",
"賃貸オフィスの初期費用を徹底解説","株式会社IPPO","価格 月別推移","会社設立JAPAN","行政書士しかま事務所","中古マンション相場一覧","不動産","台湾人","中国語",
// 教讀者辨認的日文關鍵字（本身就是要看到日文原文）
"バス・トイレ別","独立洗面台","脱衣所","販売図面","建築条件付","居抜き","リフォーム済","満室想定",
// 周周 2026-08-24 決定保留：物件專區的地名與慣用欄位
"恵比寿","渋谷","横浜","浜松町","深沢","桜上水","矢来町","浅草","両国","目黒","戸建","号室","万円","自社","現況",
"松沢","奥沢","自由が丘","雪が谷大塚","豊葉の杜學園","国際通り","國際通り","勝どき","まいばすけっと","日鉄興和不動産コミュニティ",
// 語言切換器的簡體中文字樣
"简体中文",
// 法定登記資訊（續）
"ＳＵビル301号","住宅営業","免許番号","担当",
// 官方名稱／資料來源（續）
"簡易宿所営業","不動産公正取引協議会","法人住民税","均等割の仕組み","規模別の早見表","地方税制度","住宅ローン金利",
"の最新動向","金利推移","ダイヤモンド不動産研究所","楽待","楽天","うちのカチ","価格推移","重ねるハザードマップ",
"さくら事務所","畳・じょう","敷金・保証金",
// 程式碼裡用來比對日文備註的關鍵字
"ご自宅"];

const FIELD = /(title_cn|note)\s*:\s*"((?:[^"\\]|\\.)*)"/g;   // 物件檔只查這兩欄

let total = 0, files = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, "utf8");
  // 只保留要檢查的區段，其餘用空白蓋掉（位置不變，方便印上下文）
  let s = raw;
  if (f === "properties.js") {
    let keep = " ".repeat(raw.length).split(""); let m;
    FIELD.lastIndex = 0;
    while ((m = FIELD.exec(raw))) {
      const st = m.index + m[0].indexOf(m[2]);
      for (let i = st; i < st + m[2].length; i++) keep[i] = raw[i];
    }
    s = keep.join("");
  }
  const mask = new Uint8Array(s.length);
  const cover = re => { let m; const r = new RegExp(re.source, "g");
    while ((m = r.exec(s))) mask.fill(1, m.index, m.index + m[0].length); };
  cover(/https?:\/\/[^\s"'<>]+/);
  for (const p of ALLOW) { let i = 0; while ((i = s.indexOf(p, i)) >= 0) { mask.fill(1, i, i + p.length); i += p.length; } }

  const hits = [];
  for (let i = 0; i < s.length; i++) {
    if (mask[i] || !(HIRA(s[i]) || JPKANJI.has(s[i]))) continue;
    let a = i, b = i;
    while (a > 0 && PART(s[a-1])) a--;
    while (b + 1 < s.length && PART(s[b+1])) b++;
    const w = s.slice(a, b + 1);
    if (mask[a] || mask[b]) { i = b; continue; }
    // 純片假名（建物名、店名、外來語）放行
    if ([...w].every(c => KATA(c))) { i = b; continue; }
    if (!OPEN.includes(a > 0 ? s[a-1] : "")) hits.push([a, w]);
    i = b;
  }
  if (!hits.length) continue;
  files++; total += hits.length;
  console.log("\n── " + f + "（" + hits.length + " 處）");
  const seen = new Set();
  for (const [pos, w] of hits) {
    if (seen.has(w)) continue; seen.add(w);
    console.log("   " + w.padEnd(12) + " …" + raw.slice(Math.max(0, pos - 28), pos + 28).replace(/\s+/g, "") + "…");
  }
}
console.log(total ? "\n⚠️  共 " + total + " 處疑似日文殘留（" + files + " 個檔）。正文請改成「中文（日文原文）」；確定合法的加進 check-lang.cjs 的 ALLOW。"
                  : "\n✅ 中文頁面沒有偵測到日文殘留");
