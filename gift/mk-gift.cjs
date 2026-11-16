/* 會員見面禮 PDF 產生器（周周 2026-11-13：會員註冊後的體驗 B）
   node gift/mk-gift.cjs && python3 gift/flatten-gift.py  →  gift/tokyo-buying-checklist.pdf（繁中）＋ gift/tokyo-buying-checklist-cn.pdf（簡中，opencc 轉）
   內容只寫一般流程與常見作法；貸款・稅務・登記一律寫「依審查／由稅理士／司法書士確認」（CLAUDE.md §4）。 */
const fs = require("fs"), path = require("path");
const OpenCC = require("opencc-js");
const { chromium } = require("playwright");

const STEPS = [
  ["先想清楚：自住、投資，還是兩者都要？", "用途決定選區和物件類型，後面每一步都比較好判斷。",
    ["想住（或想出租）的生活圈、通勤路線", "預計持有多久、之後會不會換屋", "家人會不會一起住、要不要能養寵物"]],
  ["抓預算：總價之外，還有購屋雜費", "買房不是只付房價，稅金、登記、貸款手續費等雜費要另外預留。",
    ["頭期款與可以動用的現金", "購屋雜費先抓總價的 7% 左右當預備（依物件與貸款而異）", "每月還款＋管理費＋修繕基金（修繕積立金）"]],
  ["先確認貸款的可能性", "永住、非永住、住在海外，條件差很多；先問過再出價最安心。",
    ["身分：永住／非永住／海外居住", "收入、在職與納稅證明等文件", "事前審查（能不能貸、可貸成數依銀行審查為準）"]],
  ["找物件、實際看屋（內見）", "照片看不出來的，現場一看就知道。",
    ["車站距離、採光、樓層、周邊環境", "是否為新耐震基準（1981 年 6 月以後取得建築確認）", "管理狀況、修繕基金與長期修繕計畫"]],
  ["提出購買申請（買付証明書）", "表達購買意願與條件，還不是契約，但要認真出價。",
    ["價格與付款方式", "希望的交屋日", "貸款沒過可以解約的條款（ローン特約）"]],
  ["聽重要事項說明（重要事項説明）", "簽約前由宅建士說明物件的權利、法規與限制。",
    ["用途地域、道路、建築限制", "管理規約、修繕計畫、使用限制", "看不懂的地方當場問（周周會用中文逐條解釋）"]],
  ["簽約（売買契約）＋支付訂金（手付金）", "正式簽約，訂金常見為價格的一部分（約 5〜10%，依契約而定）。",
    ["契約內容與重要事項說明一致", "貸款特約、交屋日寫清楚", "印章或簽名、身分文件"]],
  ["房貸正式審查與簽貸款契約", "事前審查過了，還要正式審查（本審査）。",
    ["補齊銀行要求的文件", "簽訂貸款契約（金銭消費貸借契約）", "火災保險（有貸款時通常會被要求）"]],
  ["交屋結算（決済）・登記", "付清尾款、拿到鑰匙，所有權移轉登記由司法書士辦理。",
    ["尾款與各項費用的匯款", "固定資產稅、管理費依日數分攤（日割清算）", "收鑰匙、確認屋況"]],
  ["交屋之後", "買完才是開始，這幾件事記得處理。",
    ["水電瓦斯、網路、地址變更", "不動產取得稅：交屋後一段時間會寄來繳費通知", "每年的固定資產稅；若出租，申報稅務請由稅理士確認"]],
];
const FOREIGN = ["護照；住在日本的話還有在留卡", "住在海外時，常需要經公證的住所與簽名證明等文件（由司法書士確認）",
  "海外匯款要預留時間，大額匯款可能需要說明資金來源", "買房本身通常不等於取得簽證，長住要另外規劃在留資格"];

const STEPS_JA = [
  ["まず目的を決める：自宅？投資？それとも両方？", "用途が決まると、エリアや物件の種類を選びやすくなります。",
    ["住みたい（貸したい）生活圏・通勤ルート", "保有予定の期間、将来の住み替えの有無", "同居するご家族、ペット可の必要性"]],
  ["予算を立てる：物件価格のほかに諸費用", "物件価格だけでなく、税金・登記・ローン手数料などの諸費用を別途見込みます。",
    ["頭金と手元資金", "諸費用はまず物件価格の7%前後を目安に（物件・ローンにより異なります）", "毎月の返済＋管理費＋修繕積立金"]],
  ["住宅ローンの可能性を確認", "永住・非永住・海外在住で条件が大きく変わります。購入申込の前に確認すると安心です。",
    ["在留資格：永住／非永住／海外在住", "収入・在職・納税の証明書類", "事前審査（借入の可否・金額は金融機関の審査によります）"]],
  ["物件探し・内見", "写真では分からないことも、現地を見ればすぐに分かります。",
    ["駅からの距離・日当たり・階数・周辺環境", "新耐震基準か（1981年6月以降に建築確認）", "管理状況・修繕積立金・長期修繕計画"]],
  ["購入申込（買付証明書）", "購入の意思と条件を伝える書面です。契約ではありませんが、真剣に価格を検討しましょう。",
    ["価格と支払方法", "希望の引渡し日", "ローン特約（融資が下りない場合の解除条項）"]],
  ["重要事項説明を受ける", "契約前に宅地建物取引士が物件の権利・法令上の制限などを説明します。",
    ["用途地域・道路・建築制限", "管理規約・修繕計画・使用制限", "分からない点はその場で質問（中国語でもご説明できます）"]],
  ["売買契約＋手付金の支払い", "正式な契約です。手付金は価格の一部で、5〜10%程度が一般的です（契約により異なります）。",
    ["契約内容が重要事項説明と一致しているか", "ローン特約・引渡し日の記載", "印鑑または署名・本人確認書類"]],
  ["住宅ローン本審査・金銭消費貸借契約", "事前審査のあとに本審査があります。",
    ["金融機関から求められた書類の提出", "金銭消費貸借契約の締結", "火災保険（ローン利用時は通常加入が求められます）"]],
  ["決済・引渡し・登記", "残代金を支払って鍵を受け取ります。所有権移転登記は司法書士が行います。",
    ["残代金と諸費用の送金", "固定資産税・管理費の日割清算", "鍵の受け取りと室内の確認"]],
  ["引渡し後", "購入してからが新しい暮らしのスタートです。",
    ["電気・ガス・水道・ネット、住所変更", "不動産取得税：引渡し後しばらくして納税通知が届きます", "毎年の固定資産税／賃貸する場合の申告は税理士にご確認ください"]],
];
const FOREIGN_JA = ["パスポート、日本在住の方は在留カード", "海外在住の方は、公証を受けた住所・署名証明などが必要になることが多いです（司法書士が確認します）",
  "海外送金は日数に余裕を。高額送金では資金の出所の説明を求められることがあります", "不動産を購入しても在留資格が得られるわけではありません。長期滞在は別途在留資格の手続きが必要です"];
const TXT = {
  tw: { k: "周周・日本房仲｜會員見面禮", h: "外國人在東京買房<br>從看屋到交屋 10 步清單", by: "<b>周周（周欣妤）</b>株式会社アンドプラス<br>chouchouinjapan.com",
        intro: "謝謝你加入會員！這份清單把日本買房從頭到尾拆成 10 步，每一步要準備什麼、要注意什麼，打勾就不會漏。實際順序會依物件與貸款狀況調整，遇到不確定的地方，直接 LINE 問我就好。",
        fx: "外國人・住在海外的人，要多準備的", cta1: "每一步，周周都可以用中文陪你走", cta2: "看屋、出價、契約說明、貸款、交屋，有問題直接問我",
        ft: "※ 本清單為一般流程說明，實際手續依物件、契約與個人狀況而異。能不能貸款、可貸成數依各銀行審查為準；稅額請由稅理士確認；登記與契約內容由司法書士・宅地建物取引士確認。買房本身通常不等於取得日本簽證或移民資格。<br>© 周周・日本房仲（株式会社アンドプラス）　未經同意請勿轉載。" },
  ja: { k: "周周・日本の不動産｜会員特典", h: "外国人が東京で住まいを買う<br>内見から引渡しまでの10ステップ", by: "<b>周周（シュウ シンユウ）</b>株式会社アンドプラス<br>chouchouinjapan.com",
        intro: "会員登録ありがとうございます。日本での住まい購入を10のステップに分け、それぞれ準備すること・注意することをまとめました。チェックしながら進めれば抜け漏れを防げます。実際の順序は物件やローンの状況により前後します。ご不明な点はLINEでお気軽にどうぞ。",
        fx: "外国籍・海外在住の方が追加で準備するもの", cta1: "すべてのステップを、周周がサポートします", cta2: "内見・購入申込・重要事項説明・ローン・引渡しまで、日本語・中国語で対応",
        ft: "※ 本チェックリストは一般的な流れの説明であり、実際の手続きは物件・契約・個別の状況により異なります。融資の可否・金額は各金融機関の審査によります。税額は税理士に、登記・契約内容は司法書士・宅地建物取引士にご確認ください。不動産の購入により日本の在留資格が得られるものではありません。<br>© 周周・日本の不動産（株式会社アンドプラス）　無断転載を禁じます。" },
};

function html(lang) {
  const L = lang === "ja" ? "ja" : "tw", X = TXT[L], ST = L === "ja" ? STEPS_JA : STEPS, FX = L === "ja" ? FOREIGN_JA : FOREIGN;
  const step = (s, i) => `<div class="st"><div class="no">${i + 1}</div><div class="bd"><h3>${s[0]}</h3><p>${s[1]}</p><ul>${s[2].map(x => `<li><i></i>${x}</li>`).join("")}</ul></div></div>`;
  return `<!doctype html><html lang="${lang === "cn" ? "zh-CN" : lang === "ja" ? "ja" : "zh-Hant-TW"}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:14mm 14mm 16mm}
*{box-sizing:border-box}body{margin:0;font-family:'Noto Sans TC',sans-serif;color:#292524;font-size:11pt;line-height:1.55}
.hd{border-bottom:2px solid #e11d48;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}
.hd .k{color:#e11d48;font-weight:700;font-size:10pt;letter-spacing:.08em}.hd h1{font-family:'Noto Serif TC',serif;font-size:21pt;margin:4px 0 0;line-height:1.3}
.hd .by{text-align:right;font-size:9pt;color:#78716c}.hd .by b{display:block;color:#292524;font-size:11pt}
.intro{background:#faf7f2;border-radius:10px;padding:10px 14px;font-size:10pt;color:#57534e;margin-bottom:12px}
.st{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #eee;page-break-inside:avoid}
.no{flex:0 0 30px;height:30px;border-radius:50%;background:#e11d48;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:12pt;margin-top:2px}
.bd h3{margin:0;font-size:12.5pt}.bd p{margin:2px 0 4px;color:#57534e;font-size:10pt}
ul{list-style:none;margin:0;padding:0}li{font-size:10.5pt;padding:1px 0;display:flex;gap:8px;align-items:flex-start}
li i{flex:0 0 12px;height:12px;border:1.5px solid #a8a29e;border-radius:3px;margin-top:5px}
.fx{margin-top:12px;border:1.5px solid #fecdd3;background:#fff1f2;border-radius:10px;padding:10px 14px;page-break-inside:avoid}.fx h3{margin:0 0 4px;font-size:12pt;color:#be123c}
.cta{margin-top:12px;display:flex;justify-content:space-between;align-items:center;background:#ecfdf5;border-radius:10px;padding:10px 14px;page-break-inside:avoid}
.cta b{font-size:12pt}.cta span{font-size:10pt;color:#047857}
.ft{margin-top:10px;font-size:8.5pt;color:#78716c;line-height:1.6}
</style></head><body>
<div class="hd"><div><div class="k">${X.k}</div><h1>${X.h}</h1></div>
<div class="by">${X.by}</div></div>
<div class="intro">${X.intro}</div>
${ST.map(step).join("")}
<div class="fx"><h3>${X.fx}</h3><ul>${FX.map(x => `<li><i></i>${x}</li>`).join("")}</ul></div>
<div class="cta"><div><b>${X.cta1}</b><br><span>${X.cta2}</span></div><div style="text-align:right"><b>LINE：@202dzwok</b><br><span>lin.ee/RscRWCp</span></div></div>
<div class="ft">${X.ft}</div>
</body></html>`;
}

(async () => {
  const dir = __dirname, toCn = OpenCC.Converter({ from: "tw", to: "cn" });
  const b = await chromium.launch();
  for (const [lang, file] of [["tw", "tokyo-buying-checklist.pdf"], ["cn", "tokyo-buying-checklist-cn.pdf"], ["ja", "tokyo-buying-checklist-ja.pdf"]]) {
    let h = html(lang);
    if (lang === "ja") h = h.replace("Noto+Sans+TC", "Noto+Sans+JP").replace("Noto+Serif+TC", "Noto+Serif+JP").replace(/'Noto Sans TC'/g, "'Noto Sans JP'").replace(/'Noto Serif TC'/g, "'Noto Serif JP'");
    if (lang === "cn") h = toCn(h).replace("Noto+Sans+TC", "Noto+Sans+SC").replace("Noto+Serif+TC", "Noto+Serif+SC").replace(/'Noto Sans TC'/g, "'Noto Sans SC'").replace(/'Noto Serif TC'/g, "'Noto Serif SC'");
    const p = await b.newPage();
    await p.setContent(h, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: path.join(dir, file), format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" } });
    if (process.argv.includes("--png")) await p.screenshot({ path: path.join(process.argv[process.argv.indexOf("--png") + 1], lang + ".png"), fullPage: true });
    await p.close();
    console.log("ok", file, fs.statSync(path.join(dir, file)).size);
  }
  await b.close();
})();
