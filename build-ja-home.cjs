/* 產生日文首頁 ja.html（完整版 SPA，跟 index.html / index-cn.html 同架構、同圖片，只是內容翻成自然商務日文）。
   用法：node build-ja-home.cjs （在 repo 根目錄執行，需要先有 index.html 與 ja-content.json）
   來源：index.html 的 STYLE / ART / SLUG / CATS，加上這支腳本內建的日文 UI 文案（JA）。
   每次 index.html 的服務項目／流程／FAQ 等靜態文案有改動時，這支腳本裡對應的日文也要跟著手動更新一次。 */
const fs = require("fs");
const ROOT = __dirname;
const BASE = "https://chouchouinjapan.com/";

const src = fs.readFileSync(ROOT + "/index.html", "utf8");
const ART = eval("[" + src.match(/const ART=\[([\s\S]*?)\n\];/)[1] + "]");
const CATS = eval(src.match(/const CATS=(\[[\s\S]*?\]);/)[1]);
const SLUG = eval("(" + src.match(/const SLUG=(\{[\s\S]*?\});/)[1] + ")");
const STYLE = src.match(/<style>[\s\S]*?<\/style>/)[0]
  .replace("font-family:'Noto Sans TC',system-ui,sans-serif", "font-family:'Noto Sans JP',system-ui,sans-serif");

const jaContent = JSON.parse(fs.readFileSync(ROOT + "/ja-content.json", "utf8"));

const JA_CAT_NAME = {
  foreign: "外国人の不動産購入", live: "暮らし・住まいガイド", invest: "投資・収益物件",
  minpaku: "民泊関連法規", area: "エリア紹介", travel: "観光スポット",
  loan: "ローン・税金", life: "生活情報", knowhow: "不動産購入の知識"
};
const CATS_JA = CATS.map(c => ({ id: c.id, name: JA_CAT_NAME[c.id] || c.name, g: c.g, c: c.c }));

const A4_JA = {
  title: "2026年最新｜日本の民泊関連法規まとめ",
  ex: "民泊を始めたい方へ。年間180日の上限や届出義務、2026年の新しい規制動向まで、この記事でまとめてご紹介します。",
  tags: ["民泊", "民泊新法", "法規"]
};

const ART_JA = ART.map(a => {
  const j = a.id === "a4" ? A4_JA : jaContent[a.id];
  if (!j) throw new Error("缺少日文翻譯內容: " + a.id);
  return { id: a.id, cat: a.cat, date: a.date, title: j.title, tags: j.tags, cover: a.cover, video: a.video, ex: j.ex, url: a.url, body: [j.ex] };
});

const PROCESS_JA = [
  ["初回ヒアリング", "まずはご希望や予算、スケジュールをお伺いし、方向性を確認します。"],
  ["ご予算・融資可能性の確認", "自己資金と借入条件を踏まえ、実際に購入可能な範囲を把握します。"],
  ["物件の選定", "ご希望条件に合う物件を選び、問題のある物件は事前に除外します。"],
  ["内見／オンライン内見", "台湾にいらっしゃってもオンラインで内見でき、物件の状態を実際に確認できます。"],
  ["購入申込", "気に入った物件が見つかったら購入申込書を提出し、価格交渉を始めます。"],
  ["融資事前審査", "銀行に事前審査を申請し、借入可能額を確認します。"],
  ["ご契約・重要事項説明", "宅地建物取引士が法律上のポイントや権利関係をご説明し、全て中国語で通訳・確認します。"],
  ["融資本審査", "銀行の本審査を通過し、融資条件が確定します。"],
  ["決済・引き渡し", "残代金をお支払いいただき、引き渡しが完了、鍵をお渡しします。"],
  ["登記・その後の管理", "所有権の登記を完了し、その後の管理についてもサポートします。"]
];
const LIVE_JA = [
  "日本で働いていて、賃貸から購入への切り替えを考えている",
  "今後長期的に日本に住む予定がある",
  "東京や神奈川でマイホームの購入を検討している",
  "自分がローンを組めるか確認したい",
  "予算的にどのエリアが買えるのか分からない",
  "日本語の契約書の内容が理解できるか不安"
];
const INV_JA = [
  "賃料相場", "利回り", "空室リスク", "管理費・修繕積立金",
  "エリアの賃貸需要", "将来の売却のしやすさ", "長期保有に適した物件かどうか", "非居住者の購入・送金に関する注意点"
];
const FAQ_JA = [
  ["外国人でも日本の不動産は購入できますか？", "はい、外国人の方でも原則として日本の不動産を購入できます。ただし、融資・送金・税金・保有目的については別途確認が必要です。"],
  ["日本の不動産を購入すればビザが取得できますか？", "不動産の購入自体が、通常は日本のビザや移住資格の取得につながるわけではありません。長期滞在をご希望の場合は、適した在留資格を別途ご確認いただく必要があります。"],
  ["日本非居住者でも融資を受けられますか？", "可能性はありますが、日本居住者よりも条件は厳しくなります。実際の借入可能額や条件は、各金融機関の審査によります。"],
  ["気になる物件を先に見てもらうことはできますか？", "もちろんです。気になる物件があれば周周まで直接お送りください。基本条件や注意すべき点を確認いたします。"],
  ["台湾に住んでいても、リモートで日本の不動産を購入できますか？", "可能です。多くの海外のお客様は委任状や郵送書類を通じてご契約されています。一部の書類については台湾でサイン証明が必要になる場合もあり、実際の必要書類は宅地建物取引士・司法書士の指示に従います。"],
  ["内見から引き渡しまで、どのくらいの期間がかかりますか？", "現金でのご購入は比較的早く進み、ローンをご利用の場合は審査に時間がかかるため、一般的には1〜2か月程度です。実際の期間は案件やローン審査、諸手続きの状況によって異なります。"],
  ["物件価格以外に、どのくらいの諸費用が必要ですか？", "仲介手数料、登記費用・司法書士報酬、印紙税、不動産取得税、火災保険料などの「諸費用」が必要になります。目安として物件価格の約6〜9%程度（物件やローンの有無によって異なります）。実際の金額は各種見積もりや税理士・司法書士にご確認ください。"],
  ["築年数の古い中古物件でも購入・融資は可能ですか？", "可能です。ただし築年数はローンの返済期間や借入可能額に影響します。重要なのは築年数そのものより管理・メンテナンスの状態です。実際の融資条件は各金融機関の審査によります。"],
  ["日本の不動産を保有すると、毎年どんな税金がかかりますか？", "主に固定資産税・都市計画税がかかります。マンションの場合は毎月の管理費・修繕積立金も必要です。賃貸に出す場合は別途所得税の申告が必要になります。実際の税額は税理士にご確認ください。"],
  ["日本語ができなくても購入できますか？周周は何をサポートしてくれますか？", "大丈夫です。周周が中国語で物件確認や日本側の仲介会社・司法書士とのやり取りを全面的にサポートします。ご契約や法律書類は日本側の専門家（宅地建物取引士・司法書士）が確認しますので、言葉の面はご安心ください。"],
  ["台湾（海外）在住ですが、購入資金はどのように日本へ送金すればよいですか？", "日本での不動産購入では、売主や司法書士など複数の相手に個別送金する必要があり、海外から一件ずつ送金するのは手間がかかります。周周では送金をまとめて代行するサービスもご用意しており、複数回の海外送金の手間を減らすことができます。具体的な送金方法・流れ・費用については、LINEで周周までお気軽にご確認ください。"]
];
const BIO_JA = [
  "周周と申します。日本の不動産の現場で日々物件を担当している台湾出身のエージェントです。東京を中心に、神奈川・千葉・横浜周辺でも対応しております。中国語（繁体字）・台湾語はネイティブレベル、日本語も日々の業務で問題なく対応しておりますので、どちらの言語でも安心してご相談いただけます。お客様の多くは、日本でマイホームの購入や投資用物件をお探しの中国語圏の方々です。",
  "日本での購入の流れ、ローン、税金、契約は台湾とは大きく異なり、初めての方はつまずきやすいものです。私の仕事は物件をご案内するだけでなく、ご予算・通勤・生活環境・ローン・将来の売却のしやすさまで、一緒に確認していくことです。",
  "日本の不動産は、価格の安さや利回りの高さだけで判断するものではありません。安定して貸せるか、将来売りやすいかのほうが、より大切なポイントです。"
];
const REVIEWS_JA = [
  { text: "周周のおかげで日本で初めてのマイホームを購入できました。最初から最後まで中国語で対応いただき、とても丁寧で助かりました。今後また不動産の売買があれば必ずお願いしたいです。", who: "台湾 T様（初めての購入）" },
  { text: "私たちはアメリカ在住で、オンライン内見からご契約まで全て周周にリモートでサポートしていただきました。とても安心でき、引き渡し後の細かい手続きまでしっかり対応していただきました。", who: "アメリカ K様ご夫妻（リモート内見）" },
  { text: "購入後も、周周に電気・ガス・水道の手続きや管理会社とのやり取り、鍵の交換まで対応していただきました。アフターサービスが本当に素晴らしく、心から感謝しています。", who: "日本在住 T様（自宅購入・アフターサポート）" },
  { text: "初めて日本で一戸建てを購入しました。土地探しから内見、ご契約まで、周周が丁寧に説明してくださったおかげで、台湾にいながら安心して決断できました。", who: "台湾 J様ご夫妻（初めての一戸建て購入）" },
  { text: "千葉で土地を購入する際は確認事項が多かったのですが、周周が用途地域や権利関係、現況までしっかり確認してくれました。プロセスが透明で丁寧、とても専門的でした。", who: "台湾 H様（千葉の土地購入）" },
  { text: "還暦を迎えてから、思い立って日本への移住を実現しました。異国の地で新しいことを学び、自分自身を大切にしながら、心身ともに自由を取り戻すことができました。周周には最初から最後までサポートしていただき、すべて順調に進みました。", who: "日本へ移住されたC様（退職後の移住）" }
];

const JA_UI = {
  brand: "周周・日本の不動産",
  lineBtn: "LINE で相談する",
  heroTitle: "こんにちは、周周です 👋",
  heroBody: "東京を拠点に活動する台湾出身の不動産エージェントです。中国語（繁体字）・台湾語はもちろん、日本語でのご相談も完全に対応いたします。物件購入・自宅探し・投資・ご契約までトータルにサポートしています。<br>物件探しやローン、ご契約のことなど、どんなことでもお気軽にご相談ください！",
  heroLinkServices: "→ 周周にできることを見る",
  heroArea: "📍 東京23区を中心に、横浜・神奈川・千葉エリアにも対応しております！",
  altSakura: "東京の桜の季節",
  altVideo: "周周の動画",
  altStreet: "日本の街並みの遊歩道",
  toolCard: { title: "🧮 購入シミュレーションツール", desc: "住宅ローンの月々返済額、諸費用、利回り、為替レートまでまとめて計算", cta: "シミュレーションを始める →" },
  translateCard: { title: "🏠 不動産資料翻訳ツール", desc: "日本語の物件資料が読めない方に。JPG画像をアップロードするだけで中国語に翻訳・要点整理", cta: "今すぐ使う →" },
  listBanner: { title: "周周の日本不動産購入ノート", sub: "購入・自宅・投資・ローン・エリアまで、記事でわかりやすく解説" },
  searchPlaceholder: "記事を検索…",
  noResults: "該当する記事がありません",
  reviewsTitle: "お客様の声 💬",
  reviewsSub: "ご成約の一つひとつが、日本での新しい生活の始まりです。以下は実際にいただいたお客様のお声です。",
  reviewsNote: "💛 お客様からよくいただくお声：中国語でのフルサポート、電気・ガス・水道や携帯電話、管理会社、鍵交換まで対応するアフターサービス、遠方でも自ら足を運ぶ姿勢。物件購入はゴールではなく、安心して暮らせることが本当に大切なポイントです。",
  homeCta: { title: "日本の不動産購入について知りたい方へ", body: "ご自宅用でも投資用でも、まずはLINEで周周にお気軽にご相談ください。気になる物件があれば、そのまま送っていただいても構いません。" },
  servicesTitle: "周周にできること",
  servicesSub: "物件探し、内見、価格交渉から、ローン、契約、引き渡し、アフターサポートまで、日本の不動産購入に関わることを周周が中国語・台湾語・日本語で全てサポートします。",
  servicePanels: [
    { h: "🏠 日本の不動産売買", items: ["新築・中古住宅", "マンション・タワーマンション・一戸建て", "土地売買", "投資用不動産", "自宅・別荘・資産形成のご相談"] },
    { h: "📝 購入全プロセスサポート", items: ["ご予算・ご希望条件のヒアリング", "物件の選定・ご提案・市場調査", "オンライン内見・現地内見の手配", "買付価格のご提案・交渉・購入申込", "銀行融資のご相談・お申し込みサポート", "契約書類の中国語翻訳・重要事項のご説明", "ご契約・海外送金・引き渡しまでの調整", "日本の税金・保有コストのご説明", "司法書士・火災保険・リフォーム業者のご紹介", "ご購入後の管理・アフターサポート"] },
    { h: "🌏 海外在住のお客様向けサービス", items: ["中国語・日本語のバイリンガル対応", "海外からのオンライン内見・購入サポート", "購入書類・海外送金の流れのご説明", "日本での資産形成・投資・民泊に関する情報提供", "サブリース・管理会社のご紹介", "一棟投資向け管理会社のご紹介", "税理士・納税管理人のご紹介"] }
  ],
  servicePanel4: {
    h: "💬 その他の有料相談サービス",
    sub: "不動産purchaseとは直接関係のないご相談は、以下の内容で有料相談を承っております：",
    items: ["中国語・日本語の通訳、書類翻訳", "日本での就職活動・履歴書・面接に関するご相談", "日本での仕事・生活情報に関するご相談", "ビザに関する基礎情報の整理・専門家のご紹介"],
    note: "※ 不動産のご購入に伴う翻訳・手続きサポートは、仲介サービスの一環として提供いたします。<br>※ 翻訳のみ、就職相談、生活相談などは別途有料サービスとなります。"
  },
  servicesCta: "どのサービスが合うか知りたい方はこちら",
  processTitle: "外国人の日本不動産購入の流れ",
  processSub: "こうした手続きは、周周が一つひとつ一緒に確認しながら進めますので、日本語の資料を自分で読んで頭を抱える必要はありません。",
  processCta: "ご自身の条件でどこまで購入できるか知りたい方はこちら",
  liveTitle: "マイホーム購入サポート",
  liveSub: "日本で暮らしていて、賃貸から購入へのステップアップを考えている方へ。",
  liveH3: "こんな方におすすめです",
  liveNote: "ご予算、通勤時間、生活環境、ローン、将来の売却のしやすさまで一緒に見ていきます。物件をご案内するだけではありません。",
  liveCta: "どのエリアが買えるか知りたい方はこちら",
  investTitle: "投資・収益物件サポート",
  investSub: "日本で安定した家賃収入を得たい投資家の方へ。",
  investH3: "こんなポイントを一緒に確認します",
  investNote: "日本の不動産は価格や利回りの高さだけで判断せず、安定して貸せるか、将来売りやすいかがより重要なポイントです。",
  investCta: "気になる物件があればぜひ見せてください",
  faqTitle: "よくあるご質問",
  faqSub: "よくいただくご質問にお答えします。",
  aboutTitle: "周周について",
  aboutRole: "周欣妤（シュウ・シンユウ）｜台湾出身・東京の不動産エージェント｜中国語・台湾語・日本語対応",
  aboutAreas: ["📍 東京23区（メインエリア）", "横浜", "神奈川", "千葉近郊"],
  contactHeading: "📞 お問い合わせ",
  qrCaption: "QRコードを読み取って、または長押しで LINE を追加",
  companyHeading: "🏢 会社情報",
  companyLabels: { company: "会社名", advisor: "日本不動産アドバイザー", license: "宅建業免許", addr: "所在地", mobile: "携帯", tel: "会社電話", fax: "FAX", email: "メール", hp: "公式サイト" },
  footerArea: "東京23区を中心に、横浜・神奈川・千葉近郊エリアにも対応しております",
  footerNav: { feedback: "💬 ご意見・ご要望", tools: "🧮 計算ツール", videos: "🎬 動画", translate: "🏠 不動産資料翻訳ツール" },
  footerSeo: "周周（シュウ・シンユウ）は東京を拠点に活動する台湾出身の不動産エージェントです。中国語（繁体字）・台湾語・日本語のトリリンガルで、日本での不動産購入・自宅探し・投資・住宅ローン・契約までトータルにサポートしています。対応エリアは東京23区を中心に、横浜・神奈川・千葉近郊。日本の不動産購入や住み替えを検討している中国語圏のお客様はもちろん、日本語でのご相談も安心です。お気軽にLINEでご相談ください。",
  backToList: "← 記事一覧に戻る",
  byline: "執筆者：周周",
  articleHelpful: "この記事はお役に立ちましたか？ご質問はお気軽にどうぞ",
  articleHelpfulSub: "気になる物件があれば、ぜひ周周まで直接お送りください。",
  nav: { home: "ホーム", services: "サービス内容", process: "購入の流れ", live: "マイホーム購入", invest: "投資・収益物件", translate: "不動産資料翻訳", videos: "動画", faq: "よくあるご質問", about: "会社概要", feedback: "ご意見・ご要望" },
  navddSvc: "サービス ▾", navddTool: "ツール ▾",
  tools: [["🏦 住宅ローン試算", "tool-loan-ja.html"], ["💴 購入費用", "tool-cost-ja.html"], ["🤝 仲介手数料", "tool-agent-ja.html"], ["📈 利回り試算", "tool-yield-ja.html"], ["💱 為替レート", "tool-fx-ja.html"], ["📐 坪・畳換算", "tool-area-ja.html"]],
  mobileLabels: { services: "サービス", tools: "ツール" },
  catAll: "📚 すべての記事"
};

const escJs = s => String(s).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const head = `<!-- 周周・日本語ランディングページ（完整版 SPA，跟繁中/簡中同架構）。由 build-ja-home.cjs 自動產生，勿手改。 -->
<meta charset="utf-8">
<!--langredir--><script>(function(){try{var p=location.pathname.split('/').pop()||'index.html';if(p!=='ja.html'){var isCn=p.slice(-8)==='-cn.html';var L=localStorage.getItem('lang');if(L==='cn'&&!isCn){location.replace(p.slice(0,-5)+'-cn.html');return;}if(L==='tw'&&isCn){location.replace(p.slice(0,-8)+'.html');return;}}}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-lang]');if(!a)return;var l=a.getAttribute('data-lang');if(l==='tw'||l==='cn'){try{localStorage.setItem('lang',l);}catch(_){}}},true);})();</script>
<script>(function(){var css="html[data-fs=s]{--fs:1}html[data-fs=m]{--fs:1.1}html[data-fs=l]{--fs:1.22}.fsctl{position:fixed;left:14px;bottom:16px;z-index:60;display:flex;gap:2px;background:#fff;border:1px solid #e7e5e4;border-radius:999px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.12)}.fsctl button{border:none;background:none;cursor:pointer;font-size:13px;font-weight:700;color:#78716c;padding:5px 9px;border-radius:999px;font-family:inherit;line-height:1}.fsctl button.on{background:#f43f5e;color:#fff}";var st=document.createElement("style");st.textContent=css;(document.head||document.documentElement).appendChild(st);var f="m";try{f=localStorage.getItem("fs")||"m";}catch(e){}document.documentElement.setAttribute("data-fs",f);window.setFS=function(x){document.documentElement.setAttribute("data-fs",x);try{localStorage.setItem("fs",x);}catch(e){}u();};function u(){var c=document.documentElement.getAttribute("data-fs"),bs=document.querySelectorAll(".fsctl button");for(var i=0;i<bs.length;i++){bs[i].className=(bs[i].getAttribute("data-f")===c?"on":"");}}function init(){if(document.querySelector(".fsctl"))return;var d=document.createElement("div");d.className="fsctl";d.setAttribute("aria-label","文字サイズ");var labels=["小","中","大"],keys=["s","m","l"];for(var i=0;i<3;i++){(function(k,t){var btn=document.createElement("button");btn.textContent=t;btn.setAttribute("data-f",k);btn.onclick=function(){setFS(k);};d.appendChild(btn);})(keys[i],labels[i]);}document.body.appendChild(d);u();}if(document.body){init();}else{document.addEventListener("DOMContentLoaded",init);}})();</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XN785WJLZ3"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-XN785WJLZ3");</script>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f43f5e">
<title>中国語・台湾語・日本語対応の不動産エージェント｜東京で日本の住まい探しをサポート｜周周</title>
<meta name="description" content="東京を拠点に、中国語（繁体字）・台湾語・日本語のトリリンガルで日本の不動産購入・住み替え・投資・住宅ローン・契約をサポート。台湾出身のスタッフが日本語での対応も完全に問題なく行えるため、中国語圏のお客様はもちろん、日本語でのご相談も安心です。お気軽に LINE でご相談ください。">
<meta name="keywords" content="中国語対応 不動産,台湾語 対応 不動産,バイリンガル 不動産エージェント,台湾人 不動産,中国語 不動産仲介,東京 不動産 中国語,繁体字 不動産,華語 不動産,台湾 不動産 東京,中国語対応 住宅購入,中国語 賃貸 購入 東京">
<link rel="canonical" href="https://chouchouinjapan.com/ja.html">
<link rel="alternate" hreflang="ja" href="https://chouchouinjapan.com/ja.html">
<link rel="alternate" hreflang="zh-Hant" href="https://chouchouinjapan.com/">
<link rel="alternate" hreflang="zh-Hans" href="https://chouchouinjapan.com/index-cn.html">
<link rel="alternate" hreflang="x-default" href="https://chouchouinjapan.com/">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="中国語対応の不動産エージェント｜東京｜周周">
<meta property="og:description" content="中国語（繁体字・台湾）対応で、日本での不動産購入・投資・住宅ローン・契約をサポート。">
<meta property="og:url" content="https://chouchouinjapan.com/ja.html">
<meta property="og:image" content="https://chouchouinjapan.com/og-image.jpg">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@type": "RealEstateAgent", "name": "周周・日本の不動産", "url": "https://chouchouinjapan.com/ja.html",
  "image": "https://chouchouinjapan.com/pexels-jakubzerdzicki-29521542.jpg",
  "description": "東京を拠点に活動する台湾出身の不動産エージェント。中国語（繁体字）・台湾語・日本語のトリリンガルで、日本の不動産購入・自宅探し・投資・住宅ローン・ご契約までサポートしています。",
  "areaServed": ["東京", "神奈川", "千葉", "横浜"], "telephone": "03-6451-2540", "email": "s-syu@and-p.jp",
  "address": { "@type": "PostalAddress", "streetAddress": "〒150-0032 東京都渋谷区鶯谷町3-1 ＳＵビル301号", "addressCountry": "JP" },
  "founder": { "@type": "Person", "name": "周欣妤（周周）", "jobTitle": "住宅営業・不動産エージェント", "worksFor": "株式会社アンドプラス 住宅営業部" },
  "sameAs": ["https://www.instagram.com/travelfish67/", "https://www.youtube.com/@travelfish67", "https://www.tiktok.com/@travelfish67", "https://www.threads.com/@travelfish.jp?igshid=NTc4MTIwNjQ2YQ==", "https://lin.ee/RscRWCp"]
})}</script>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&display=swap" rel="stylesheet">
${STYLE}`;

const body = `<header>
  <div class="wrap hd">
    <a class="logo" href="#" onclick="show('home');return false"><span class="mark">周</span><span id="brand">${JA_UI.brand}</span></a>
    <nav class="main" id="mainnav"></nav>
    <div class="hd-right"><a class="btn btn-line" id="lineTop" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a><button class="burger" onclick="document.getElementById('mnav').style.display=document.getElementById('mnav').style.display==='block'?'none':'block'">☰</button></div>
  </div>
  <div class="mnav" id="mnav"></div>
</header>

<main class="wrap">
  <section class="view on" id="v-home">
    <div class="intro intro-cover">
      <div class="cover"><img src="櫻花.jpg" alt="${JA_UI.altSakura}" loading="lazy"></div>
      <div class="intro-body" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <h2 style="font-size:22px;margin-bottom:8px">${JA_UI.heroTitle}</h2>
        <p style="margin-bottom:14px">${JA_UI.heroBody}</p>
        <p style="margin-bottom:14px"><a onclick="show('services');return false" style="display:inline-block;background:var(--rose);color:#fff;padding:9px 18px;border-radius:999px;font-weight:600;cursor:pointer;text-decoration:none;box-shadow:0 3px 10px rgba(244,63,94,.3)">${JA_UI.heroLinkServices}</a></p>
        <p class="area" style="margin-bottom:16px">${JA_UI.heroArea}</p>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <a class="btn btn-line big" id="lineIntro" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a>
          <span class="socs" id="introSocs"></span>
        </div>
      </div>
      <div class="homevid" style="width:180px;flex-shrink:0;aspect-ratio:9/16;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.15);background:#000">
        <div class="ytf" data-id="YwqJo7iZuQI"><img src="https://i.ytimg.com/vi/YwqJo7iZuQI/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/YwqJo7iZuQI/hqdefault.jpg'" alt="${JA_UI.altVideo}" loading="lazy"><span class="pbtn">▶</span></div>
      </div>
      </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:22px">
    <a href="tool-loan-ja.html" style="text-decoration:none;flex:1;min-width:260px"><div style="cursor:pointer;background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;height:100%;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><b style="font-size:18px">${JA_UI.toolCard.title}</b><p style="font-size:14px;color:var(--mut);margin-top:2px">${JA_UI.toolCard.desc}</p></div><span class="btn" style="background:var(--rose);color:#fff">${JA_UI.toolCard.cta}</span></div></a><a href="translate-ja.html" style="text-decoration:none;flex:1;min-width:260px"><div style="cursor:pointer;background:linear-gradient(135deg,#f43f5e,#fb923c);color:#fff;border-radius:18px;padding:20px;height:100%;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div><b style="font-size:18px">${JA_UI.translateCard.title}</b><p style="font-size:14px;opacity:.95;margin-top:2px">${JA_UI.translateCard.desc}</p></div>
      <span class="btn" style="background:#fff;color:var(--rose)">${JA_UI.translateCard.cta}</span>
    </div></a>
    </div>
    <div class="listbanner"><img src="步道.jpg" alt="${JA_UI.altStreet}" loading="lazy"><div class="lb-cap"><span class="lb-t">${JA_UI.listBanner.title}</span><span class="lb-s">${JA_UI.listBanner.sub}</span></div></div>
    <div class="search" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:560px"><input id="q" placeholder="${JA_UI.searchPlaceholder}" oninput="render()" style="width:auto;flex:1;min-width:180px"><span id="catbar"></span></div>
    <div class="grid" id="grid"></div>
    <div class="reviews">
      <h2 class="rev-t">${JA_UI.reviewsTitle}</h2>
      <p class="rev-sub">${JA_UI.reviewsSub}</p>
      <div class="rev-grid">
        ${REVIEWS_JA.map(r => `<div class="rev-card"><div class="rev-stars">★★★★★</div><p class="rev-text">「${r.text}」</p><p class="rev-who">— ${r.who}</p></div>`).join("\n        ")}
      </div>
      <div class="note" style="background:#fffbeb;border:2px solid #f59e0b;max-width:none;margin-top:16px">${JA_UI.reviewsNote}</div>
    </div>
    <div class="cta"><h2>${JA_UI.homeCta.title}</h2><p>${JA_UI.homeCta.body}</p><a class="btn btn-line big" id="lineHome" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div>
  </section>

  <section class="view" id="v-services">
    <h1 class="t">${JA_UI.servicesTitle}</h1>
    <p class="sub">${JA_UI.servicesSub}</p>
    <div class="svcsec">
      ${JA_UI.servicePanels.map(p => `<div class="panel">
        <h2>${p.h}</h2>
        <div class="svc">
          ${p.items.map(it => `<div class="it"><span class="ck">✓</span>${it}</div>`).join("\n          ")}
        </div>
      </div>`).join("\n      ")}
      <div class="panel" style="background:#fffbeb;border-color:#fde68a">
        <h2>${JA_UI.servicePanel4.h}</h2>
        <p style="font-size:14px;color:#57534e;margin-bottom:12px">${JA_UI.servicePanel4.sub}</p>
        <div class="svc">
          ${JA_UI.servicePanel4.items.map(it => `<div class="it" style="background:#fffdf5"><span class="ck">✓</span>${it}</div>`).join("\n          ")}
        </div>
        <p style="font-size:13px;color:var(--mut);margin-top:14px">${JA_UI.servicePanel4.note}</p>
      </div>
    </div>
    <div class="cta" style="margin-top:24px"><h2>${JA_UI.servicesCta}</h2><a class="btn btn-line big" id="lineSvc" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div>
  </section>

  <section class="view" id="v-article"><div class="art" id="artBox"></div></section>

  <section class="view" id="v-process">
    <h1 class="t">${JA_UI.processTitle}</h1><p class="sub">${JA_UI.processSub}</p>
    <div id="steps"></div>
    <div class="cta" style="margin-top:24px"><h2>${JA_UI.processCta}</h2><a class="btn btn-line big" id="lineP" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div>
  </section>

  <section class="view" id="v-live">
    <h1 class="t">${JA_UI.liveTitle}</h1><p class="sub">${JA_UI.liveSub}</p>
    <h3 style="margin-bottom:12px">${JA_UI.liveH3}</h3><div class="svc" id="liveSvc"></div>
    <div class="note" style="background:#eff6ff;border:2px solid #60a5fa">${JA_UI.liveNote}</div>
    <div class="cta" style="margin-top:24px"><h2>${JA_UI.liveCta}</h2><a class="btn btn-line big" id="lineL" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div>
  </section>

  <section class="view" id="v-invest">
    <h1 class="t">${JA_UI.investTitle}</h1><p class="sub">${JA_UI.investSub}</p>
    <h3 style="margin-bottom:12px">${JA_UI.investH3}</h3><div class="svc" id="invSvc"></div>
    <div class="note" style="background:#ecfdf5;border:2px solid #34d399">${JA_UI.investNote}</div>
    <div class="cta" style="margin-top:24px"><h2>${JA_UI.investCta}</h2><a class="btn btn-line big" id="lineI" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div>
  </section>

  <section class="view" id="v-faq"><h1 class="t">${JA_UI.faqTitle}</h1><p class="sub">${JA_UI.faqSub}</p><div id="faqs"></div></section>

  <section class="view" id="v-about">
    <div class="about">
      <div class="panel profile-card">
        <div class="cover"><img src="櫻花.jpg" alt="${JA_UI.altSakura}" loading="lazy"></div>
        <div class="profile">
        <div class="av">周</div>
        <div class="pinfo">
          <h1 class="pname">${JA_UI.aboutTitle}</h1>
          <p class="prole">${JA_UI.aboutRole}</p>
          <div class="areas"><span class="main">${JA_UI.aboutAreas[0]}</span><span>${JA_UI.aboutAreas[1]}</span><span>${JA_UI.aboutAreas[2]}</span><span>${JA_UI.aboutAreas[3]}</span></div>
          <div id="bio"></div>
          <div style="margin-top:18px"><a class="btn btn-line" id="lineA" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a> <span class="socs" id="aboutSocs"></span></div>
        </div>
        <div class="vidcol" style="width:175px;flex-shrink:0;aspect-ratio:9/16;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.15);background:#000">
          <div class="ytf" data-id="YwqJo7iZuQI"><img src="https://i.ytimg.com/vi/YwqJo7iZuQI/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/YwqJo7iZuQI/hqdefault.jpg'" alt="${JA_UI.altVideo}" loading="lazy"><span class="pbtn">▶</span></div>
        </div>
        </div>
      </div>
      <div class="two">
        <div class="panel"><h2 style="margin-bottom:14px;text-align:left">${JA_UI.contactHeading}</h2><p style="text-align:left">LINE ID：<b id="lineId"></b></p><div class="qr"><img id="qr" width="150" height="150" alt="LINE QR"><p style="font-size:12px;color:var(--mut);margin-top:8px">${JA_UI.qrCaption}</p></div></div>
        <div class="panel"><h2 style="margin-bottom:6px;text-align:left">${JA_UI.companyHeading}</h2><div class="coinfo" id="company"></div></div>
      </div>
    </div>
  </section>
</main>
<a class="line-float" id="lineFloat" target="_blank" rel='noopener'><span class="ic">💬</span>${JA_UI.lineBtn}</a>

<footer>
  <div class="wrap row"><div><p style="font-weight:700" id="fName">${JA_UI.brand}</p><p style="font-size:14px;color:var(--mut)">📍 ${JA_UI.footerArea}</p></div><div style="display:flex;align-items:center;gap:8px"><span class="socs" id="footSocs"></span><a class="btn btn-line" id="lineFoot" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div></div>
  <div class="wrap" style="padding:0 16px 10px;display:flex;flex-wrap:wrap;gap:14px;font-size:13px"><a href="feedback-ja.html" style="color:var(--mut)">${JA_UI.footerNav.feedback}</a><a href="tool-loan-ja.html" style="color:var(--mut)">${JA_UI.footerNav.tools}</a><a href="videos-ja.html" style="color:var(--mut)">${JA_UI.footerNav.videos}</a><a href="translate-ja.html" style="color:var(--mut)">${JA_UI.footerNav.translate}</a>
</div><div class="wrap" style="padding:0 16px 12px;font-size:12px;color:var(--mut);line-height:1.85">${JA_UI.footerSeo}</div><div class="wrap cp" id="cp"></div>
</footer>

<script>
const S = ${JSON.stringify({
  brand: JA_UI.brand,
  bio: BIO_JA,
  line: "https://lin.ee/RscRWCp", lineId: "@202dzwok",
  ig: "https://www.instagram.com/travelfish67/", yt: "https://www.youtube.com/@travelfish67", tiktok: "https://www.tiktok.com/@travelfish67", threads: "https://www.threads.com/@travelfish.jp?igshid=NTc4MTIwNjQ2YQ==",
  company: { license: "東京都知事 (2) 第102938号", addr: "〒150-0032 東京都渋谷区鶯谷町3-1 ＳＵビル301号", mobile: "080-7232-9598", tel: "03-6451-2540", fax: "03-6452-5910", email: "s-syu@and-p.jp", hp: "https://and-p.jp" }
})};
const CATS=${JSON.stringify(CATS_JA)};
const ART=${JSON.stringify(ART_JA)};
const PROCESS=${JSON.stringify(PROCESS_JA)};
const LIVE=${JSON.stringify(LIVE_JA)};
const INV=${JSON.stringify(INV_JA)};
const FAQ=${JSON.stringify(FAQ_JA)};
const SLUG=${JSON.stringify(SLUG)};
let curCat=null;
const cat=id=>CATS.find(c=>c.id===id)||{name:"未分類",g:"linear-gradient(135deg,#a8a29e,#d6d3d1)",c:"#a8a29e"};
const ytEmbed=u=>{if(!u)return"";const m=u.match(/(?:youtu\\.be\\/|v=|\\/embed\\/|shorts\\/)([\\w-]{11})/);return m?"https://www.youtube.com/embed/"+m[1]:""};
const cov=a=>{var u=/^https?:\\/\\//.test(a.cover)?a.cover:'https://chouchouinjapan.com/'+a.cover;return a.cover?"background-image:url('"+u+"'),"+cat(a.cat).g+(a.cpos?';background-position:'+a.cpos:''):"background-image:"+cat(a.cat).g;};
function jaHref(a){var u=a.url||(SLUG[a.id]+'.html');return u.replace(/\\.html$/,'-ja.html');}
function socHTML(){let s="";if(S.ig)s+=\`<a href="\${S.ig}" target="_blank" title="Instagram" style="background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)" rel='noopener'>IG</a>\`;if(S.yt)s+=\`<a href="\${S.yt}" target="_blank" title="YouTube" style="background:#ff0000" rel='noopener'>YT</a>\`;if(S.tiktok)s+=\`<a href="\${S.tiktok}" target="_blank" title="TikTok" style="background:#111" rel='noopener'>抖</a>\`;if(S.threads)s+=\`<a href="\${S.threads}" target="_blank" title="Threads" style="background:#111" rel='noopener'>脆</a>\`;return s}
function show(v,id){if(v==='translate'){location.href='translate-ja.html';return;}if(v==='tools'){location.href='tools-ja.html';return;}if(v==='videos'){location.href='videos-ja.html';return;}if(v==='feedback'){location.href='feedback-ja.html';return;}document.querySelectorAll('.view').forEach(e=>e.classList.remove('on'));document.getElementById('v-'+v).classList.add('on');document.querySelectorAll('#mainnav a').forEach(a=>a.classList.toggle('on',a.dataset.v===v));document.getElementById('mnav').style.display='none';if(v==='article'&&id)openArt(id);window.scrollTo({top:0,behavior:'smooth'});}
function setCat(c){curCat=c;const sel=document.getElementById('catSelect');if(sel)sel.value=c||"";show('home');render();}
function lazyCov(){const els=document.querySelectorAll('.cov[data-cov]');const set=el=>{const a=ART.find(x=>x.id===el.dataset.cov);if(a)el.style.cssText=cov(a);};if(!('IntersectionObserver'in window)){els.forEach(set);return;}const io=new IntersectionObserver((ents,o)=>{ents.forEach(e=>{if(e.isIntersecting){set(e.target);o.unobserve(e.target);}});},{rootMargin:'300px'});els.forEach(el=>io.observe(el));}
function render(){const q=(document.getElementById('q').value||"").toLowerCase();const list=ART.filter(a=>(!curCat||a.cat===curCat)&&(!q||(a.title+a.ex+(a.body||[]).join("")+a.tags.join("")).toLowerCase().includes(q))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));document.getElementById('grid').innerHTML=list.map(a=>\`<a class="card" href="\${jaHref(a)}"><div class="cov" data-cov="\${a.id}" style="background-image:\${cat(a.cat).g}">\${a.video?'<span class="vbadge">▶ 動画</span>':''}</div><div class="body"><span class="tagcat" style="background:\${cat(a.cat).c}">\${cat(a.cat).name}</span><h3>\${a.title}</h3><p class="ex">\${a.ex}</p><p class="meta">\${a.date}</p></div></a>\`).join("")||'<p style="color:var(--mut)">${JA_UI.noResults}</p>';lazyCov();}
function openArt(id){const a=ART.find(x=>x.id===id);if(!a)return;const em=ytEmbed(a.video);document.getElementById('artBox').innerHTML=\`<span class="back" onclick="show('home')">${JA_UI.backToList}</span><div class="acov" style="\${cov(a)}"><span>\${cat(a.cat).name}</span></div><h1 class="atitle">\${a.title}</h1><div class="am"><span>${JA_UI.byline}</span><span>\${a.date}</span></div><p>\${a.ex}</p>\${em?\`<div class="vid"><iframe src="\${em}" allowfullscreen></iframe></div>\`:''}<div class="ablock"><div><b>${JA_UI.articleHelpful}</b><br><span style="color:var(--mut);font-size:14px">${JA_UI.articleHelpfulSub}</span></div><a class="btn btn-line" href="\${S.line}" target="_blank" rel='noopener'>${JA_UI.lineBtn}</a></div>\`;}

document.getElementById('brand').textContent=S.brand;document.getElementById('fName').textContent=S.brand;
const TOOLDD='<div class="navdd"><button class="navdd-b">${JA_UI.navddTool}</button><div class="navdd-m">'+${JSON.stringify(JA_UI.tools)}.map(function(t){return '<a href="'+t[1]+'">'+t[0]+'</a>';}).join("")+'</div></div>';
const SVCDD=\`<div class="navdd"><button class="navdd-b">${JA_UI.navddSvc}</button><div class="navdd-m"><a onclick="show('services');return false">${JA_UI.nav.services}</a><a onclick="show('process');return false">${JA_UI.nav.process}</a><a onclick="show('live');return false">${JA_UI.nav.live}</a><a onclick="show('invest');return false">${JA_UI.nav.invest}</a></div></div>\`;
document.getElementById('mainnav').innerHTML=\`<a data-v="home" onclick="show('home');return false">${JA_UI.nav.home}</a>\${SVCDD}\${TOOLDD}<a onclick="show('translate');return false">${JA_UI.nav.translate}</a><a onclick="show('videos');return false">${JA_UI.nav.videos}</a><a data-v="faq" onclick="show('faq');return false">${JA_UI.nav.faq}</a><a data-v="about" onclick="show('about');return false">${JA_UI.nav.about}</a><a onclick="show('feedback');return false">${JA_UI.nav.feedback}</a>\`;
document.getElementById('mnav').innerHTML=\`<a onclick="show('home');return false">${JA_UI.nav.home}</a><span class="mlabel">${JA_UI.mobileLabels.services}</span><a onclick="show('services');return false">　${JA_UI.nav.services}</a><a onclick="show('process');return false">　${JA_UI.nav.process}</a><a onclick="show('live');return false">　${JA_UI.nav.live}</a><a onclick="show('invest');return false">　${JA_UI.nav.invest}</a><span class="mlabel">${JA_UI.mobileLabels.tools}</span>\`+${JSON.stringify(JA_UI.tools)}.map(function(t){return '<a href="'+t[1]+'">　'+t[0]+'</a>';}).join("")+\`<a onclick="show('translate');return false">${JA_UI.nav.translate}</a><a onclick="show('videos');return false">${JA_UI.nav.videos}</a><a onclick="show('faq');return false">${JA_UI.nav.faq}</a><a onclick="show('about');return false">${JA_UI.nav.about}</a><a href="feedback-ja.html">${JA_UI.nav.feedback}</a><a href="\${S.line}" target="_blank" style="color:var(--green-d)" rel='noopener'>${JA_UI.lineBtn}</a>\`;
document.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('.ytf');if(f&&!f.dataset.l){f.dataset.l=1;f.innerHTML='<iframe src="https://www.youtube.com/embed/'+f.dataset.id+'?autoplay=1" title="${JA_UI.altVideo}" allow="autoplay;fullscreen" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>';}});
document.getElementById('catbar').innerHTML=\`<select class="catsel" id="catSelect" onchange="setCat(this.value||null)"><option value="">${JA_UI.catAll}</option>\`+CATS.map(c=>\`<option value="\${c.id}">\${c.name}</option>\`).join("")+\`</select>\`;
['lineTop','lineIntro','lineHome','lineP','lineL','lineI','lineA','lineFoot','lineSvc','lineFloat'].forEach(i=>{const e=document.getElementById(i);if(e)e.href=S.line;});
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a&&a.href&&a.href.indexOf("lin.ee")>-1&&typeof gtag==="function"){gtag("event","line_click",{link_id:a.id||"",page:location.pathname});}});
document.getElementById('introSocs').innerHTML=socHTML();document.getElementById('aboutSocs').innerHTML=socHTML();document.getElementById('footSocs').innerHTML=socHTML();
document.getElementById('bio').innerHTML=S.bio.map(p=>\`<p style="margin-bottom:12px;color:#44403c">\${p}</p>\`).join("");
document.getElementById('lineId').textContent=S.lineId;
document.getElementById('qr').src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data="+encodeURIComponent(S.line);
const c=S.company;const ci=(l,v)=>\`<div class="ci"><span class="cl">\${l}</span><span class="cv">\${v}</span></div>\`;document.getElementById('company').innerHTML=ci('${JA_UI.companyLabels.company}','株式会社アンドプラス')+ci('${JA_UI.companyLabels.advisor}','周 欣妤 ／ Syu ShinYu ／ シュウ シンユウ')+ci('${JA_UI.companyLabels.license}',c.license)+ci('${JA_UI.companyLabels.addr}',c.addr)+ci('${JA_UI.companyLabels.mobile}',\`<a href="tel:\${c.mobile.replace(/[^0-9]/g,"")}">\${c.mobile}</a>\`)+ci('${JA_UI.companyLabels.tel}',\`<a href="tel:\${c.tel.replace(/[^0-9]/g,"")}">\${c.tel}</a>\`)+ci('${JA_UI.companyLabels.fax}',c.fax)+ci('${JA_UI.companyLabels.email}',\`<a href="mailto:\${c.email}">\${c.email}</a>\`)+ci('${JA_UI.companyLabels.hp}',\`<a href="\${c.hp}" target="_blank" rel='noopener'>\${c.hp}</a>\`);
document.getElementById('cp').textContent="© "+new Date().getFullYear()+" "+S.brand;
document.getElementById('steps').innerHTML=PROCESS.map((s,i)=>\`<div class="step"><span class="n">\${i+1}</span><div><h3>\${s[0]}</h3><p style="color:var(--mut);font-size:14px">\${s[1]}</p></div></div>\`).join("");
document.getElementById('liveSvc').innerHTML=LIVE.map(t=>\`<div class="it"><span class="ck">✓</span>\${t}</div>\`).join("");
document.getElementById('invSvc').innerHTML=INV.map(t=>\`<div class="it"><span class="ck">✓</span>\${t}</div>\`).join("");
document.getElementById('faqs').innerHTML=FAQ.map(q=>\`<details class="faq"><summary>Q：\${q[0]}</summary><p>A：\${q[1]}</p></details>\`).join("");
render();
</script>

<!--langswitch--><script>(function(){var p=location.pathname.split('/').pop()||'index.html';var isJa=(p==='ja.html');var isCn=(!isJa&&p.slice(-8)==='-cn.html');var twHref,cnHref;if(isJa){twHref='index.html';cnHref='index-cn.html';}else if(isCn){twHref=p.slice(0,-8)+'.html';cnHref=p;}else{twHref=p;cnHref=p.slice(0,-5)+'-cn.html';}var jaHrefSw='ja.html';var cur=isJa?'ja':(isCn?'cn':'tw');function mk(label,href,key){var a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.textContent=label;a.setAttribute('data-lang',key);var active=(key===cur);a.style.cssText='display:block;padding:9px 14px;font-size:14px;text-decoration:none;border-radius:8px;white-space:nowrap;'+(active?'color:#f43f5e;font-weight:700;background:#fff1f2':'color:#292524');if(active)a.setAttribute('aria-current','page');return a;}var wrap=document.createElement('div');wrap.style.cssText='position:relative;flex:0 0 auto';var btn=document.createElement('button');btn.type='button';btn.textContent='🌐 語言';btn.setAttribute('aria-label','切換語言 / Language / 语言');btn.style.cssText='background:#fff;border:1px solid #e7e5e4;border-radius:999px;font-size:13px;font-weight:700;color:#57534e;padding:6px 12px;cursor:pointer;font-family:inherit;white-space:nowrap';var menu=document.createElement('div');menu.style.cssText='display:none;position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #e7e5e4;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px;min-width:130px;z-index:200';menu.appendChild(mk('繁體中文',twHref,'tw'));menu.appendChild(mk('简体中文',cnHref,'cn'));menu.appendChild(mk('日本語',jaHrefSw,'ja'));btn.onclick=function(e){e.stopPropagation();menu.style.display=(menu.style.display==='block')?'none':'block';};document.addEventListener('click',function(){menu.style.display='none';});wrap.appendChild(btn);wrap.appendChild(menu);function insertInto(container,beforeEl){if(beforeEl&&beforeEl.parentNode===container){container.insertBefore(wrap,beforeEl);}else{container.appendChild(wrap);}}var hdRight=document.querySelector('header .hd-right');if(hdRight){var line2=hdRight.querySelector('.btn-line');insertInto(hdRight,line2);return;}var sbarRow=document.querySelector('.sbar .wrap')||document.querySelector('.sbar .in');if(sbarRow){sbarRow.appendChild(wrap);return;}wrap.style.cssText+=';position:fixed;top:10px;right:12px;z-index:210';document.body.appendChild(wrap);})();</script>`;

fs.writeFileSync(ROOT + "/ja.html", head + "\n" + body + "\n");
console.log("ja.html 已產生（完整版 SPA，" + ART_JA.length + " 篇文章）");
