/* ============================================================
   物件專區 資料檔  —  周周可以自己編輯這個檔案
   ------------------------------------------------------------
   ▍怎麼新增一個物件？
     複製一整段（從大括號開始到結束逗號），貼到陣列的正下方，
     把每個欄位冒號後面的內容換成你的物件資料；照片上傳到網站根目錄、
     photos 填檔名（第一張=封面，其餘會進相簿）。存檔上傳即自動出現。

   ▍欄位
     id / status(在售·洽談中·已成約) / cat(invest投資收租·live自住·house一戶建·land土地)
     title(日文物件名) / title_cn(中文名，一覽頁顯示這個) / price / location / station
     layout / size / age / facing / mgmt / right / yield(投資才填) / photos([...]) / note(周周推薦)

   ▍最省事：用「物件登錄小工具」後台 chouchouinjapan.com/admin/ 貼資料自動辨識、產生這個檔。
   ============================================================ */

window.PROPERTIES = [

  {
    id: "togoshi701",
    status: "在售",
    cat: "live",
    title: "ジェイパーク戸越公園アーキテクト 701",
    title_cn: "戶越公園 三面採光角戶",
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
    title: "ルート四谷三丁目 115",
    title_cn: "四谷三丁目 南向角戶",
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
    title: "ハイネス亀戸 209",
    title_cn: "龜戶 北歐風翻新兩房",
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
    title: "イニシアイオ杉並和泉 308",
    title_cn: "杉並和泉 翻新一房",
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
    title: "日神パレステージ西池袋 1101",
    title_cn: "西池袋 頂樓角戶",
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
    title: "ルモンド南麻布 205",
    title_cn: "南麻布 精華翻新宅",
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
    title: "スカーラ台東根岸 703",
    title_cn: "台東根岸 大空間三房",
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
    title: "ラ・グラース日暮里 403",
    title_cn: "東日暮里 築淺兩房",
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

  {
    id: "kameido2",
    status: "在售",
    cat: "invest",
    title: "（仮称）亀戸2丁目 新築マンション（一棟）",
    title_cn: "龜戶2丁目 新築整棟收益",
    price: "4億4,000万円",
    location: "東京都江東區龜戶2丁目44-4",
    station: "JR中央總武線・東武龜戶線「龜戶」站 徒步7分",
    layout: "整棟7層（3～7F 1LDK×5戶＋1F・2F 店舗×2）",
    size: "土地66.26㎡（約20.04坪）／延床335.61㎡（約101.52坪）",
    age: "2026年6月完工（新築）",
    facing: "",
    mgmt: "",
    right: "土地・建物 所有權",
    yield: "表面約4.61%（滿租試算・年租金約2,028万円）",
    photos: ["prop-kameido2-1.jpg","prop-kameido2-2.jpg","prop-kameido2-3.jpg"],
    note: "蔵前橋通旁、龜戶天神商圈的新築整棟收益物件（RC造7層）：1～2樓店舗＋3～7樓1LDK共7戶，2026年6月完工，附電梯、自動鎖、宅配箱。表面利回約4.61%為滿租試算、未扣稅費與空置，實際到手依租況與費用而定、不保證報酬。整棟持有、土地建物皆所有權，適合想要一整棟收益宅的買家（第一張為建築完工示意圖）。要詳細租金表、收支與貸款試算，加LINE我幫你把關（可貸成數依銀行審查為準）。"
  },

  {
    id: "ryogoku2",
    status: "在售",
    cat: "invest",
    title: "両国二丁目ビル（一棟）",
    title_cn: "兩國 整棟旅館收益",
    price: "3億1,580万円",
    location: "東京都墨田區兩國二丁目6-9",
    station: "JR總武中央線・都營大江戶線「兩國」站 徒步8分",
    layout: "整棟5層（1F 洗衣店・2～5F 旅館4戶）",
    size: "土地58.97㎡（約17.84坪）／延床240.41㎡",
    age: "築38年（1988年1月・已整修）",
    facing: "",
    mgmt: "",
    right: "土地・建物 所有權",
    yield: "想定約12.41%（含旅館＋店舗、滿租試算）",
    photos: ["prop-ryogoku-1.jpg","prop-ryogoku-2.jpg","prop-ryogoku-3.jpg","prop-ryogoku-4.jpg","prop-ryogoku-5.jpg","prop-ryogoku-6.jpg"],
    note: "兩國站徒步8分的整棟收益大樓（RC造5層）：1樓為出租中的自助洗衣店（月租16.5万円），2～5樓為旅館4戶（旅館業許可申請中、附旅館業管理契約）。外牆與防水已重做、內裝全面翻新。想定年收益約3,919万円、想定利回約12.41%（含旅館營運試算、未保證，實際依營運與空置而定）。整棟土地建物皆所有權，適合想要一棟旅館型收益的買家。詳細營運試算與貸款，加LINE我幫你評估（可貸成數依銀行審查為準）。"
  },

  {
    id: "asakusa3",
    status: "在售",
    cat: "invest",
    title: "浅草三丁目ビル（旅館一棟・SunRise Stay）",
    title_cn: "淺草三丁目 旅館一棟",
    price: "3億円",
    location: "東京都台東區淺草三丁目42番4號（淺草寺・國際通り一帶）",
    station: "つくばエクスプレス（筑波快線）「淺草」站 徒步約13分",
    layout: "鋼骨造整棟5層（總5戶）：1樓事務所、2～4樓旅館客房、5樓",
    size: "土地實測 59.89㎡（約18.11坪）／建物延床 190.31㎡（約57.6坪）",
    age: "1982年築（昭和57年・屋齡約44年）・已整修完成（リフォーム済）",
    facing: "商業地域・防火地域（建蔽率80%／容積率700%）",
    mgmt: "整棟自主管理（無管理費・修繕基金）",
    right: "所有權（土地・建物皆所有權）",
    yield: "想定約11%／實質約6%（自營民泊試算・不保證報酬）",
    photos: ["prop-asakusa3-1.jpg","prop-asakusa3-2.jpg","prop-asakusa3-3.jpg","prop-asakusa3-4.jpg","prop-asakusa3-5.jpg","prop-asakusa3-6.jpg"],
    note: "淺草觀光圈、緊鄰つくばエクスプレス淺草站的整棟收益物件：鋼骨造5層、延床約190㎡（約57.6坪），內部已整修完成（リフォーム済）。<b>已取得旅館業（旅館・ホテル營業）許可</b>，2～4樓為旅館客房、1樓為事務所，買下可直接接手營運，後續大額支出少。想定利回約<b>11%</b>、實質約<b>6%</b>（含1樓事務所收入，依實際營運與空置率而定、不保證報酬）。建物為所有權、商業地域（建蔽率80%／容積率700%），將來轉售或貸款相對容易。詳細營運數字、貸款成數與稅務試算，加LINE我幫你把關（可貸成數依銀行審查為準，實際稅額請由稅理士確認）。"
  }
];
