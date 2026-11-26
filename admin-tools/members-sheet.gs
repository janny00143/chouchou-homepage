/**
 * 周周的會員名單 → Google 試算表（每小時自動更新）
 * 2026-11-13 周周：「把註冊的會員整理成一個 Excel 表，自動匯入」
 *
 * 用法（只要做一次）：
 *   1. 用「登入 Firebase 主控台的那個 Google 帳號」建立一份新的 Google 試算表。
 *   2. 試算表上方選單：擴充功能 → Apps Script。
 *   3. 把這整段貼進 Code.gs（取代原本內容）。
 *   4. 左邊齒輪「專案設定」→ 勾「在編輯器中顯示 appsscript.json 資訊清單檔案」，
 *      回到編輯器打開 appsscript.json，換成 admin-tools/appsscript.json 的內容。
 *   5. 上方函式選單選「setup」→ 按「執行」→ 依畫面授權（會出現「Google 尚未驗證這個應用程式」，
 *      按「進階」→「前往（不安全）」即可，這是你自己的程式）。
 *   之後每小時自動更新；想馬上更新，試算表選單「周周會員 → 立即更新」。
 *
 * ⚠️ 出現「讀不到會員資料（403）Missing or insufficient permissions」＝用錯帳號：
 *    要用 Firebase 那個 Google 帳號開試算表、跑 setup；共用進來的其他帳號沒有權限讀。
 *
 * 安全：會員資料只在你的 Google 帳號裡流動（Firestore → 你的試算表），不經過任何第三方。
 *       這份試算表裡是客戶個資，請不要共用給別人。
 *
 * ⭐ Brevo 名單自動同步（周周 2026-11-26 核准「Brevo 名單同步ok」）
 *   每小時更新試算表時，順便把「電子報」欄同步到 Brevo 的「周周會員」名單：
 *     同意 → 加進名單（已經在的不會重複）；不收 → 從名單移除。
 *   在 Brevo 信裡按「取消訂閱」的人，Brevo 會一直記得他退訂了，這裡不會把他加回來。
 *   只會傳「有變動的人」，沒變動就不呼叫 Brevo。
 *   設定（只要做一次，金鑰只存在你自己的 Apps Script 裡，不會進網站、也不會給我）：
 *     1. Brevo 右上角帳號 → SMTP & API → API Keys → Generate a new API key（名字隨便取，例如 sheet-sync），複製。
 *     2. Brevo → Contacts → Lists，點「周周會員」，網址或名單旁邊的 #數字 就是名單編號（ID）。
 *     3. Apps Script 左邊齒輪「專案設定」→ 最下面「指令碼屬性」→ 新增兩個：
 *          BREVO_KEY      ＝ 第 1 步複製的金鑰
 *          BREVO_LIST_ID  ＝ 第 2 步的數字
 *     4. 試算表選單「周周會員 → 立即同步 Brevo」跑一次，右上角會寫同步結果。
 *   ⚠️ 若結果寫「401 unrecognised IP」：Brevo → Security → Authorised IPs 把「IP 限制」關掉
 *      （Google 的伺服器 IP 不固定，開著會一直被擋）。
 *   沒設定這兩個屬性就自動略過，試算表照常更新。
 */
const PROJECT = 'chouchou-homepage';
const SHEET = '會員名單';
const HEAD = ['加入日', '更新日', '姓名', '居住地', 'LINE ID', '電話', 'Email', '電子報', '收藏數', '語言', '會員編號'];
const LANG = { tw: '繁中', cn: '簡中', ja: '日文' };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('周周會員').addItem('立即更新', 'syncMembers').addItem('立即同步 Brevo', 'syncBrevoNow').addToUi();
}

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'syncMembers') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncMembers').timeBased().everyHours(1).create();
  syncMembers();
}

function syncMembers() {
  const token = ScriptApp.getOAuthToken();
  const base = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/members?pageSize=300';
  const rows = [];
  let pageToken = '';
  do {
    const res = UrlFetchApp.fetch(base + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''), {
      headers: { Authorization: 'Bearer ' + token, 'x-goog-user-project': PROJECT },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('讀不到會員資料（' + res.getResponseCode() + '）：' + res.getContentText().slice(0, 300));
    const j = JSON.parse(res.getContentText());
    (j.documents || []).forEach(d => {
      const f = d.fields || {};
      const s = k => (f[k] && f[k].stringValue) || '';
      const t = k => (f[k] && f[k].timestampValue) ? new Date(f[k].timestampValue) : '';
      const favs = (f.favs && f.favs.arrayValue && f.favs.arrayValue.values) || [];
      rows.push([t('createdAt'), t('updatedAt'), s('name'), s('region'), s('lineId'), s('phone'), s('email'),
        (f.consentNews && f.consentNews.booleanValue) ? '同意' : '不收', favs.length, LANG[s('lang')] || s('lang'), d.name.split('/').pop()]);
    });
    pageToken = j.nextPageToken || '';
  } while (pageToken);

  rows.sort((a, b) => (b[0] || 0) - (a[0] || 0));   // 新加入的排最上面
  const ss = SpreadsheetApp.getActiveSpreadsheet();   // 綁在試算表上的程式，排程執行時也拿得到這份表
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  sh.clearContents();
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#fff1f2');
  if (rows.length) {
    sh.getRange(2, 6, rows.length, 1).setNumberFormat('@');            // 電話保留開頭的 0
    sh.getRange(2, 1, rows.length, HEAD.length).setValues(rows);
    sh.getRange(2, 1, rows.length, 2).setNumberFormat('yyyy/mm/dd hh:mm');
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, HEAD.length);
  sh.getRange(1, HEAD.length + 2).setValue('最後更新：' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '（共 ' + rows.length + ' 位）');
  let msg = '';
  try { msg = syncBrevo(rows); } catch (e) { msg = 'Brevo 同步失敗：' + e.message; }
  if (msg) sh.getRange(2, HEAD.length + 2).setValue(msg);
}

function syncBrevoNow() {
  const p = PropertiesService.getScriptProperties();
  p.deleteProperty('BREVO_STATE');          // 全部重送一次
  syncMembers();
}

/* rows 的欄位順序見 HEAD：姓名 [2]、Email [6]、電子報 [7] */
function syncBrevo(rows) {
  const p = PropertiesService.getScriptProperties();
  const key = p.getProperty('BREVO_KEY'), list = Number(p.getProperty('BREVO_LIST_ID'));
  if (!key || !list) return '';
  const prev = JSON.parse(p.getProperty('BREVO_STATE') || '{}');
  const now = {}, add = [], rm = [];
  rows.forEach(r => {
    const email = String(r[6] || '').trim().toLowerCase();
    if (!email || email.indexOf('@') < 1) return;
    const st = r[7] === '同意' ? 'in' : 'out';
    now[email] = st;
    if (prev[email] === st) return;
    if (st === 'in') add.push({ email: email, name: String(r[2] || '') });
    else if (prev[email] === 'in' || prev[email] === undefined) rm.push(email);
  });
  const call = (path, body) => UrlFetchApp.fetch('https://api.brevo.com/v3' + path, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'api-key': key, accept: 'application/json' }, payload: JSON.stringify(body)
  });
  let ok = 0, ng = [];
  add.forEach(c => {
    const res = call('/contacts', { email: c.email, attributes: { FIRSTNAME: c.name }, listIds: [list], updateEnabled: true });
    const code = res.getResponseCode();
    if (code < 300) ok++; else { ng.push(code + ' ' + res.getContentText().slice(0, 80)); delete now[c.email]; }
  });
  rm.forEach(e => {   // 一個一個移除：整批送的話，只要其中一個本來就不在名單裡，整批都會被退回
    const res = call('/contacts/lists/' + list + '/contacts/remove', { emails: [e] });
    const code = res.getResponseCode();
    // 400／404「不在名單裡／沒有這個聯絡人」也算完成
    if (code >= 300 && code !== 400 && code !== 404) { ng.push(code + ' ' + res.getContentText().slice(0, 80)); delete now[e]; }
  });
  p.setProperty('BREVO_STATE', JSON.stringify(now));
  const t = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'MM/dd HH:mm');
  if (ng.length) return 'Brevo 同步（' + t + '）：有 ' + ng.length + ' 筆失敗，下次會再試。' + ng[0];
  return 'Brevo 同步（' + t + '）：加入 ' + ok + '、移除 ' + rm.length + '，其餘沒變動';
}
