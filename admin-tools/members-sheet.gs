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
 * 安全：會員資料只在你的 Google 帳號裡流動（Firestore → 你的試算表），不經過任何第三方。
 *       這份試算表裡是客戶個資，請不要共用給別人。
 */
const PROJECT = 'chouchou-homepage';
const SHEET = '會員名單';
const HEAD = ['加入日', '更新日', '姓名', '居住地', 'LINE ID', '電話', 'Email', '電子報', '收藏數', '語言', '會員編號'];
const LANG = { tw: '繁中', cn: '簡中', ja: '日文' };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('周周會員').addItem('立即更新', 'syncMembers').addToUi();
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
}
