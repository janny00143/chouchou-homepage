/* ============================================================
   物件專區 資料檔  —  周周可以自己編輯這個檔案
   ------------------------------------------------------------
   ▍怎麼新增一個物件？
     1. 複製一整段（從 { 到 }, ），貼到 window.PROPERTIES = [ 的正下方
     2. 把每個欄位冒號後面的內容換成你的物件資料
     3. 物件照片上傳到網站根目錄，photos 填檔名（第一張=封面，其餘會進相簿）
     4. 存檔上傳，物件就會自動出現在「物件專區」頁（繁中／簡中自動同步）

   ▍欄位
     id / status(在售·洽談中·已成約) / cat(invest投資收租·live自住·house一戶建·land土地)
     title / price / location / station / layout / size / age / facing / mgmt / right
     yield(投資物件才填) / photos([...]) / note(周周的一句話推薦)

   ▍最省事：用「物件登錄小工具」後台 chouchouinjapan.com/admin/ 貼資料自動辨識、產生這個檔。
   ============================================================ */

window.PROPERTIES = [

  {
    id: "togoshi701",
    status: "在售",
    cat: "live",
    title: "ジェイパーク戸越公園アーキテクト 701（品川・戶越公園 2LDK+DEN・三面採光角戶）",
    price: "12,998万円",
    location: "東京都品川區戶越6-19-14",
    station: "大井町線「戶越公園」站 徒步3分／大井町線・淺草線「中延」站 徒步5分／池上線「荏原中延」站 徒步7分／橫須賀線・湘南新宿線「西大井」站 徒步9分",
    layout: "2LDK+DEN+W",
    size: "76.00㎡（約22.99坪）",
    age: "築26年（2000年8月）",
    facing: "角住戶・三面採光（10樓建的7樓）",
    mgmt: "管理費17,330円＋修繕積立金25,300円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-togoshi701-1.jpg","prop-togoshi701-2.jpg","prop-togoshi701-3.jpg","prop-togoshi701-4.jpg","prop-togoshi701-5.jpg","prop-togoshi701-6.jpg"],
    note: "2026年6月剛完成全室翻新的三面採光角戶，約16.5帖的大客廳加獨立DEN，還有兩面Roof Balcony、視野開闊。戶越公園站徒步3分、戶越銀座商店街就在生活圈，買菜吃飯都方便，可帶寵物（依管理規約）、附監視器自動鎖與宅配箱。這種地段＋格局的組合不常見，想看房加LINE我幫你安排（可貸成數依銀行審查為準）。"
  },

  {
    id: "yotsuya115",
    status: "在售",
    cat: "live",
    title: "ルート四谷三丁目 115（新宿・四谷 1LDK・南向角戶・全新翻新）",
    price: "6,498万円",
    location: "東京都新宿區大京町19",
    station: "丸之內線「四谷三丁目」站 徒步7分／總武中央線「信濃町」站 徒步10分／大江戶線「國立競技場」站 徒步10分",
    layout: "1LDK+W",
    size: "41.40㎡（約12.52坪）",
    age: "築27年（1999年3月）",
    facing: "南向・角住戶",
    mgmt: "管理費10,300円＋修繕積立金6,200円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-yotsuya115-1.jpg","prop-yotsuya115-2.jpg","prop-yotsuya115-3.jpg","prop-yotsuya115-4.jpg","prop-yotsuya115-5.jpg","prop-yotsuya115-6.jpg"],
    note: "新宿區大京町、離新宿通一條巷子的閑靜住宅區，南向角戶每個房間都有開窗、通風採光好。全新翻新含大容量WIC、食洗機、浴室乾燥機，超市徒步1分。四谷三丁目生活圈兼顧便利與安靜，很適合都心自住（此戶寵物不可；大樓修繕與管理費用以最新公告為準）。想了解詳情加LINE聊聊。"
  },

  {
    id: "kameido209",
    status: "在售",
    cat: "live",
    title: "ハイネス亀戸 209（江東・龜戶 2LDK・全新翻新）",
    price: "3,480万円",
    location: "東京都江東區龜戶7-39-26",
    station: "總武中央線・東武龜戶線「龜戶」站 徒步13分／都營新宿線「大島」站 徒步14分",
    layout: "2LDK+W",
    size: "49.61㎡（約15.01坪）",
    age: "築47年（1979年9月）",
    facing: "",
    mgmt: "管理費12,200円＋修繕積立金7,340円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-kameido209-1.jpg","prop-kameido209-2.jpg","prop-kameido209-3.jpg","prop-kameido209-4.jpg","prop-kameido209-5.jpg","prop-kameido209-6.jpg"],
    note: "3千萬円出頭就能入手的東京2LDK翻新宅：北歐風木質內裝、對面式廚房加新設WIC，食洗機、浴室乾燥、追焚都有。OK超市徒步1分，龜戶中央公園等綠地就在附近。屋齡雖較長，但修繕紀錄扎實、內裝全面換新（此戶寵物不可）。預算有限又想在東京買自住房的話，這戶很值得看，加LINE我帶你評估（可貸成數依銀行審查為準）。"
  },

  {
    id: "suginami308",
    status: "在售",
    cat: "live",
    title: "イニシアイオ杉並和泉 308（杉並・和泉 1LDK 全新翻新）",
    price: "6,999万円",
    location: "東京都杉並區和泉2-27-1",
    station: "京王線「代田橋」站 徒步5分／京王線・井之頭線「明大前」站 徒步12分",
    layout: "1LDK",
    size: "48.36㎡（約14.62坪）",
    age: "築14年（2011年1月）",
    facing: "",
    mgmt: "管理費14,800円＋修繕積立金16,300円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-suginami308-1.jpg","prop-suginami308-2.jpg","prop-suginami308-3.jpg","prop-suginami308-4.jpg","prop-suginami308-5.jpg","prop-suginami308-6.jpg"],
    note: "2024年剛完成大規模修繕的翻新住宅，地板、廚房、衛浴、壁紙全部換新，屋況乾淨可直接入住，還能帶寵物（限2隻）。代田橋站徒步5分、2站2線，環境安靜又方便。想看細節或試算貸款，加LINE我幫你把關（可貸成數依銀行審查為準）。"
  },

  {
    id: "ikebukuro1101",
    status: "在售",
    cat: "live",
    title: "日神パレステージ西池袋 1101（池袋 1LDK・最上階角戶・全新翻新）",
    price: "5,199万円",
    location: "東京都豐島區西池袋2-43-5",
    station: "「池袋」站 徒步3分（JR各線）／東京Metro丸之內・有樂町・副都心線 徒步5分",
    layout: "1LDK",
    size: "31.89㎡（約9.64坪）",
    age: "築29年（1996年9月）",
    facing: "最上階・角住戶",
    mgmt: "管理費9,300円＋修繕積立金5,450円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-ikebukuro1101-1.jpg","prop-ikebukuro1101-2.jpg","prop-ikebukuro1101-3.jpg","prop-ikebukuro1101-4.jpg","prop-ikebukuro1101-5.jpg","prop-ikebukuro1101-6.jpg"],
    note: "最上階×角戶、池袋站徒步3分的稀有翻新物件，地板、廚房、衛浴、壁紙全新並附新冷氣。走路就到LUMINE、東武、西武百貨，生活機能極佳。屋齡較長但已全面翻新、屋況新穎（此戶寵物不可）。想看房或談貸款，加LINE我幫你評估。"
  },

  {
    id: "minamiazabu205",
    status: "在售",
    cat: "live",
    title: "ルモンド南麻布 205（南麻布 1DK・麻布十番徒步7分・全新翻新）",
    price: "7,699万円",
    location: "東京都港區南麻布2-2-4",
    station: "「麻布十番」站 徒步7分（大江戶線・南北線）／「白金高輪」站 徒步10分（三田線）",
    layout: "1DK",
    size: "31.84㎡（約9.63坪）",
    age: "築24年（2001年2月）",
    facing: "",
    mgmt: "管理費7,115円＋修繕積立金7,900円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-minamiazabu205-1.jpg","prop-minamiazabu205-2.jpg","prop-minamiazabu205-3.jpg","prop-minamiazabu205-4.jpg","prop-minamiazabu205-5.jpg","prop-minamiazabu205-6.jpg"],
    note: "南麻布精華地段、麻布十番徒步7分的翻新住宅，地段保值、環境高級又安靜，可帶寵物（限1隻）。屋況全新、可直接入住，很適合想在都心置產或自住的你。想了解行情與貸款試算，加LINE我幫你評估（實際稅費請由稅理士確認）。"
  },

  {
    id: "taito703",
    status: "在售",
    cat: "live",
    title: "スカーラ台東根岸 703（根岸 1SLDK・三之輪徒步2分・全新翻新）",
    price: "7,499万円",
    location: "東京都台東區根岸5-25-11",
    station: "日比谷線「三之輪」站 徒步2分／「南千住」站 徒步10分（常磐線・筑波快線）",
    layout: "1SLDK",
    size: "56.48㎡（約17.08坪）",
    age: "築26年（1999年11月）",
    facing: "",
    mgmt: "管理費9,900円＋修繕積立金13,440円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-taito703-1.jpg","prop-taito703-2.jpg","prop-taito703-3.jpg","prop-taito703-4.jpg","prop-taito703-5.jpg","prop-taito703-6.jpg"],
    note: "三之輪站徒步2分、少見的1SLDK大空間翻新住宅，多一間可彈性運用的服務房（S房）。位於7樓、採光視野好，屋況全新。生活機能成熟、交通方便，適合想要多一點空間的自住買家。想看房或了解貸款、稅費，加LINE我全程中文幫你把關。"
  },

  {
    id: "nippori403",
    status: "在售",
    cat: "live",
    title: "ラ・グラース日暮里 403（東日暮里 2LDK・築7年較新・鶯谷徒步6分）",
    price: "7,299万円",
    location: "東京都荒川區東日暮里4-36-27",
    station: "「鶯谷」站 徒步6分（山手線・京濱東北線）／「入谷」站 徒步10分（日比谷線）",
    layout: "2LDK",
    size: "54.28㎡（約16.42坪）",
    age: "築7年（2018年3月）",
    facing: "",
    mgmt: "管理費27,040円＋修繕積立金11,280円／月",
    right: "所有權",
    yield: "",
    photos: ["prop-nippori403-1.jpg","prop-nippori403-2.jpg","prop-nippori403-3.jpg","prop-nippori403-4.jpg","prop-nippori403-5.jpg","prop-nippori403-6.jpg"],
    note: "這幾間裡屋齡最新（2018年）的2LDK，總戶數少、管理單純，可帶貓狗（共2隻）。位於山手線圈內、鶯谷站徒步6分，離上野很近。格局方正、屋況新，適合想要新一點的自住買家。想看房或評估貸款，加LINE我幫你安排（可貸條件依個案、依銀行審查為準）。"
  },

  /* ===== 以下為投資（收益）物件：1樓店舗/事務所，現況多為出租中 ===== */
  {
    id: "koenji102", status: "在售", cat: "invest",
    title: "シャンボール新高円寺 102（高圓寺・1樓店舗・現況出租）",
    price: "3,080万円",
    location: "東京都杉並區高圓寺南2-1-4",
    station: "東京Metro丸之內線「東高圓寺」站 徒步5分／「新高圓寺」站 徒步6分",
    layout: "店舗（1樓路面店）",
    size: "64.83㎡（登記）",
    age: "築55年（1971年）",
    facing: "", mgmt: "管理費20,400円＋修繕積立金28,200円／月", right: "所有權",
    yield: "表面6.42%（現況出租中）",
    photos: ["prop-koenji102-1.jpg","prop-koenji102-2.jpg"],
    note: "青梅街道旁的1樓路面店、3站3線，現況出租中（附租約），表面利回6.42%。表面利回是未扣稅費、管理費前的毛數字，實際到手依租況與費用而定，投資有風險、不保證報酬。想看租約與收支明細，加LINE我幫你確認。"
  },
  {
    id: "kagurazaka101", status: "在售", cat: "invest",
    title: "ウィンコート神楽坂 B-101（神樂坂・可餐飲店舗・現況出租）",
    price: "3,080万円",
    location: "東京都新宿區南山伏町3-5",
    station: "都營大江戶線「牛込柳町」站 徒步5分／「牛込神樂坂」站 徒步6分",
    layout: "店舗・事務所（地下1樓）",
    size: "30.61㎡（登記）",
    age: "築37年（1989年）",
    facing: "", mgmt: "管理費8,600円＋修繕積立金5,800円／月", right: "所有權",
    yield: "表面4.87%（現況出租中）",
    photos: ["prop-kagurazaka101-1.jpg","prop-kagurazaka101-2.jpg"],
    note: "神樂坂區域、可做餐飲的店舗，現況出租中，表面利回4.87%。表面利回未扣費用，實際依租況而定、不保證報酬。想了解租約與周邊行情，加LINE我幫你評估。"
  },
  {
    id: "kitasenju106", status: "在售", cat: "invest",
    title: "北千住第三ダイヤモンドマンション 106・107（北千住・1樓店舗・2戶一併）",
    price: "2,780万円",
    location: "東京都足立區日之出町39-13",
    station: "JR常磐線「北千住」站 徒步7分",
    layout: "店舗（106・107 兩戶一併）",
    size: "46.18㎡（合計・登記）",
    age: "築44年（1982年）",
    facing: "", mgmt: "管理費11,320円＋修繕積立金16,980円／月（兩戶合計）", right: "所有權",
    yield: "表面6.04%（現況出租中）",
    photos: ["prop-kitasenju106-1.jpg","prop-kitasenju106-2.jpg"],
    note: "北千住徒步7分的1樓路面店（兩戶一起賣），2015年起長期出租中（照護事業承租），表面利回6.04%。表面利回未扣費用、依租況而定、不保證報酬。想看租約細節加LINE。"
  },
  {
    id: "nishiarai101", status: "在售", cat: "invest",
    title: "セントラルマンション西新井 101（西新井・1樓店舗・現況出租）",
    price: "2,350万円",
    location: "東京都足立區西新井本町2-8-14",
    station: "日暮里舍人線「江北」站 徒步6分／東武大師線「大師前」站 徒步10分",
    layout: "店舗（1樓路面店）",
    size: "55.39㎡（登記）",
    age: "築41年（1985年）",
    facing: "", mgmt: "管理費10,400円＋修繕積立金18,480円／月", right: "所有權",
    yield: "表面7.02%（現況出租中）",
    photos: ["prop-nishiarai101-1.jpg","prop-nishiarai101-2.jpg"],
    note: "巴士通旁的1樓路面店，現況出租中（照護事務所承租），此案表面利回較高、7.02%。表面利回未扣費用、依租況而定、不保證報酬；想看租約與收支加LINE。"
  },
  {
    id: "asakusa104", status: "在售", cat: "invest",
    title: "ドムール浅草 II 104（淺草・觀光區1樓店舗・現況出租）",
    price: "6,880万円",
    location: "東京都台東區淺草2-16-7",
    station: "筑波快線「淺草」站 徒步3分／東武伊勢崎線「淺草」站 徒步10分",
    layout: "店舗（1樓路面店）",
    size: "38.39㎡（登記）",
    age: "築25年（2001年）",
    facing: "", mgmt: "管理費7,500円＋修繕積立金11,830円／月", right: "所有權",
    yield: "表面5.40%（現況出租中）",
    photos: ["prop-asakusa104-1.jpg","prop-asakusa104-2.jpg"],
    note: "緊鄰「淺草花屋敷」的觀光地1樓路面店，人潮多、可輕餐飲，現況出租中（皮件販售承租），表面利回5.40%。表面利回未扣費用、依租況而定、不保證報酬。想看租約加LINE。"
  },
  {
    id: "okachimachi101", status: "在售", cat: "invest",
    title: "ダイアパレス御徒町 V 101（御徒町・1樓店舗・現況出租）",
    price: "8,780万円",
    location: "東京都台東區台東3-17-1",
    station: "東京Metro日比谷線「仲御徒町」站 徒步3分／JR「御徒町」站 徒步7分",
    layout: "店舗（1樓路面店）",
    size: "36.16㎡（登記）",
    age: "築31年（1995年）",
    facing: "", mgmt: "管理費9,900円＋修繕積立金8,530円／月", right: "所有權",
    yield: "表面5.41%／實質4.59%（現況出租中）",
    photos: ["prop-okachimachi101-1.jpg","prop-okachimachi101-2.jpg"],
    note: "御徒町珠寶批發街、阿美橫町徒步圈的1樓路面店，現況出租中，表面利回5.41%（實質約4.59%）。表面利回未扣費用、依租況而定、不保證報酬。想看租約與費用明細加LINE。"
  },
  {
    id: "sendaizaka201", status: "在售", cat: "invest",
    title: "ソレール仙台坂 201・202（大井町・店舗事務所・現況出租）",
    price: "1億2,300万円",
    location: "東京都品川區東大井5-26-26",
    station: "京急本線「青物橫丁」站 徒步7分／JR・東急・臨海線「大井町」站 徒步6分",
    layout: "店舗・事務所（201・202 兩戶）",
    size: "150.07㎡（合計・登記）",
    age: "築42年（1984年）",
    facing: "", mgmt: "管理費28,200円＋修繕積立金29,400円／月", right: "所有權",
    yield: "表面6.00%（現況出租中）",
    photos: ["prop-sendaizaka201-1.jpg","prop-sendaizaka201-2.jpg"],
    note: "再開發中的大井町、3線可用，店舗事務所可併用，現況出租中，表面利回6.00%。新耐震標準。表面利回未扣費用、依租況而定、不保證報酬。想看租約細節加LINE。"
  },
  {
    id: "honancho101", status: "在售", cat: "invest",
    title: "エヴェナール方南町 101（方南町・大面積1樓店舗事務所・現況出租）",
    price: "2億9,800万円",
    location: "東京都杉並區堀之內1-10-5",
    station: "東京Metro丸之內線「方南町」站 徒步7分（直達新宿11分）",
    layout: "店舗・事務所（1樓・約100坪）",
    size: "331.86㎡（公簿・約100.38坪）",
    age: "築40年（1986年・新耐震）",
    facing: "", mgmt: "管理費53,000円＋修繕積立金108,030円／月", right: "所有權",
    yield: "表面7.30%（現況出租中）",
    photos: ["prop-honancho101-1.jpg","prop-honancho101-2.jpg"],
    note: "方南通旁、大面寬玻璃帷幕的1樓大型店舗事務所（約100坪），現況出租中，表面利回7.30%。表面利回未扣費用、依租況而定、不保證報酬。大型收益物件，想看租約與收支加LINE我幫你把關。"
  },
  {
    id: "toyocho102", status: "在售", cat: "invest",
    title: "ライオンズマンション東陽町第3 -102（東陽町・大型1樓店舗・現況出租）",
    price: "2億9,900万円",
    location: "東京都江東區南砂2-2-11",
    station: "東京Metro東西線「東陽町」站 徒步6分／「南砂町」站 徒步7分",
    layout: "店舗（1樓・約94坪）",
    size: "311.76㎡（公簿・約94.30坪）",
    age: "築40年（1986年）",
    facing: "", mgmt: "管理費39,000円＋修繕積立金48,590円／月", right: "所有權",
    yield: "表面5.29%（2026年8月起約5.65%・現況出租中）",
    photos: ["prop-toyocho102-1.jpg","prop-toyocho102-2.jpg"],
    note: "永代通旁的大型1樓店舗，現況出租中（認可幼兒園承租），表面利回5.29%，2026年8月起租金調升後約5.65%。表面利回未扣費用、依租況而定、不保證報酬。想看租約加LINE。"
  },
  {
    id: "shinjuku101", status: "在售", cat: "invest",
    title: "フォルム新宿 101（東新宿・1樓店舗事務所・空室可自用）",
    price: "3,680万円",
    location: "東京都新宿區新宿7-12-5",
    station: "東京Metro副都心線・都營大江戶線「東新宿」站 徒步4分",
    layout: "店舗・事務所（1樓路面店）",
    size: "20.17㎡（含地下室約3.9㎡）",
    age: "築44年（1982年）",
    facing: "", mgmt: "管理費8,710円＋修繕積立金9,045円／月", right: "所有權",
    yield: "想定表面5.02%（現況空室）",
    photos: ["prop-shinjuku101-1.jpg","prop-shinjuku101-2.jpg","prop-shinjuku101-3.jpg"],
    note: "東新宿徒步4分的1樓路面店，可重餐飲，現況空室，投資出租或自己使用都可以，想定表面利回5.02%。想定利回為假設出租下的毛數字、不保證實現。想看現場或談用途加LINE。"
  }

];
