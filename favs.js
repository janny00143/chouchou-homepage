/* ══════════════════════════════════════════════════════════════════
   物件收藏清單（周周 2026-11-12 核准：「收藏清單可以做」）

   ▍做什麼
     ・物件專區的每張卡片右上角、物件詳情頁標題下方，各有一顆 🤍 收藏鈕。
     ・收藏過的物件存在「訪客自己的瀏覽器」（localStorage），不上傳任何地方，
       換手機或清瀏覽紀錄就會不見——這是刻意的，網站不收集訪客個資。
     ・有收藏時，左下角出現「♥ 收藏（n）」小鈕，點開看清單、移除、
       一鍵「用 LINE 傳給周周」：
         手機 → 用官方 oaMessage 連結直接開聊天室，訊息預填好收藏清單
         電腦 → 複製清單＋開 LINE 加好友頁（電腦版 LINE 是否支援預填官方沒寫）
     ・三語：依檔名 -ja／-cn 自動切換文字。

   ▍資料
     localStorage["chou_favs_v1"] = [{id, t: 物件名, p: 價格, u: 物件頁網址}]
     收藏當下就把名稱與價格存起來，所以清單不用再載入 properties.js；
     價格之後若有調整，清單裡顯示的是收藏當時的價格（點進去看最新的）。

   ▍掛在哪裡
     properties*.html、property*.html（手寫頁的 <script>），
     prop-*.html（generate-pages.cjs／build-ja.cjs 產生；簡中由 build-cn 轉）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__chouFavs) return; window.__chouFavs = 1;
  var KEY = "chou_favs_v1", MAX = 30, LINE_ADD = "https://lin.ee/RscRWCp", OA = "%40202dzwok";
  var path = location.pathname;
  var lang = /-ja\.html$/.test(path) ? "ja" : (/-cn\.html$/.test(path) ? "cn" : "tw");
  var sfx = lang === "ja" ? "-ja" : (lang === "cn" ? "-cn" : "");
  var T = {
    tw: { add: "🤍 收藏這間", added: "♥ 已收藏", chip: "♥ 收藏", title: "我的收藏",
          empty: "還沒有收藏的物件。看到喜歡的，按卡片右上角的 🤍 就會存在這裡。",
          send: "用 LINE 傳給周周", clear: "全部清除", close: "關閉",
          note: "收藏只存在你這支手機／這台電腦的瀏覽器裡，不會上傳。",
          head: "我收藏了這幾間，想詢問：", toastAdd: "已加入收藏 ♥", toastDel: "已移除收藏",
          toastCopy: "已複製收藏清單，在 LINE 貼上傳給周周就可以囉 👌", full: "收藏最多 30 間" },
    cn: { add: "🤍 收藏这间", added: "♥ 已收藏", chip: "♥ 收藏", title: "我的收藏",
          empty: "还没有收藏的房源。看到喜欢的，按卡片右上角的 🤍 就会存在这里。",
          send: "用 LINE 发给周周", clear: "全部清除", close: "关闭",
          note: "收藏只存在你这部手机／这台电脑的浏览器里，不会上传。",
          head: "我收藏了这几间，想询问：", toastAdd: "已加入收藏 ♥", toastDel: "已移除收藏",
          toastCopy: "已复制收藏清单，在 LINE 粘贴发给周周就可以啰 👌", full: "收藏最多 30 间" },
    ja: { add: "🤍 お気に入りに追加", added: "♥ お気に入り済み", chip: "♥ お気に入り", title: "お気に入り物件",
          empty: "お気に入りの物件はまだありません。気になる物件はカード右上の 🤍 から保存できます。",
          send: "LINEで周周に送る", clear: "すべて削除", close: "閉じる",
          note: "お気に入りはお使いの端末のブラウザにのみ保存され、送信されることはありません。",
          head: "お気に入りの物件についてお伺いしたいです：", toastAdd: "お気に入りに追加しました ♥", toastDel: "お気に入りから削除しました",
          toastCopy: "お気に入り一覧をコピーしました。LINEに貼り付けてお送りください 👌", full: "お気に入りは最大30件までです" }
  }[lang];
  var MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { } }
  function has(id) { return load().some(function (x) { return x.id === id; }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pageUrl(id) { return location.origin + location.pathname.replace(/[^\/]*$/, "") + "prop-" + id + sfx + ".html"; }
  function ga(name, extra) { try { if (typeof gtag === "function") gtag("event", name, extra || {}); } catch (e) { } }

  function toggle(id, info) {
    var a = load(), i = -1;
    a.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i >= 0) { a.splice(i, 1); save(a); toast(T.toastDel); }
    else {
      if (a.length >= MAX) { toast(T.full); return; }
      a.unshift({ id: id, t: info.t || id, p: info.p || "", u: pageUrl(id) }); save(a); toast(T.toastAdd);
      ga("favorite_add", { prop_id: id });
    }
    paint();
  }

  /* ── 樣式 ── */
  var css = document.createElement("style");
  css.textContent =
    ".favbtn{position:absolute;top:48px;right:10px;z-index:4;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.18);font-size:18px;line-height:36px;text-align:center;cursor:pointer;padding:0;color:#e11d48}" +
    ".favbtn.on{background:#e11d48;color:#fff}" +
    ".favdet{display:inline-flex;align-items:center;gap:6px;margin:4px 0 12px;padding:8px 14px;border-radius:999px;border:1.5px solid #fecdd3;background:#fff;color:#e11d48;font-weight:700;font-size:14px;cursor:pointer}" +
    ".favdet.on{background:#e11d48;border-color:#e11d48;color:#fff}" +
    ".favchip{position:fixed;left:14px;bottom:78px;z-index:111;display:none;align-items:center;gap:6px;background:#fff;color:#e11d48;border:1.5px solid #fecdd3;border-radius:999px;padding:9px 15px;font-weight:800;font-size:14px;box-shadow:0 6px 18px rgba(0,0,0,.14);cursor:pointer}" +
    ".favpanel{position:fixed;inset:0;z-index:400;display:none;background:rgba(28,25,23,.45)}" +
    ".favbox{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:min(560px,100%);max-height:82vh;overflow:auto;background:#fff;border-radius:18px 18px 0 0;padding:18px 18px 22px;box-shadow:0 -8px 30px rgba(0,0,0,.2)}" +
    ".favbox h3{font-size:18px;margin:0 0 4px}.favbox .fnote{font-size:12.5px;color:#78716c;margin:0 0 12px}" +
    ".favrow{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0ece8}" +
    ".favrow a{flex:1;color:#1c1917;text-decoration:none;line-height:1.5}.favrow a b{display:block;font-size:14.5px}.favrow a span{font-size:13px;color:#e11d48;font-weight:700}" +
    ".favrow button{border:0;background:#f5f5f4;color:#57534e;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px}" +
    ".favact{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}.favact button{flex:1;min-width:140px;border:0;border-radius:12px;padding:12px;font-weight:800;font-size:15px;cursor:pointer}" +
    ".favact .fsend{background:#06c755;color:#fff}.favact .fclr{background:#f5f5f4;color:#57534e;flex:0 0 auto}.favact .fcls{background:#fff;border:1.5px solid #e7e5e4;color:#57534e;flex:0 0 auto}" +
    ".favempty{color:#78716c;font-size:14px;padding:14px 0}";
  document.head.appendChild(css);

  var tip;
  function toast(msg) {
    if (!tip) {
      tip = document.createElement("div");
      tip.style.cssText = "position:fixed;left:50%;bottom:130px;transform:translateX(-50%);max-width:min(92vw,420px);background:#1c1917;color:#fff;padding:11px 16px;border-radius:12px;font-size:14px;line-height:1.6;z-index:500;box-shadow:0 8px 28px rgba(0,0,0,.28);opacity:0;transition:opacity .2s;pointer-events:none;text-align:center";
      document.body.appendChild(tip);
    }
    tip.textContent = msg; tip.style.opacity = "1";
    clearTimeout(tip._t); tip._t = setTimeout(function () { tip.style.opacity = "0"; }, 2600);
  }

  /* ── 物件專區：卡片加 🤍 ── */
  function idFromHref(h) { var m = String(h || "").match(/[?&]id=([^&#]+)/); return m ? decodeURIComponent(m[1]) : ""; }
  function decorateCards() {
    var cards = document.querySelectorAll("#grid a.card");
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], id = idFromHref(c.getAttribute("href"));
      if (!id) continue;
      var ph = c.querySelector(".ph"); if (!ph) continue;
      var b = ph.querySelector(".favbtn");
      if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "favbtn"; b.setAttribute("data-fav", id); ph.appendChild(b); }
      var on = has(id), tx = on ? "♥" : "♡";
      if (b.textContent !== tx) { b.textContent = tx; b.classList.toggle("on", on); b.setAttribute("aria-label", on ? T.added : T.add); }
    }
  }
  function cardInfo(btn) {
    var c = btn.closest("a.card"); if (!c) return {};
    var h = c.querySelector("h3"), t = "";
    if (h) { var cl = h.cloneNode(true); var lt = cl.querySelector(".laytag"); if (lt) lt.remove(); t = cl.textContent.trim(); }
    var pr = c.querySelector(".price"); return { t: t, p: pr ? pr.textContent.trim() : "" };
  }

  /* ── 物件詳情頁：標題下方加按鈕 ── */
  function detailId() {
    var m = path.match(/prop-(.+?)(?:-ja|-cn)?\.html$/); if (m) return decodeURIComponent(m[1]);
    if (/property(?:-ja|-cn)?\.html$/.test(path)) return idFromHref(location.search);
    return "";
  }
  function decorateDetail() {
    var id = detailId(); if (!id) return;
    var h = document.querySelector("h1.atitle, h1.ptitle"); if (!h) return;
    var b = document.querySelector(".favdet");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "favdet"; b.setAttribute("data-favd", id); h.insertAdjacentElement("afterend", b); }
    var on = has(id), tx = on ? T.added : T.add;
    if (b.textContent !== tx) { b.textContent = tx; b.classList.toggle("on", on); }
  }

  /* ── 左下角小鈕＋清單面板 ── */
  var chip, panel;
  function build() {
    chip = document.createElement("button"); chip.type = "button"; chip.className = "favchip";
    chip.onclick = openPanel; document.body.appendChild(chip);
    panel = document.createElement("div"); panel.className = "favpanel";
    panel.onclick = function (e) { if (e.target === panel) closePanel(); };
    document.body.appendChild(panel);
  }
  function listText(a) {
    return [T.head].concat(a.slice(0, 10).map(function (x, i) { return (i + 1) + ". " + x.t + (x.p ? "（" + x.p + "）" : "") + "\n" + x.u; })).join("\n");
  }
  function openPanel() {
    var a = load();
    var rows = a.length ? a.map(function (x) {
      return '<div class="favrow"><a href="' + esc(x.u) + '"><b>' + esc(x.t) + '</b><span>' + esc(x.p) + '</span></a><button type="button" data-del="' + esc(x.id) + '" aria-label="remove">×</button></div>';
    }).join("") : '<p class="favempty">' + esc(T.empty) + '</p>';
    panel.innerHTML = '<div class="favbox"><h3>♥ ' + esc(T.title) + '（' + a.length + '）</h3><p class="fnote">' + esc(T.note) + '</p>' + rows +
      '<div class="favact">' + (a.length ? '<button type="button" class="fsend">' + esc(T.send) + '</button><button type="button" class="fclr">' + esc(T.clear) + '</button>' : "") +
      '<button type="button" class="fcls">' + esc(T.close) + '</button></div></div>';
    panel.style.display = "block";
  }
  function closePanel() { panel.style.display = "none"; }
  function copy(s) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s); return; } } catch (e) { }
    try { var ta = document.createElement("textarea"); ta.value = s; ta.style.cssText = "position:fixed;top:-9999px;opacity:0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e) { }
  }
  function sendLine() {
    var a = load(); if (!a.length) return;
    var txt = listText(a);
    ga("favorites_line", { count: a.length });
    copy(txt);
    if (MOBILE) { location.href = "https://line.me/R/oaMessage/" + OA + "/?" + encodeURIComponent(txt); }
    else { toast(T.toastCopy); window.open(LINE_ADD, "_blank", "noopener"); }
  }

  function paint() {
    decorateCards(); decorateDetail();
    var n = load().length;
    if (chip) { chip.textContent = T.chip + "（" + n + "）"; chip.style.display = n ? "inline-flex" : "none"; }
    if (panel && panel.style.display === "block") openPanel();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var b = t.closest && t.closest(".favbtn");
    if (b) { e.preventDefault(); e.stopPropagation(); toggle(b.getAttribute("data-fav"), cardInfo(b)); return; }
    var d = t.closest && t.closest(".favdet");
    if (d) { e.preventDefault(); var P = window.PROPINFO || {}; toggle(d.getAttribute("data-favd"), { t: P.t || document.title.split("｜")[0], p: P.p || "" }); return; }
    if (!panel || !panel.contains(t)) return;
    var del = t.closest("[data-del]");
    if (del) { var id = del.getAttribute("data-del"); save(load().filter(function (x) { return x.id !== id; })); paint(); openPanel(); return; }
    if (t.closest(".fsend")) { sendLine(); return; }
    if (t.closest(".fclr")) { save([]); paint(); openPanel(); return; }
    if (t.closest(".fcls")) { closePanel(); return; }
  }, true);

  function start() {
    build(); paint();
    /* 物件卡片與詳情頁標題都是 JS 渲染的，篩選、翻頁後會重畫，所以持續觀察 */
    var pend = 0;
    new MutationObserver(function () { if (pend) return; pend = 1; setTimeout(function () { pend = 0; decorateCards(); decorateDetail(); }, 60); })
      .observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", function (e) { if (e.key === KEY) paint(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
