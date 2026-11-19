/* 手機底部導覽列＋第一次來的提示泡泡（周周 2026-11-19 選「A＋C」）
   ・問題：手機版的選單都藏在右上角三條線，很多人不知道網站有物件地圖、買房定位分析、房貸試算這些工具。
   ・A：寬度 820px 以下，每一頁底部固定一排：首頁／物件／工具／文章／LINE。
        點「工具」從下面滑出工具清單。原本右下角浮動的 LINE 鈕收進導覽列
        （物件頁那顆「想看這間？」帶預填訊息，導覽列的 LINE 會沿用它的連結）。
   ・C：第一次來的人，「工具」上方跳一次提示泡泡（localStorage 記住，不會每次跳）。
   ・語言看檔名：ja.html／*-ja.html → 日文；index-cn.html／*-cn.html → 簡中；其他 → 繁中。
     文字刻意寫在這支 js 裡三語各一份（build-cn 不會轉 .js，所以簡中要自己寫）。
   ・載入方式：全站 600 多頁都有 imgguard.js，由它順便載入這支；沒有 imgguard 的手寫頁另外加 <script src="tabbar.js" defer>。
   ・電腦版（821px 以上）完全不出現。 */
(function () {
  if (window.__chouTabbar) return; window.__chouTabbar = 1;
  var f = location.pathname.split("/").pop() || "index.html";
  if (/^(threads-|members-admin|property-admin|stats|google)/.test(f) || /\/t\//.test(location.pathname)) return;
  var L = (f === "ja.html" || /-ja\.html$/.test(f)) ? "ja" : ((f === "index-cn.html" || /-cn\.html$/.test(f)) ? "cn" : "tw");
  var sfx = L === "ja" ? "-ja" : (L === "cn" ? "-cn" : "");
  var HOME = L === "ja" ? "ja.html" : (L === "cn" ? "index-cn.html" : "index.html");
  var LINE = "https://lin.ee/RscRWCp";
  var T = {
    tw: { home: "首頁", prop: "物件", tool: "工具", art: "文章", line: "LINE 諮詢", sheet: "周周的免費工具", close: "關閉",
      tip: "物件地圖、買房試算、房貸計算<br>都在這裡喔",
      tools: [["pin", "物件地圖", "在地圖上看物件大概在哪", "properties.html#pmapSec"], ["target", "買房定位分析", "預算能買到哪一區、什麼房", "tokyo-home-match.html"],
        ["calc", "房貸試算", "每個月要繳多少", "tool-loan.html"], ["chart", "東京區域行情", "23 區房價、人口一次看", "tokyo-area-guide.html"],
        ["doc", "圖面翻譯機", "日文販售圖面翻成中文", "translate.html"], ["grid", "全部工具", "稅費、匯率、投報率…", "tools.html"]] },
    cn: { home: "首页", prop: "物件", tool: "工具", art: "文章", line: "LINE 咨询", sheet: "周周的免费工具", close: "关闭",
      tip: "物件地图、买房试算、房贷计算<br>都在这里哦",
      tools: [["pin", "物件地图", "在地图上看物件大概在哪", "properties-cn.html#pmapSec"], ["target", "买房定位分析", "预算能买到哪一区、什么房", "tokyo-home-match-cn.html"],
        ["calc", "房贷试算", "每个月要缴多少", "tool-loan-cn.html"], ["chart", "东京区域行情", "23 区房价、人口一次看", "tokyo-area-guide-cn.html"],
        ["doc", "图面翻译机", "日文销售图面翻成中文", "translate-cn.html"], ["grid", "全部工具", "税费、汇率、投报率…", "tools-cn.html"]] },
    ja: { home: "ホーム", prop: "物件", tool: "ツール", art: "コラム", line: "LINE相談", sheet: "シュウの無料ツール", close: "閉じる",
      tip: "物件マップ・購入診断・ローン計算は<br>こちらからどうぞ",
      tools: [["pin", "物件マップ", "物件のおおよその場所を地図で", "properties-ja.html#pmapSec"], ["target", "住まい診断", "ご予算で狙えるエリア・物件", "tokyo-home-match-ja.html"],
        ["calc", "ローン計算", "毎月の返済額の目安", "tool-loan-ja.html"], ["chart", "東京エリア相場", "23区の価格・人口をまとめて", "tokyo-area-guide-ja.html"],
        ["doc", "図面翻訳ツール", "販売図面を中国語に翻訳", "translate-ja.html"], ["grid", "すべてのツール", "諸費用・為替・利回り…", "tools-ja.html"]] }
  }[L];
  var P = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    tool: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18h2M12 18h4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>',
    line: '<path d="M12 4C7 4 3 7.2 3 11.2c0 3.6 3.2 6.6 7.5 7.1l-.5 2.7 3.4-2.6c4.6-.3 8.6-3.4 8.6-7.2C21 7.2 17 4 12 4z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'
  };
  var svg = function (k, s) { return '<svg width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[k] + "</svg>"; };
  var ga = function (tab) { try { if (typeof gtag === "function") gtag("event", "tabbar_click", { tab: tab, page: f, lang: L }); } catch (e) { } };
  var cur = f === HOME ? "home"
    : /^(properties|property|prop-)/.test(f) ? "prop"
    : /^(tool|tools|tokyo-home-match|tokyo-area-guide|translate)/.test(f) ? "tool" : "art";
  if (/^(member|feedback|about|privacy|partners|jisha|faq|service|videos|quiz|404)/.test(f)) cur = "";

  function init() {
    if (document.getElementById("chouTab")) return;
    var css = document.createElement("style");
    css.textContent = "#chouTab,#chouSheet,#chouTip{display:none}" +
      "@media(max-width:820px){" +
      "body.has-tb{padding-bottom:calc(64px + env(safe-area-inset-bottom))}" +
      "#chouTab{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:950;background:rgba(255,255,255,.97);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid #eee;box-shadow:0 -4px 16px rgba(0,0,0,.06);padding:6px 4px calc(6px + env(safe-area-inset-bottom));font-family:inherit}" +
      "#chouTab a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px;font-weight:600;color:#78716c;text-decoration:none;-webkit-tap-highlight-color:transparent;min-height:46px}" +
      "#chouTab a.on{color:#e11d48}#chouTab a.tb-line{flex:1.2;color:#fff;background:#06c755;border-radius:14px;margin:0 4px;font-weight:800}" +
      "body.has-tb .line-float{display:none!important}body.has-tb .fsctl{bottom:calc(76px + env(safe-area-inset-bottom))!important}" +
      "body.has-tb #btt{bottom:calc(80px + env(safe-area-inset-bottom))!important}body.has-tb .mstick{bottom:calc(64px + env(safe-area-inset-bottom))!important}" +
      "#chouSheet.open{display:block}#chouSheet .sh-bg{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:960}" +
      "#chouSheet .sh-p{position:fixed;left:0;right:0;bottom:0;z-index:961;background:#fff;border-radius:18px 18px 0 0;padding:14px 18px calc(74px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.15);max-height:80vh;overflow:auto}" +
      "#chouSheet .sh-bar{width:40px;height:4px;border-radius:2px;background:#e7e5e4;margin:0 auto 12px}#chouSheet .sh-h{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:16px;margin-bottom:4px;color:#262626}" +
      "#chouSheet .sh-x{border:0;background:none;color:#a8a29e;font-size:14px;cursor:pointer;font-family:inherit}" +
      "#chouSheet .sh-i{display:flex;align-items:center;gap:13px;padding:12px 2px;border-bottom:1px solid #f5f5f4;text-decoration:none;color:#262626}" +
      "#chouSheet .sh-ic{flex:0 0 auto;width:38px;height:38px;border-radius:11px;background:#fff1f2;color:#e11d48;display:flex;align-items:center;justify-content:center}" +
      "#chouSheet .sh-t{font-weight:700;font-size:14.5px;line-height:1.35}#chouSheet .sh-d{font-size:12px;color:#78716c}#chouSheet .sh-go{margin-left:auto;color:#d6d3d1;font-size:20px}" +
      "#chouTip.show{display:block;position:fixed;z-index:955;bottom:calc(70px + env(safe-area-inset-bottom));background:#262626;color:#fff;font-size:13px;line-height:1.55;border-radius:12px;padding:10px 32px 10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.22);white-space:nowrap;animation:tbPop .35s ease-out}" +
      "#chouTip .tp-x{position:absolute;right:9px;top:7px;color:#a8a29e;font-size:14px;cursor:pointer}#chouTip .tp-a{position:absolute;bottom:-6px;width:12px;height:12px;background:#262626;transform:rotate(45deg)}" +
      "@keyframes tbPop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}";
    document.head.appendChild(css);

    var lf = document.querySelector(".line-float");
    var lineHref = (lf && lf.getAttribute("href")) || LINE;
    var tabs = [["home", "home", T.home, HOME], ["prop", "key", T.prop, "properties" + sfx + ".html"], ["tool", "tool", T.tool, "#"], ["art", "book", T.art, "buy-property-in-japan" + sfx + ".html"]];
    var nav = document.createElement("nav");
    nav.id = "chouTab"; nav.setAttribute("aria-label", "menu");
    nav.innerHTML = tabs.map(function (t) {
      return '<a href="' + t[3] + '" data-tab="' + t[0] + '"' + (cur === t[0] ? ' class="on" aria-current="page"' : "") + ">" + svg(t[1]) + t[2] + "</a>";
    }).join("") + '<a class="tb-line" data-tab="line" href="' + lineHref + '" target="_blank" rel="noopener">' + svg("line") + T.line + "</a>";
    document.body.appendChild(nav);
    document.body.classList.add("has-tb");

    var sh = document.createElement("div");
    sh.id = "chouSheet";
    sh.innerHTML = '<div class="sh-bg"></div><div class="sh-p" role="dialog" aria-label="' + T.sheet + '"><div class="sh-bar"></div><div class="sh-h">' + T.sheet +
      '<button type="button" class="sh-x">' + T.close + " ✕</button></div>" +
      T.tools.map(function (t) { return '<a class="sh-i" href="' + t[3] + '" data-tool="' + t[3] + '"><span class="sh-ic">' + svg(t[0], 20) + '</span><span><span class="sh-t" style="display:block">' + t[1] + '</span><span class="sh-d">' + t[2] + '</span></span><span class="sh-go">›</span></a>'; }).join("") + "</div>";
    document.body.appendChild(sh);
    var close = function () { sh.classList.remove("open"); };
    sh.querySelector(".sh-bg").onclick = close; sh.querySelector(".sh-x").onclick = close;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    sh.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest(".sh-i"); if (a) { ga("tool:" + a.getAttribute("data-tool")); close(); } });

    nav.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a"); if (!a) return;
      var t = a.getAttribute("data-tab"); ga(t); hideTip(true);
      if (t === "line") { var lf2 = document.querySelector(".line-float"); if (lf2 && lf2.href) a.href = lf2.href; }  // 物件頁的預填訊息是載入後才產生，按下去才抓
      if (t === "tool") { e.preventDefault(); sh.classList.toggle("open"); }
    });

    // C：第一次來，工具上方跳一次提示
    var tip = null, KEY = "chou_tb_tip";
    function hideTip(remember) { if (tip) { tip.classList.remove("show"); tip = null; } if (remember) try { localStorage.setItem(KEY, "1"); } catch (e) { } }
    var seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) { seen = true; }
    if (!seen && window.matchMedia && matchMedia("(max-width:820px)").matches) {
      setTimeout(function () {
        var toolA = nav.querySelector('[data-tab="tool"]'); if (!toolA) return;
        tip = document.createElement("div"); tip.id = "chouTip";
        tip.innerHTML = T.tip + '<span class="tp-x">✕</span><span class="tp-a"></span>';
        document.body.appendChild(tip); tip.classList.add("show");
        var r = toolA.getBoundingClientRect(), w = tip.offsetWidth;
        var left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width / 2 - w / 2));
        tip.style.left = left + "px";
        tip.querySelector(".tp-a").style.left = (r.left + r.width / 2 - left - 6) + "px";
        tip.onclick = function () { hideTip(true); };
        try { localStorage.setItem(KEY, "1"); } catch (e) { }
        setTimeout(function () { hideTip(false); }, 9000);
      }, 1800);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
