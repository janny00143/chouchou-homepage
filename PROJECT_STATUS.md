# PROJECT_STATUS.md — 周周・日本房仲網站

> 這份是給「下一個 Claude 對話」無縫接手用的交接文件。
> 接手請先讀完本檔＋根目錄 `CLAUDE.md`（最高優先規則），兩份一起看。
> 最後更新：2026-07-10

---

## 1. 專案最終目的

周周（周欣妤，任職株式会社アンドプラス 住宅營業部，在東京工作的台灣房仲）的**個人房仲品牌網站**。目的：

- 用繁體中文向華語圈客戶說明日本買房、自住、投資、貸款、契約流程，建立專業與信任感。
- 提供實用工具（房產圖面翻譯機、各式試算工具）吸引潛在客戶。
- 作為社群（Threads／IG／TikTok／FB／LINE）的導流落點，最終引導加 LINE 諮詢 → 看房 → 成交。
- 網站定位：輕量、好維護、可長期擴充內容的靜態站，**現已是三語站**（繁中／簡中／日文）。

---

## 2. 目前已完成的功能（皆已上線）

**首頁 `index.html`（單頁式 SPA，JS 切換頁面）**
- intro、服務項目、買房流程（`PROCESS`）、自住服務（`LIVE`）、投資收租服務（`INV`）、FAQ、關於我們
- 文章系統：**30 篇文章（a1～a30，a4 除外共 29 篇有獨立 SEO 頁）**，存在 `ART` 陣列，支援分類篩選＋關鍵字搜尋
- 6 個文章分類 `CATS`：外國人買房（foreign）／自住攻略（live）／投資收租（invest）／民宿法規（minpaku）／區域介紹（area）／貸款稅務（loan），另有 area 底下的觀光景點類文章
- 首頁 YouTube 影片區塊、`videos.html` 獨立影片頁

**三語站（2026-06～07 完成的最大工程）**
- **繁體中文**：全部原生內容，`index.html` 為主體
- **簡體中文**：所有頁面都有對應 `-cn.html`（用 `build-cn.cjs` 以 OpenCC 繁→簡自動產生，含圖檔名保護、內部連結改寫、canonical/og/hreflang/`<html lang>` 調整）
- **日文**：`ja.html` 是**完整版 SPA 日文首頁**（2026-07-01 重建，之前只是簡化過的單頁摘要，缺服務項目/買房流程/自住/投資/FAQ子頁面跟圖片，周周指出「要跟簡體繁體都一樣」後重做），架構、CSS、圖片跟 `index.html`/`index-cn.html` 完全一致，只是內容翻成自然商務日文；含服務項目、買房流程10步驟、自住/投資服務、11題FAQ、客戶評價、關於我們（公司資訊/LINE QR）、30篇文章卡片（封面圖+影片標籤，搜尋/分類篩選功能）。**30 篇文章 + minpaku + 11 個工具頁全部有 `-ja.html` 版本**，達成與簡體版完全對等（周周明確要求「跟簡體的一模一樣」）
  - `ja.html` 由 **`build-ja-home.cjs`** 產生：讀 `index.html` 的 STYLE/ART/SLUG/CATS，套用腳本內建的日文 UI 文案（服務項目、流程步驟、FAQ、客戶評價等都寫死在腳本裡），輸出完整 SPA。**若 `index.html` 的服務項目/流程/FAQ/自住/投資這些靜態文案有改，`build-ja-home.cjs` 裡對應的日文也要手動跟著改，再重跑**（不會自動同步，因為是意譯不是機械轉換）。文章卡片的 title/ex/tags 讀 `ja-content.json`，跟文章獨立頁共用同一份翻譯來源。
  - 文章的日文獨立頁（`<slug>-ja.html`）由 `build-ja.cjs` 讀 `ja-content.json`（人工整理的翻譯內容，來源是多個 sub-agent 平行翻譯＋人工校對成自然商務日文）自動產生
  - 11 個工具頁（`tool-loan` / `tool-cost` / `tool-agent` / `tool-yield` / `tool-fx` / `tool-area` / `tool-convert` / `tools` / `translate` / `feedback` / `videos`）的日文版是**手寫**（Write 工具直接寫檔，因為內容偏 UI／短文字而非長文），已逐一比對繁體版原始邏輯（尤其是計算類頁面的公式）確保一致
  - `translate-ja.html` 特別注意：AI prompt 常數（`PROMPT`/`INVEST_PROMPT`）與結果渲染函式**維持繁體中文不變**（因為翻譯機本身的功能就是「把日文房產資料翻成中文給華語客戶看」，這些常數翻成日文會讓功能失效），只翻譯了頁面外殼（標題、上鎖畫面、上傳畫面、錯誤訊息）
- **語言切換器**：右上角 🌐 按鈕，下拉選單三個選項（繁體中文／简体中文／日本語），連結會 `target="_blank"` 開新分頁；每篇文章／工具頁點「日本語」會導到**對應頁面的日文版**（不是通用的 ja.html 首頁）
- **hreflang** 三語互相宣告（zh-Hant / zh-Hans / ja），`og:locale` 也依語言正確設定（zh_TW / zh_CN / ja_JP）

**物件專區 `properties.html`（2026-07-09 新增的功能）**
- 展示周周精選的東京物件（自住／投資收租／一戶建／土地），繁中 `properties.html`＋簡中 `properties-cn.html`（`build-cn.cjs` 產生），日文版尚未做。
- 所有物件資料集中在 **`properties.js` 的 `window.PROPERTIES` 陣列**（周周可自行編輯），頁面用 JS 渲染卡片，**繁中／簡中共用同一份 `properties.js`**，簡中在瀏覽器即時 OpenCC 轉換，**只改資料檔不需重跑任何產生器**（改版型才要重跑 `build-cn.cjs`）。
- 每筆欄位：`id/status(在售·洽談中·已成約)/cat(invest·live·house·land)/title/price/location/station/layout/size/age/facing/mgmt/right/yield(投資才填)/photos([...])/note(周周推薦語)`；`photos` 第一張=封面、其餘進**相簿燈箱**（卡片右下顯示「📷 N」，可左右滑看）。`photos:[]` 則顯示「照片準備中」。
- 照片放 root，命名 `prop-<id>-N.jpg`，上架前壓到寬 1500px 內。**務必濾除賣家/來源公司聯絡資訊**；投資物件 note 要保守（表面利回為毛數字、依租況、不保證報酬），貸款一律「依銀行審查為準」。
- 目前 **18 筆**：8 筆自住（含 2026-07-10 從周周雲端補上的 togoshi701／yotsuya115／kameido209 三筆翻新宅，皆有 6 張照片）＋10 筆投資店舖（來自「ムゲンエステート」型錄，**目前 `photos:[]` 尚無照片**）。
- 後台工具 `admin/index.html`（物件登錄小工具，貼販売図面資料自動辨識產生 `properties.js` 片段）、`admin/logs.html`（翻譯機紀錄）。root 另有一支**孤兒檔 `property-admin.html`**（舊版登錄工具，全站無任何連結指向，功能已被 `admin/` 取代，可清）。

**翻譯機 `translate.html`**
- 上傳日文房產圖面（JPG）→ 翻成中文＋整理重點，含地圖、物件分析、翻新資訊
- 後端：Cloudflare Worker（Gemini），解鎖碼 `ZHOUZHOU`（**未變更，勿改**）
- 2026-07 一連串強化（PR #63～#74）：前端顯示用量上限訊息、後台逐張顯示金鑰/花費/餘額估算、嚴格把關擋非物件圖（非物件圖提示改純中文）、把關呼叫加 `gate` 旗標不重複計次、所有上傳都記進後台（含被擋/失敗與原圖）、分析中動畫、強化自然台灣中文（禁日式中文）＋清洗字典。

**其他工具頁**：房貸試算（tool-loan）、購屋費用試算（tool-cost）、仲介費試算（tool-agent）、租金投報率試算（tool-yield）、即時匯率（tool-fx）、坪數/㎡/帖換算（tool-area）、意見回饋表單（feedback，用 Web3Forms）

**SEO**
- `generate-pages.cjs` 自動產生每篇文章的獨立靜態頁＋`sitemap.xml`＋`robots.txt`（含繁中/日文文章與 minpaku，簡中頁目前未收錄進 sitemap，因為視為語言變體、靠 hreflang 讓 Google 自己關聯）
- 2026-07-01：已提供周周分批次的 Google Search Console 手動提交網址清單（30 篇繁中文章分 3 批），逐步引導 Google 收錄

---

## 3. 2026-06 下旬～07 上旬這次工作的重點（供交接參考）

1. **Threads（脆）個人檔案連結**全站更新為新網址（`S.threads`），並重跑 `build-cn.cjs` 同步簡體版。
2. **日文全站翻譯達成與簡體對等**：27 篇文章＋minpaku 先完成（多 sub-agent 平行翻譯＋人工校對），本次再補齊 11 個工具頁的手寫日文版。
3. **修掉幾個潛藏 bug**（不是這次新增功能才發現，是既有邏輯的缺陷）：
   - 語言切換按鈕原本用 `space-between` 排版卡在視覺置中，改成跟 LINE 按鈕分組貼齊右上角。
   - `generate-pages.cjs` 注入的 script 裡用 `\.` 這種 regex escape，在 template literal 裡會被靜默吃掉變成 `.`（萬用字元），改用字串 `.slice()` 判斷副檔名，徹底避開這個坑。
   - `build-cn.cjs` 的 `<html lang="zh-Hant">` 取代邏輯用太寬鬆的 regex，誤配到 `hreflang="zh-Hant"` 裡面，導致簡體頁的 hreflang 標錯；已改成精確比對 `<html lang="...">` 整個標籤。
   - 12 個工具頁的語言切換器原本「日本語」一律連到通用 `ja.html` 首頁（而非文章頁那種連到對應日文頁的邏輯），已修成跟文章頁一致的 per-page 邏輯。
4. **`ja.html` 文案調整**：「中国語・日本語どちらでも大丈夫です」→「中国語・日本語どちらも対応可能です」（更專業的商務日文用詞）。
5. **全站驗證**：128 個 HTML 檔全部跑過 `<script>` 語法檢查（`new Function()`）與 href/src 連結存在性掃描，**目前 0 語法錯誤、0 壞連結**。
6. **SEO／Google 收錄建議**：提供分批 GSC 手動提交網址清單（第一批 10 篇熱門買房/貸款/稅務主題文章、第二批 15 篇剩餘繁中文章、第三批 6 篇區域/景點類文章），並說明簡中/日文版不需逐一手動提交（靠 sitemap + hreflang 自然收錄）。

---

## 4. 尚未完成 / 待辦（依優先順序）

0. **物件專區：10 筆投資店舖沒照片、日文版未做**。(a) 那 10 筆投資物件 `photos:[]`，來源是周周 Google Drive「claude用/ムゲンエステート」型錄（PDF 18MB 超過 MCP 下載上限、docx 9.5MB 也曾遇 Drive session 過期抓不到）；且都是**現況出租中的 1 樓店舖/事務所**，型錄照片多為店面外觀、易帶到承租商家招牌名稱（第三方資訊），要放前先跟周周確認是否要放、並務必去除招牌/商號。(b) `properties.html`/`-cn.html` 已有，但**沒有 `properties-ja.html`**（三語站其他頁都有日文版，這頁還缺）；要做需比照工具頁手寫日文外殼＋讓 `properties.js` 卡片文案支援日文（目前資料是繁中）。
1. **a1、a3、a5 尚未升級成長文＋數據版**（這是 2026-06-21 就列出的舊待辦，至今仍未處理；期間網站重心轉往三語擴站，這三篇被擱置）。若要做，比照 a2／a6 的長文結構：開場 → 附資料來源的數據框 → 比較 → 分析 → 💡周周提醒 → CTA，動手前務必先 web 查最新真實數據。
2. **6 篇文章缺少「本篇目錄」**：目錄產生邏輯要求文章內至少 4 個 `<p><b>小標</b>...` 格式的段落開頭才會顯示目錄，這 6 篇因為小標數不足沒有目錄。周周尚未決定是否要為這幾篇補小標，維持現狀即可，之後周周有指示再處理。
3. **Google Search Console 收錄**：已給周周分批網址清單，需要持續追蹤「Coverage」報表，若有頁面卡在「已探索－尚未建立索引」再協助診斷（通常是內容單薄或跟其他頁太像，不是技術錯誤）。
4. **社群貼文延伸**（依文章內容做 Threads／IG／短影音腳本）：周周先前提過但目前暫緩，非急件。

---

## 5. 已經確定的重要決策（勿擅自更動）

- 文章一律存在 `index.html` 的 `ART` 陣列，靠 JS 渲染；**新增/改文章只改 `ART`，改完要重跑 `node generate-pages.cjs`（產生繁中獨立頁+sitemap）→ `node build-cn.cjs`（產生簡中頁，需要 `npm install opencc-js --no-save`）→ 若牽涉文章內容也要更新 `ja-content.json` 後重跑 `node build-ja.cjs`**。
- 新增文章時，`generate-pages.cjs` 與 `index.html` 的 `SLUG` 對照表兩處都要加同一組 `id→slug`。
- 文章美化：純文字段落直接寫字串（JS 自動包 `<p>`）；彩色框讓字串以 `<div` 開頭，inline style 用單引號、外層雙引號。
- 視覺語彙沿用 a2：綠框（結論/適合）、黃框（注意）、藍框（補充）、玫瑰漸層框（💡 周周的提醒）。
- 合規語氣：貸款／稅務／簽證一律「依個案、依銀行審查為準、由稅理士/司法書士確認」，不做絕對保證，不寫「保證」「一定」「穩賺」。
- 翻譯機解鎖碼 `ZHOUZHOU` 與 Worker URL **維持不動**。
- 三語站的日文版**不是機器直翻**，是自然商務日文（人工/多 agent 校對過），新增日文內容要維持這個品質標準，不要用生硬的逐字翻譯。
- 語言切換器連結一律 `target="_blank" rel="noopener"` 開新分頁；「日本語」要連到當前頁面對應的 `-ja.html`，不是一律導去 `ja.html` 首頁（除非該頁本身就是首頁性質，如工具導向頁）。

---

## 6. 不可以更改的要求（接手務必遵守）

1. **改檔前一定先讀 repo 線上最新版**，不可憑記憶或舊版改。
2. **不可擅自更改原本架構**（純靜態站 + `ART` 陣列 + JS 渲染，無框架無建置工具）。
3. **交付方式：寫入權限「因連線環境／管道而異」，不要預設任何一種，動手前先自己測試**。
   - 2026-07-01 在**這個當下的 Claude Code 遠端執行環境**實測出：同一個 session 裡，**git push 這條路能寫、GitHub MCP 工具（`create_or_update_file`/`push_files`/`create_branch` 等）這條路不能寫**——
     - `git push`（本機 remote 指到 `https://github.com/...`，走 `local_proxy:41729`）**成功**，且用完全獨立、不經過 git/proxy 的管道（GitHub MCP 的 `get_file_contents`，即 REST API 讀取）讀回內容與 SHA 都對得上，證實不是本機假象，是真的寫進遠端 GitHub 了。
     - 但同一個 session 再用 GitHub MCP 的 `create_or_update_file` 直接寫同一個檔案，回傳 `403 Resource not accessible by integration`——這個 GitHub App／整合本身的權杖對這個 repo 只有讀權限，寫入被擋。
   - **同一天、另一個對話視窗**（周周確認**也是用 Claude Code 開的**，跟這次同一種介面）測到「`git push` 403、GitHub API 建立分支也 403、沒有 `ghreal` remote、`GH_TOKEN` 只是佔位字串」。
   - **結論**：這個 repo 本身的寫入權限**不是單一開關**，同一個對話裡可能「git 能寫、API 不能寫」同時成立，因為兩者用不同的憑證/管道。**每次接手都先各自測試兩條路**：(1) 有沒有可用的 git remote 可以 push（`git remote -v` 看有沒有指向真正 github.com 的 remote，試著 commit + push 一個小改動）；(2) GitHub MCP 工具寫入是否會 403。哪條路通就用哪條路；兩條都 403 就照舊流程「改好 → 提供完整可下載檔 → 周周自行上傳」。不要照抄這份文件某次寫的結論。
   - 若用 git push，push 前記得 `git config --global --unset-all "url.http://local_proxy@127.0.0.1:41729/git/.insteadof"`（proxy 設定在某些環境會被重新注入，每次 push 前清一次再試）。
   - **2026-07-01 補充實測（已排除的方向）**：周周在 GitHub 網站 `Settings → Applications` 三個分頁都查過——「Installed GitHub Apps」裡**根本沒有 Claude 相關項目**（只有 ChatGPT Codex Connector、Railway App）；Claude／Claude Github MCP Connector 只出現在「Authorized GitHub Apps」，這種授權方式**沒有 repo 層級的讀寫權限開關可以調**。**結論：這個寫入權限不是 GitHub 網站設定能控制或修好的東西**，之後不要再叫周周去 GitHub 帳號設定找開關，那邊沒有。
   - **⚠️ 已證偽的推測，不要再用**：曾經以為差異是「這次用 Claude Code on the web、那次用一般 claude.ai 聊天」，但周周確認**兩邊都是用 Claude Code 開的**，所以「用哪種介面」不是真正的差異點。**目前這兩個同樣是 Claude Code 的對話，為什麼一個能寫、一個不能寫，原因未知**——可能是建立環境時選的網路/權限設定不同、可能是這個對話當初是透過某種自動化流程（例如綁定 GitHub issue/PR 的任務）建立、也可能單純是後端配置不一致，但這些都只是未經證實的猜測，**不要寫成肯定的結論交給下一個對話**。唯一確定可靠的做法就是上面第一條寫的：**每次接手都自己動手測試 git push 跟 GitHub MCP 寫入，兩條路都試過才知道這次拿到的是哪一種，不要用「上次是哪種介面」來預判。**
   - **嘗試中、尚無結果的方向**：周周正在 Claude 設定裡試著新增一個「自訂連接器」（カスタムコネクタ），指向 GitHub 官方自己的 remote MCP server（`https://api.githubcopilot.com/mcp/`，OAuth Client ID/Secret 留空走自動授權），如果成功且授權時給了 repo 讀寫權限，這會是一條**獨立於 Anthropic 內建 GitHub 連接器**的新寫入管道，理論上不會受目前這個唯讀限制影響。**但這件事截至本次更新還沒驗證成功**（不確定免費 GitHub 帳號能不能用、也還沒實際測試新對話能不能用它寫入），下一個接手的人如果看到 Claude 設定裡多了這個連接器，可以試著在新對話啟用它，一樣要照上面的方式實測是否真的能寫，不要假設一定成功。
   - **這份文件的維護心態**：與其把心力花在「找出唯一正確的權限開關」，更務實的做法是**保持這份文件即時更新**——不管哪次接手有沒有寫入權限，只要現況、待辦、已排除的死路都寫在這裡，接手成本就很低。目前的做法是：儘量留在同一個已確認能寫入的對話裡持續工作，不用急著每次都開新對話；等真的需要換對話接手時（環境被回收、或想開新的），才需要重新測試一次寫入權限。
4. **不要重做已完成的部分**（見第 2、3 節現況）。
5. 預設繁體中文（台灣用語），簡中/日文版本要跟繁中同步更新，日文要自然商務日文。
6. 貸款／稅務／簽證不亂保證；保護客戶個資，不寫進 commit 或公開頁面。
7. 維持解鎖碼 `ZHOUZHOU` 與翻譯機 Worker URL：`https://sparkling-darkness-3cb1.janny00143.workers.dev/`。
8. **改完文章／頁面後一定要跑對應的產生器**（見第 5 節流程），否則三語版本/獨立頁/sitemap 會跟 `ART` 不同步。

---

## 7. 使用的技術、框架與資料庫

- 前端：純手寫 HTML + CSS + 原生 JavaScript，**無框架、無建置工具**。字型 Noto Sans TC。
- 主色變數：`--rose:#f43f5e`、`--green:#10b981`、`--ink:#292524` 等（定義在 `index.html` `:root`）。
- 代管：GitHub Pages（repo `janny00143/chouchou-homepage`，`main` 分支，Public），正式網址 `https://chouchouinjapan.com/`。
- 翻譯機後端：Cloudflare Worker，串接 Google Gemini。
- 意見回饋表單：Web3Forms（`access_key: 'd1ac2743-8999-4270-abe8-9896caaf693b'`）。
- 匯率工具：即時呼叫 `open.er-api.com`。
- **資料庫：無**。所有內容都硬寫在 JS/HTML 裡；翻譯機即時呼叫 API 不存資料。
- 第三方：LINE 官方帳號、QR 用 api.qrserver.com 即時產生。
- Node.js 產生器（僅開發階段用，非執行期依賴）：`generate-pages.cjs`（繁中獨立頁+sitemap+robots）、`build-cn.cjs`（簡中頁，依賴 `opencc-js`，需 `npm install opencc-js --no-save`）、`build-ja.cjs`（日文文章頁，讀 `ja-content.json`）。

---

## 8. 重要檔案名稱與用途

| 檔案 | 用途 |
|---|---|
| `index.html` | 首頁＋全部頁面＋30 篇文章（`ART` 陣列）＋`SLUG` 對照表。網站主體。 |
| `index-cn.html` | 首頁簡體版（`build-cn.cjs` 自動產生，勿手改）。 |
| `ja.html` | 首頁日文版，**完整版 SPA**（跟 `index.html` 同架構），由 `build-ja-home.cjs` 產生，**勿手改**——要改內容請改 `build-ja-home.cjs` 裡的 `JA_UI`/`PROCESS_JA`/`FAQ_JA` 等常數再重跑。 |
| `<slug>.html` / `<slug>-cn.html` / `<slug>-ja.html` | 每篇文章的三語獨立 SEO 頁（`generate-pages.cjs`/`build-cn.cjs`/`build-ja.cjs` 自動產生，**勿手改**）。 |
| `translate.html` / `translate-cn.html` / `translate-ja.html` | 房產圖面翻譯機三語版（`-ja.html` 為手寫，AI prompt 常數維持中文）。 |
| `minpaku.html` / `minpaku-cn.html` / `minpaku-ja.html` | 民宿（民泊）法規獨立頁三語版。 |
| `tool-loan/tool-cost/tool-agent/tool-yield/tool-fx/tool-area/tool-convert/tools/feedback/videos` (+`-cn`/`-ja`) | 各工具頁三語版，工具頁的 `-ja.html` 為手寫，需注意計算公式要跟繁中版本邏輯完全一致。 |
| `generate-pages.cjs` | 繁中文章獨立頁／`sitemap.xml`／`robots.txt` 產生器，內含 `SLUG` 對照表。 |
| `build-cn.cjs` | 簡體頁產生器（OpenCC 繁→簡＋連結改寫＋hreflang/og/lang 調整）。 |
| `build-ja.cjs` | 日文文章獨立頁產生器，讀 `ja-content.json`。 |
| `build-ja-home.cjs` | 日文首頁（`ja.html`）產生器，讀 `index.html` 的 STYLE/ART/SLUG/CATS，套用腳本內建的日文 UI 文案（服務項目/流程/FAQ/客戶評價等）產生完整 SPA。**這些日文 UI 文案是意譯、不是機械轉換，`index.html` 對應內容改了要手動同步改這支腳本再重跑，不會自動更新。** |
| `ja-content.json` | 29 篇文章的日文翻譯內容（title/ex/tags/body），`build-ja.cjs` 的資料來源。 |
| `sitemap.xml` / `robots.txt` | 給搜尋引擎用，由產生器產出，勿手改。 |
| `cover-*.jpg` / `pexels-*.jpg` | 文章封面與版面圖，全放 root。 |
| `properties.html` / `properties-cn.html` | 物件專區頁（繁中手寫、簡中由 `build-cn.cjs` 產生）。日文版尚未做。 |
| `properties.js` | 物件專區資料檔（`window.PROPERTIES` 陣列），繁中/簡中共用，周周可自行編輯；只改資料不需重跑產生器。 |
| `prop-<id>-N.jpg` | 物件照片（第一張=封面、其餘進相簿），全放 root，上架前壓到寬 1500px 內。 |
| `admin/index.html` / `admin/logs.html` | 後台：物件登錄小工具、翻譯機紀錄。 |
| `property-admin.html` | ⚠️ 孤兒檔（舊版物件登錄工具，全站無連結、已被 `admin/` 取代，可清）。 |

---

## 9. 已知問題（非緊急，記錄用）

- 物件專區 10 筆投資店舖尚無照片、且無日文版 `properties-ja.html`（見第 4 節第 0 點）。
- a1／a3／a5 三篇文章內容偏短（約 2000～2400 字元），尚未做「長文＋數據版」升級（見第 4 節第 1 點）。
- 6 篇文章因小標數不足沒有自動產生的「本篇目錄」，屬正常行為非 bug，周周尚未要求處理。
- 翻譯機解鎖碼 `ZHOUZHOU` 屬簡易前端驗證，看原始碼即可得知，非真正安全機制（周周已知悉，暫不更動）。
- 翻譯機依賴 Cloudflare Worker / Gemini 免費額度，用量大時可能受限，需留意。
- Google 尚未完整收錄全站（2026-07-01 時間點），已提供分批 GSC 提交清單協助加速收錄，需持續追蹤。

---

## 10. 部署／上線狀態

- **已上線**：`https://chouchouinjapan.com/`（自訂網域，GitHub Pages 代管）。
- 部署方式：本機 `deploy` 分支 → push 到 `main` → GitHub Pages 從 `main` 自動更新。**寫入權限因連線環境而異，見第 6.3 節，動手前先自己測試，不要預設。**
- 三語站（繁中/簡中/日文）全部上線，語言切換器運作正常。
- 128 個 HTML 檔（2026-07-01 統計）全部通過語法與連結完整性檢查，0 錯誤。

---

## 11. 下一個對話應該從哪一步開始

依周周下一次的指示而定；若周周沒有新指示，建議的待辦優先順序是：

1. 追蹤 Google Search Console 收錄狀況，視需要協助診斷「已探索－尚未建立索引」的頁面。
2. 詢問周周是否要處理 a1／a3／a5 的長文數據升級（見第 4 節）。
3. 有新文章需求時，依第 5 節「新增/改文章 SOP」執行，並記得三語都要同步（`ART` → `generate-pages.cjs`+`build-cn.cjs` → `ja-content.json`+`build-ja.cjs`）。

**動手前務必先讀 `CLAUDE.md` 與本檔，並用 git/GitHub 工具確認 repo 目前真正的最新狀態，不可憑本檔記憶直接改。**
