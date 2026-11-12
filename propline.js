/* ══════════════════════════════════════════════════════════════════
   物件頁按下「加 LINE」時，自動把這間的資訊複製到剪貼簿
   （周周 2026-10-27 核准：「物件頁加賴那個可以做」）

   ▍為什麼需要
     LINE 的加好友連結沒辦法預填訊息，所以客戶從物件頁點進 LINE 之後，
     周周收到的只是一個空白的新好友，不知道他在看哪一間，每次都要反問
     「請問是看哪一間呢？」——有些人問到一半就跑了。
     這支在點擊的當下把「物件名＋價格＋網址」複製起來，並提示客戶貼上。

   ▍怎麼知道是哪一間
     頁面自己提供 window.PROPINFO = { t: 物件名, p: 價格, loc: 地點 }：
     ・prop-<id>.html（產生器產的靜態頁）→ generate-pages.cjs 直接寫進去
     ・property.html?id=（JS 渲染）     → render() 裡設定
     沒有 PROPINFO 就什麼都不做，連結照原本的行為走。

   ▍⚠️ 實作上的兩個重點
     1. 複製一定要在 click 當下同步發動，不能等 await 之後再做，
        否則瀏覽器會視為「非使用者操作」而擋掉。
     2. 不要 preventDefault——讓 <a> 照常開 LINE。先複製再放行，
        自己 window.open 反而可能被彈出視窗阻擋擋掉。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.PROPINFO;
  if (!P || !P.t) return;

  var path = location.pathname;
  var lang = /-ja\.html$/.test(path) ? "ja" : (/-cn\.html$/.test(path) ? "cn" : "tw");
  var T = {
    tw: { head: "我想詢問這間：", toast: "已幫你複製物件資訊，在 LINE 貼上傳給周周就可以囉 👌",
          toastM: "訊息已幫你填好，在 LINE 按「送出」就可以囉 👌（沒出現的話直接貼上也行）" },
    cn: { head: "我想询问这间：", toast: "已帮你复制房源信息，在 LINE 粘贴发给周周就可以啰 👌",
          toastM: "消息已帮你填好，在 LINE 按「发送」就可以啰 👌（没出现的话直接粘贴也行）" },
    ja: { head: "こちらの物件についてお伺いしたいです：", toast: "物件情報をコピーしました。LINEに貼り付けてお送りくださいませ 👌",
          toastM: "メッセージを入力済みです。LINEで送信ボタンを押してください 👌（表示されない場合は貼り付けてください）" }
  }[lang];

  /* ▍2026-11-12 周周核准「方案 A」：手機上直接開聊天室並預填訊息
     LINE 官方的 URL scheme：https://line.me/R/oaMessage/{@ 換成 %40 的 LINE ID}/?{訊息}
     （developers.line.biz「Use LINE features with the LINE URL scheme」）。
     只在手機上改連結：電腦版 LINE 是否支援官方沒寫，電腦維持原本的加好友＋複製。
     還沒加好友的人可能先看到加好友畫面，所以「複製」也照做，當保險。 */
  var OA_ID = "%40202dzwok";
  var MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  function oaURL() { return "https://line.me/R/oaMessage/" + OA_ID + "/?" + encodeURIComponent(text()); }

  function text() {
    var line2 = [P.p, P.loc].filter(Boolean).join("｜");
    return [T.head, P.t, line2, location.href].filter(Boolean).join("\n");
  }

  /* 舊版 Safari 與沒有 https 的情境沒有 navigator.clipboard，用 textarea 退路 */
  function copyFallback(s) {
    try {
      var ta = document.createElement("textarea");
      ta.value = s;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, s.length);
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function copy(s) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // 同步發動，失敗再走退路
        navigator.clipboard.writeText(s)["catch"](function () { copyFallback(s); });
        return true;
      }
    } catch (e) { }
    return copyFallback(s);
  }

  var tip;
  function toast() {
    if (!tip) {
      tip = document.createElement("div");
      tip.style.cssText = "position:fixed;left:50%;bottom:86px;transform:translateX(-50%);"
        + "max-width:min(92vw,420px);background:#1c1917;color:#fff;padding:12px 16px;border-radius:12px;"
        + "font-size:14px;line-height:1.6;z-index:300;box-shadow:0 8px 28px rgba(0,0,0,.28);"
        + "opacity:0;transition:opacity .2s;pointer-events:none;text-align:center";
      document.body.appendChild(tip);
    }
    tip.textContent = MOBILE ? T.toastM : T.toast;
    tip.style.opacity = "1";
    clearTimeout(tip._t);
    tip._t = setTimeout(function () { tip.style.opacity = "0"; }, 4000);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a || !a.href) return;
    if (a.href.indexOf("lin.ee") === -1 && a.href.indexOf("line.me") === -1) return;
    copy(text());
    if (MOBILE && a.href.indexOf("lin.ee") !== -1) a.href = oaURL();   // 同步改寫，瀏覽器會照新網址開
    toast();
  }, true);
})();
