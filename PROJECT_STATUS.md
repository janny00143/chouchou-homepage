# PROJECT_STATUS.md — 周周・日本房仲網站

> 這份是給「下一個 Claude 對話」無縫接手用的交接文件。
> 接手請先讀完本檔＋根目錄 `CLAUDE.md`（最高優先規則），兩份一起看。
> 最後更新：2026-07-01

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
- **日文**：`ja.html` 為日文首頁（含 29 篇文章列表），**29 篇文章 + minpaku + 11 個工具頁全部有 `-ja.html` 版本**，達成與簡體版完全對等（周周明確要求「跟簡體的一模一樣」）
  - 文章的日文版由 `build-ja.cjs` 讀 `ja-content.json`（人工整理的翻譯內容，來源是多個 sub-agent 平行翻譯＋人工校對成自然商務日文）自動產生
  - 11 個工具頁（`tool-loan` / `tool-cost` / `tool-agent` / `tool-yield` / `tool-fx` / `tool-area` / `tool-convert` / `tools` / `translate` / `feedback` / `videos`）的日文版是**手寫**（Write 工具直接寫檔，因為內容偏 UI／短文字而非長文），已逐一比對繁體版原始邏輯（尤其是計算類頁面的公式）確保一致
  - `translate-ja.html` 特別注意：AI prompt 常數（`PROMPT`/`INVEST_PROMPT`）與結果渲染函式**維持繁體中文不變**（因為翻譯機本身的功能就是「把日文房產資料翻成中文給華語客戶看」，這些常數翻成日文會讓功能失效），只翻譯了頁面外殼（標題、上鎖畫面、上傳畫面、錯誤訊息）
- **語言切換器**：右上角 🌐 按鈕，下拉選單三個選項（繁體中文／简体中文／日本語），連結會 `target="_blank"` 開新分頁；每篇文章／工具頁點「日本語」會導到**對應頁面的日文版**（不是通用的 ja.html 首頁）
- **hreflang** 三語互相宣告（zh-Hant / zh-Hans / ja），`og:locale` 也依語言正確設定（zh_TW / zh_CN / ja_JP）

**翻譯機 `translate.html`**
- 上傳日文房產圖面（JPG）→ 翻成中文＋整理重點，含地圖、物件分析、翻新資訊
- 後端：Cloudflare Worker（Gemini），解鎖碼 `ZHOUZHOU`（**未變更，勿改**）

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
   - **同一天、另一個對話視窗**（很可能是不同連線方式，例如 claude.ai 網頁版內建的 GitHub 連接器，只用 GitHub App／API 這條路，沒有 git 層級的存取）測到「`git push` 403、GitHub API 建立分支也 403、沒有 `ghreal` remote、`GH_TOKEN` 只是佔位字串」——這跟上面 GitHub MCP 那條路 403 是同一個現象（GitHub App 唯讀），只是它沒有 git 這條路可以繞過去。
   - **結論**：這個 repo 本身的寫入權限**不是單一開關**，同一個對話裡可能「git 能寫、API 不能寫」同時成立，因為兩者用不同的憑證/管道。**每次接手都先各自測試兩條路**：(1) 有沒有可用的 git remote 可以 push（`git remote -v` 看有沒有指向真正 github.com 的 remote，試著 commit + push 一個小改動）；(2) GitHub MCP 工具寫入是否會 403。哪條路通就用哪條路；兩條都 403 就照舊流程「改好 → 提供完整可下載檔 → 周周自行上傳」。不要照抄這份文件某次寫的結論。
   - 若用 git push，push 前記得 `git config --global --unset-all "url.http://local_proxy@127.0.0.1:41729/git/.insteadof"`（proxy 設定在某些環境會被重新注入，每次 push 前清一次再試）。
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
| `ja.html` | 首頁日文版，含 29 篇文章列表（手寫維護）。 |
| `<slug>.html` / `<slug>-cn.html` / `<slug>-ja.html` | 每篇文章的三語獨立 SEO 頁（`generate-pages.cjs`/`build-cn.cjs`/`build-ja.cjs` 自動產生，**勿手改**）。 |
| `translate.html` / `translate-cn.html` / `translate-ja.html` | 房產圖面翻譯機三語版（`-ja.html` 為手寫，AI prompt 常數維持中文）。 |
| `minpaku.html` / `minpaku-cn.html` / `minpaku-ja.html` | 民宿（民泊）法規獨立頁三語版。 |
| `tool-loan/tool-cost/tool-agent/tool-yield/tool-fx/tool-area/tool-convert/tools/feedback/videos` (+`-cn`/`-ja`) | 各工具頁三語版，工具頁的 `-ja.html` 為手寫，需注意計算公式要跟繁中版本邏輯完全一致。 |
| `generate-pages.cjs` | 繁中文章獨立頁／`sitemap.xml`／`robots.txt` 產生器，內含 `SLUG` 對照表。 |
| `build-cn.cjs` | 簡體頁產生器（OpenCC 繁→簡＋連結改寫＋hreflang/og/lang 調整）。 |
| `build-ja.cjs` | 日文文章頁產生器，讀 `ja-content.json`。 |
| `ja-content.json` | 29 篇文章的日文翻譯內容（title/ex/tags/body），`build-ja.cjs` 的資料來源。 |
| `sitemap.xml` / `robots.txt` | 給搜尋引擎用，由產生器產出，勿手改。 |
| `cover-*.jpg` / `pexels-*.jpg` | 文章封面與版面圖，全放 root。 |

---

## 9. 已知問題（非緊急，記錄用）

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
