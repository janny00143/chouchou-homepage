/* ══════════════════════════════════════════════════════════════════
   買房定位分析（tokyo-home-match.html／-ja；簡中由 build-cn 轉）
   周周 2026-11-12：「讓不知道自己多少錢、可以買什麼程度房子的人來評估」
   ・四個條件都可以不填：預算／地區／大小／屋齡。填幾個就分析幾個，填 3 項以上出「買房命盤」。
   ・類型：公寓／新築一戶建／中古一戶建／土地（不選＝用公寓行情分析、配對全部物件）。
   ・不知道預算 → 用年收入、自備款、年齡反推（Flat35 的還款負擔率與年齡上限；利率可自己改）。
   ・價格旁邊附台幣（簡中頁附人民幣）與月付試算；有預算時畫「23 區可負擔地圖」；命盤可以存成圖卡分享。
   ・數據：souba.js（SUUMO 價格相場，fetch-souba.cjs 每週更新）、wards-data.js（地價公示・人口）、
           area-viz.js（只借用 23 區邊界 window.TOKYO23_GEO）、properties.js（周周的在售物件，用來配對）。
   ・文字全部放在頁面的 window.MATCH_T（.js 不會被 build-cn 轉簡體）。
   ・分析結果可以一鍵傳 LINE 給周周；同時匿名存一份到 Firestore「leads」給周周後台看（失敗就略過）。
     ⚠️ leads 的欄位被 firestore.rules 鎖住，年收入等新欄位「不要」寫進去（寫了整筆會被擋）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var T = window.MATCH_T, S = window.SOUBA, W = window.WARDS23;
  if (!T || !S || !W) return;
  var ALLP = (window.PROPERTIES || []).filter(function (p) { return !p.sold; });
  var CODES = Object.keys(W);
  var RANGES = {
    ms: [[0, 40], [40, 60], [60, 80], [80, 100], [100, 9999]],
    hnew: [[0, 80], [80, 100], [100, 120], [120, 9999]],
    hused: [[0, 80], [80, 100], [100, 120], [120, 9999]],
    land: [[0, 60], [60, 80], [80, 100], [100, 120], [120, 9999]]
  };
  var DEF_BAND = { ms: 2, hnew: 1, hused: 1, land: 2 };
  var FURN = { ms: [0, 1, 2, 3, 4], hnew: [2, 3, 3, 4], hused: [2, 3, 3, 4], land: [2, 3, 3, 4, 4] };
  var AGE_MAX = [0, 10, 20, 30, 999];           // 新築／10年內／20年內／30年內／不限
  var NOW_Y = new Date().getFullYear();
  var F35 = window.FLAT35 || {};                // flat35-rate.js（每月 1 號排程更新）
  var RATE_DEF = F35.rate || T.rateDef || 3.81;   // Flat35 當月最頻金利（融資比率9成以下、21〜35年）
  var COST = 0.07;                              // 購屋雜費（仲介費・登記・稅金・火災保險…）粗估比例
  var CUR = T.lang === "ja" ? null : (/-cn\.html$/.test(location.pathname) ? "CNY" : "TWD");
  var FX = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmtMan = function (v) { if (v == null || isNaN(v)) return "—"; v = Math.round(v); return v >= 10000 ? (Math.floor(v / 10000) + T.oku + (v % 10000 ? (v % 10000).toLocaleString() + T.man : "")) : v.toLocaleString() + T.man; };
  var fmt = function (s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] == null ? "" : o[k]; }); };
  var YM = fmt(T.ymFmt || "{y}/{m}", { y: F35.year || 2026, m: F35.month || 11 });
  function ga(n, x) { try { if (typeof gtag === "function") gtag("event", n, x || {}); } catch (e) { } }

  /* ── 狀態 ── */
  function blank() { return { use: null, type: null, budget: null, wards: [], band: null, age: null, people: null, pet: null, inc: null, down: null, ageP: null, res: null, rate: null }; }
  var st = blank();
  function TY() { return st.type || "ms"; }
  function DATA() { var t = TY(); return t === "ms" ? S : (S.types && S.types[t]) || S; }
  function nb() { return RANGES[TY()].length; }
  function bandsL() { return T.bandsT[TY()]; }
  function shortL() { return T.shortT[TY()]; }
  function med(code, b) { var w = DATA().wards[code]; if (!w || !w.bands[b]) return null; var x = w.bands[b]; return x.n >= 2 && x.med != null ? x.med : null; }
  function defBand() { return st.band != null ? st.band : DEF_BAND[TY()]; }

  /* ── 錢：台幣／人民幣、月付 ── */
  function fxTxt(man) {
    if (!CUR || !FX || !man) return "";
    var v = man * FX;      // 萬（外幣）
    return fmt(CUR === "CNY" ? T.fxCN : T.fxTW, { v: v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1) });
  }
  function fxSpan(man) { return CUR ? '<small class="mfx" data-fx="' + Math.round(man || 0) + '">' + fxTxt(man) + '</small>' : ""; }
  function fillFx() { $$(".mfx[data-fx]").forEach(function (el) { el.textContent = fxTxt(+el.getAttribute("data-fx")); }); }
  function loadFx() {
    if (!CUR) return;
    try { var c = JSON.parse(localStorage.getItem("chou_fx") || "null"); if (c && c[CUR] && Date.now() - c.t < 6 * 3600e3) { FX = c[CUR]; return; } } catch (e) { }
    fetch("https://open.er-api.com/v6/latest/JPY").then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.rates || !j.rates[CUR]) return;
      FX = j.rates[CUR]; fillFx();
      try { localStorage.setItem("chou_fx", JSON.stringify({ t: Date.now(), TWD: j.rates.TWD, CNY: j.rates.CNY })); } catch (e) { }
    }).catch(function () { });
  }
  function pmt(loanMan, ratePct, yrs) { var r = ratePct / 100 / 12, n = yrs * 12; if (!loanMan || n <= 0) return 0; return r ? loanMan * r / (1 - Math.pow(1 + r, -n)) : loanMan / n; }
  function pv(monthlyMan, ratePct, yrs) { var r = ratePct / 100 / 12, n = yrs * 12; return r ? monthlyMan * (1 - Math.pow(1 + r, -n)) / r : monthlyMan * n; }
  function rate() { return st.rate > 0 && st.rate < 20 ? st.rate : RATE_DEF; }
  function termYears() { return st.ageP ? Math.max(0, Math.min(35, 80 - st.ageP)) : 35; }
  /* 物件價格 → 月付（有填年收時用他的自備款與可貸成數；沒填就以貸款9成・35年試算） */
  function monthlyOf(price) {
    var L = loanCalc(), ok = L && !L.tooOld && L.ltv;
    if (!ok) return pmt(price * 0.9, rate(), 35);
    return pmt(Math.max(0, Math.min(price * L.ltv, price * (1 + COST) - (st.down || 0))), rate(), L.yrs);   // 跟「買房力」同一套算法（含雜費）
  }
  function monthlyTxt(price) { var m = monthlyOf(price); return m ? fmt(T.monthly, { m: (m >= 10 ? Math.round(m) : m.toFixed(1)) + T.man }) : ""; }

  /* ── 年收反推預算（提案 1）── */
  /* 可貸成數：永住／非永住 7〜8 成／海外居住 6.5〜7 成（周周 2026-11-12 指定；頁面上寫明是試算假設）。
     有範圍的就算兩次，畫面顯示「低〜高」，套用成預算時用保守的低標。 */
  var LTV = [[1.0, 1.0], [0.7, 0.8], [0.65, 0.7]];
  function calcWith(ltv, yrs, ratio, loanMax, down) {
    var p1 = (loanMax + down) / (1 + COST), p2 = ltv < 1 ? down / (1 + COST - ltv) : Infinity;
    var price = Math.floor(Math.min(p1, p2) / 10) * 10;
    if (!(price > 0)) return { yrs: yrs, ltv: ltv, price: 0, loan: 0, monthly: 0, ratio: ratio, capByDown: true };
    var loan = Math.max(0, Math.min(loanMax, price * (1 + COST) - down));
    return { yrs: yrs, ltv: ltv, ratio: ratio, price: price, loan: loan, monthly: pmt(loan, rate(), yrs), capByDown: p2 < p1 };
  }
  function loanCalc() {
    if (!st.inc || st.inc < 100) return null;
    var yrs = termYears(); if (yrs < 5) return { yrs: yrs, tooOld: true, ltv: 0 };
    var ratio = st.inc < 400 ? 0.30 : 0.35;       // Flat35 總返済負擔率基準
    var loanMax = pv(st.inc * ratio / 12, rate(), yrs), down = st.down || 0, R = LTV[st.res || 0];
    var lo = calcWith(R[0], yrs, ratio, loanMax, down), hi = R[1] > R[0] ? calcWith(R[1], yrs, ratio, loanMax, down) : lo;
    lo.hi = hi; return lo;
  }
  function rng(a, b) { return b != null && Math.round(b) > Math.round(a) ? fmtMan(a) + "〜" + fmtMan(b) : fmtMan(a); }
  function loanLine() {
    var el = $("#mLoanOut"); if (!el) return;
    var L = loanCalc();
    if (!L) { el.innerHTML = '<span class="mlo-hint">' + T.loanNeedInc + '</span>'; return; }
    if (L.tooOld) { el.innerHTML = '<span class="mlo-hint">' + T.loanTooOld + '</span>'; return; }
    if (!L.price) { el.innerHTML = '<span class="mlo-hint">' + T.loanNeedDown + '</span>'; return; }
    el.innerHTML = '<div class="mlo-p">' + fmt(T.loanOut, { p: rng(L.price, L.hi.price) }) + ' ' + fxSpan(L.price) + '</div><div class="mlo-s">' +
      fmt(T.loanOutSub, { l: rng(L.loan, L.hi.loan), d: fmtMan(st.down || 0), m: rng(L.monthly, L.hi.monthly), y: L.yrs, r: rate() }) + '</div>' +
      (st.budget === L.price ? '<span class="mlo-ok">' + T.loanApplied + '</span>' : '<button type="button" class="mlo-b" id="mLoanApply">' + T.loanApply + '</button>');
    var ap = $("#mLoanApply");
    if (ap) ap.addEventListener("click", function () { st.budget = L.price; paint(); ga("match_loan_apply"); });
  }

  /* ── 輸入區 ── */
  function chips(el, items, key) {
    el.innerHTML = items.map(function (it) { return '<button type="button" class="mc" data-v="' + esc(it.v) + '">' + it.h + '</button>'; }).join("");
    if (el._bound) return; el._bound = 1;
    el.addEventListener("click", function (e) {
      var b = e.target.closest(".mc"); if (!b) return;
      var v = b.getAttribute("data-v");
      st[key] = (String(st[key]) === v) ? null : (isNaN(+v) ? v : +v);
      if (key === "type") onType();
      paint();
    });
  }
  function renderBand() { chips($("#mBand"), bandsL().map(function (h, i) { return { v: i, h: h }; }), "band"); var s = $("#mBandS"); if (s) s.textContent = T.sizeSubT[TY()]; }
  function onType() {
    if (st.band != null && st.band >= nb()) st.band = null;
    if (TY() === "hnew" || TY() === "land") st.age = null;
    renderBand();
  }
  function paint() {
    $$("#mWards .mc").forEach(function (b) { b.classList.toggle("on", st.wards.indexOf(b.getAttribute("data-v")) >= 0); });
    [["#mType", "type"], ["#mUse", "use"], ["#mBand", "band"], ["#mAge", "age"], ["#mPeople", "people"], ["#mPet", "pet"], ["#mRes", "res"]].forEach(function (x) {
      $$(x[0] + " .mc").forEach(function (b) { b.classList.toggle("on", String(st[x[1]]) === b.getAttribute("data-v")); });
    });
    $$("#mBudgetQ .mc").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-v") === st.budget); });
    [["#mBudget", "budget"], ["#mInc", "inc"], ["#mDown", "down"], ["#mAgeP", "ageP"]].forEach(function (x) { var el = $(x[0]); if (el && document.activeElement !== el) el.value = st[x[1]] ? st[x[1]] : ""; });
    var ra = $("#mRate"); if (ra && document.activeElement !== ra) ra.value = st.rate ? st.rate : RATE_DEF;
    var ar = $("#mAgeRow"); if (ar) ar.style.display = (TY() === "hnew" || TY() === "land") ? "none" : "";
    var bx = $("#mBudgetFx"); if (bx) { bx.setAttribute("data-fx", st.budget || 0); bx.textContent = fxTxt(st.budget); }
    var n = filled(); $("#mGo").textContent = n >= 3 ? T.goFull : T.go;
    $("#mCount").textContent = fmt(T.filled, { n: n });
    loanLine();
  }
  function filled() { return (st.budget ? 1 : 0) + (st.wards.length ? 1 : 0) + (st.band != null ? 1 : 0) + (st.age != null ? 1 : 0); }
  function numIn(sel, key, dec) {
    var el = $(sel); if (!el) return;
    el.addEventListener("input", function () { var v = dec ? parseFloat(String(this.value).replace(/[^\d.]/g, "")) : parseInt(String(this.value).replace(/[^\d]/g, ""), 10); st[key] = v > 0 ? v : null; paint(); });
  }

  function buildInputs() {
    var zones = T.zones;
    $("#mWards").innerHTML = Object.keys(zones).map(function (z) {
      return '<div class="mz"><span class="mzl">' + zones[z] + '</span>' + CODES.filter(function (c) { return W[c].zone === z; })
        .map(function (c) { return '<button type="button" class="mc" data-v="' + c + '">' + T.wardNames[c] + '</button>'; }).join("") + '</div>';
    }).join("");
    $("#mWards").addEventListener("click", function (e) {
      var b = e.target.closest(".mc"); if (!b) return; var v = b.getAttribute("data-v"), i = st.wards.indexOf(v);
      if (i >= 0) st.wards.splice(i, 1); else st.wards.push(v); paint();
    });
    var tys = ["ms", "hnew", "hused", "land"].filter(function (k) { return k === "ms" || (S.types && S.types[k]); });
    chips($("#mType"), tys.map(function (k) { return { v: k, h: T.typeNames[k] }; }), "type");
    renderBand();
    if ($("#mUse")) chips($("#mUse"), T.uses.map(function (h, i) { return { v: i, h: h }; }), "use");
    chips($("#mAge"), T.ages.map(function (h, i) { return { v: i, h: h }; }), "age");
    chips($("#mPeople"), T.people.map(function (h, i) { return { v: i, h: h }; }), "people");
    chips($("#mPet"), T.pet.map(function (h, i) { return { v: i, h: h }; }), "pet");
    if ($("#mRes")) chips($("#mRes"), T.res.map(function (h, i) { return { v: i, h: h }; }), "res");
    $("#mBudgetQ").innerHTML = T.budgetQuick.map(function (v) { return '<button type="button" class="mc" data-v="' + v + '">' + fmtMan(v) + '</button>'; }).join("");
    $("#mBudgetQ").addEventListener("click", function (e) { var b = e.target.closest(".mc"); if (!b) return; var v = +b.getAttribute("data-v"); st.budget = st.budget === v ? null : v; paint(); });
    var rs = $("#mRateS"); if (rs && T.rateLbl) rs.textContent = fmt(T.rateLbl, { ym: YM });
    numIn("#mBudget", "budget"); numIn("#mInc", "inc"); numIn("#mDown", "down"); numIn("#mAgeP", "ageP"); numIn("#mRate", "rate", true);
    $("#mReset").addEventListener("click", function () { st = blank(); onType(); paint(); $("#mOut").innerHTML = ""; stkUpd(); history.replaceState(null, "", location.pathname); });
    $("#mGo").addEventListener("click", run);
  }

  /* ── 物件解析（配對用）── */
  var NORM = { "黑": "黒", "澀": "渋", "豐": "豊", "戶": "戸", "區": "区" };
  var WARD_BY_NAME = {}; CODES.forEach(function (c) { WARD_BY_NAME[T.wardJa[c]] = c; });
  function normName(s) { return String(s).replace(/[黑澀豐戶區]/g, function (c) { return NORM[c]; }); }
  function parseYen(s) { var m = String(s || "").match(/(?:([\d.]+)\s*[億亿])?\s*(?:([\d,]+)\s*[万萬])?\s*円/); if (!m || (!m[1] && !m[2])) return 0; return (m[1] ? parseFloat(m[1]) * 10000 : 0) + (m[2] ? parseInt(m[2].replace(/,/g, ""), 10) : 0); }
  var PROPS = ALLP.map(function (p) {
    var loc = normName(p.location || ""), m = loc.match(/東京都([^\s　]{1,4}?区)/), code = m ? WARD_BY_NAME[m[1]] : null;
    if (!code) return null;
    var priceStr = String(p.price || ""), total = priceStr.match(/(?:總額|总额)[^\n]*/);
    var price = total ? parseYen(total[0]) : parseYen(priceStr.split("\n")[0]);
    if (p.priceList && p.priceList.length) price = parseYen(p.priceShort || priceStr);
    var area = 0, sz = String(p.size || ""), lay = String(p.layout || "");
    if (p.cat === "land") { var fm = lay.match(/(?:總樓地板|总楼地板)約?([\d.]+)㎡/); area = fm ? +fm[1] : 0; }
    else if (p.cat === "house") { var hm = sz.match(/建物(?:面積)?約?([\d.]+)㎡/); area = hm ? +hm[1] : 0; }
    else { var am = sz.match(/([\d.]+)㎡/); area = am ? +am[1] : 0; }
    var ag = String(p.age || ""), age = /新築/.test(ag) || p.cat === "land" ? 0 : (function () { var y = ag.match(/(\d{4})年/); return y ? Math.max(0, NOW_Y - +y[1]) : null; })();
    var lm = sz.match(/土地(?:面積)?約?([\d.]+)㎡/), landArea = lm ? +lm[1] : 0;   // 類型選「土地」時用土地面積配對
    return { p: p, code: code, price: price, area: area, landArea: landArea, age: age };
  }).filter(function (x) { return x && x.price > 0; });

  function typeOk(x) { var c = x.p.cat; if (!st.type) return true; return st.type === "land" ? c === "land" : st.type === "ms" ? (c === "live" || c === "invest") : c === "house"; }
  function bandOf(a) { var R = RANGES[TY()]; for (var i = 0; i < R.length; i++) if (a >= R[i][0] && a < R[i][1]) return i; return R.length - 1; }
  function scoreProp(x) {
    if (!typeOk(x)) return null;
    var s = 0, why = [], stretch = 0, inW = !st.wards.length || st.wards.indexOf(x.code) >= 0;
    var ar = st.type === "land" ? x.landArea : x.area, bd = st.band != null && ar ? Math.abs(bandOf(ar) - st.band) : 0;
    if (st.budget) {
      var r = x.price / st.budget;
      if (r <= 1.0 && r >= 0.55) { s += 4 - (1 - r) * 3; why.push(T.whyBudget); }
      else if (r < 0.55) s += 0.5;
      else if (r <= 1.08) { s += 1.5; why.push(T.whyBudgetNear); }
      /* 周周 2026-11-13 優化：同區、大小也對，只是超出預算一點點的自家物件不要藏起來（頭期款、議價都還有空間） */
      else if (r <= 1.25 && inW && bd <= 1) { s += 0.8; stretch = x.price - st.budget; }
      else return null;
    }
    if (st.wards.length) { if (inW) { s += 3; why.push(T.whyWard); } else s -= 3; }
    if (st.band != null && ar && (st.type || x.p.cat === "live" || x.p.cat === "invest")) { if (bd === 0) { s += 2.5; why.push(T.whySize); } else if (bd === 1) s += 0.8; else s -= 1; }
    if (st.age != null && st.age < 4) { if (x.age != null && x.age <= AGE_MAX[st.age]) { s += 2; why.push(T.whyAge); } else s -= 1; }
    if (st.type === "hnew" && x.age > 0) s -= 1;
    if (st.type === "hused" && x.age === 0) s -= 1;
    if (st.type) { s += 1; why.unshift(T.typeNames[st.type].replace(/（.*$/, "")); }
    if (st.people != null && x.area) { var need = [25, 45, 60, 75][st.people] || 60; if (x.area >= need) s += 0.5; }
    var inv = x.p.cat === "invest";
    if (inv) s += st.use === 1 ? 2.5 : st.use === 0 ? -2.5 : -0.8;
    else if (st.use === 1 && x.p.cat === "live") s -= 0.5;
    var y = inv ? String(x.p.yield || "").match(/[\d.]+%/) : null;
    return { x: x, s: s, why: why, stretch: stretch, yld: y ? y[0] : (inv ? "" : null) };
  }

  /* ── 23 區地圖（提案 6：可負擔地圖）── */
  var SH = null, MAPW = 800, MAPH = 0;
  function shapes() {
    if (SH) return SH; var G = window.TOKYO23_GEO; if (!G) return null;
    var cx = Math.cos(35.68 * Math.PI / 180), minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    G.features.forEach(function (f) { f.geometry.coordinates.forEach(function (poly) { poly[0].forEach(function (p) { var x = p[0] * cx, y = -p[1]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }); }); });
    var sc = MAPW / (maxX - minX); MAPH = Math.round((maxY - minY) * sc);
    var P = function (p) { return [(p[0] * cx - minX) * sc, (-p[1] - minY) * sc]; };
    SH = {};
    G.features.forEach(function (f) {
      var d = "", best = 0, cen = [0, 0];
      f.geometry.coordinates.forEach(function (poly) {
        poly.forEach(function (ring) { d += "M" + ring.map(function (p) { var q = P(p); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join("L") + "Z"; });
        var r = poly[0].map(P), A = 0, X = 0, Y = 0;
        for (var i = 0; i < r.length - 1; i++) { var c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; A += c; X += (r[i][0] + r[i + 1][0]) * c; Y += (r[i][1] + r[i + 1][1]) * c; }
        if (Math.abs(A) > best) { best = Math.abs(A); cen = [X / (3 * A), Y / (3 * A)]; }
      });
      SH[f.properties.c] = { d: d, c: cen };
    });
    return SH;
  }
  var MAPC = ["#22c55e", "#60a5fa", "#fbbf24", "#fb7185", "#e7e5e4"];
  var MAPINFO = {};
  function secMap() {
    if (!st.budget || !shapes()) return "";
    var isLand = TY() === "land", b = defBand(), B = st.budget;
    MAPINFO = {};
    var paths = CODES.map(function (c) {
      var s = SH[c]; if (!s) return ""; var m = med(c, b), k = m == null ? 4 : verdict(B / m);
      if (isLand) { var lw = landW(c); MAPINFO[c] = lw && lw.tsubo ? fmt(T.mapTipLand, { w: T.wardNames[c], t: Math.round(B / lw.tsubo), p: lw.tsubo.toFixed(1) }) : fmt(T.mapTipNA, { w: T.wardNames[c] }); }
      else MAPINFO[c] = m == null ? fmt(T.mapTipNA, { w: T.wardNames[c] }) : fmt(T.mapTip, { w: T.wardNames[c], band: shortL()[b], m: fmtMan(m), p: Math.round(m / B * 100) });
      return '<path d="' + s.d + '" fill="' + MAPC[k] + '" data-c="' + c + '"><title>' + esc(MAPINFO[c]) + '</title></path>';
    }).join("");
    /* 外框另外畫在最上層，才不會被隔壁區的白邊蓋掉一角 */
    var selOl = st.wards.map(function (c) { return SH[c] ? '<path d="' + SH[c].d + '"/>' : ""; }).join("");
    var labels = CODES.map(function (c) { var s = SH[c]; return s ? '<text x="' + s.c[0].toFixed(0) + '" y="' + s.c[1].toFixed(0) + '">' + T.wardShort[c] + '</text>' : ""; }).join("");
    return '<div class="msec mmapsec"><h3>' + T.mapTitle + '</h3><p class="msub">' + fmt(T.mapSub, { band: (st.type ? T.typeNoun[st.type] + '・' : '') + bandsL()[b], b: fmtMan(B) }) + '</p>' +
      '<svg viewBox="0 0 ' + MAPW + ' ' + MAPH + '" class="mmap" role="img" aria-label="' + esc(T.mapTitle) + '"><g class="mmp">' + paths + '</g><g class="mmsel">' + selOl + '</g><path class="mmhv" d=""/><g class="mmt">' + labels + '</g></svg>' +
      '<div class="mmleg">' + T.mapLeg.map(function (l, i) { return '<span><i style="background:' + MAPC[i] + '"></i>' + l + '</span>'; }).join("") + '</div>' +
      '<div class="mminfo" id="mMapInfo">' + T.mapHint + '</div></div>';
  }
  function bindMap(out) {
    var svg = $(".mmap", out); if (!svg) return;
    var show = function (e) { var p = e.target.closest("path[data-c]"); if (!p) return; var c = p.getAttribute("data-c"); $("#mMapInfo").textContent = MAPINFO[c]; $(".mmhv", svg).setAttribute("d", SH[c] ? SH[c].d : ""); };
    svg.addEventListener("mousemove", show); svg.addEventListener("click", show);
  }

  /* ── 分析 ── */
  function verdict(r) { return r >= 1.15 ? 0 : r >= 0.95 ? 1 : r >= 0.8 ? 2 : 3; }  // 0 餘裕 1 剛好 2 有點緊 3 需要調整
  function wardList() { return st.wards.length ? st.wards : CODES; }
  function landW(c) { return S.types && S.types.land && S.types.land.wards[c]; }

  function secLoan() {
    var L = loanCalc(); if (!L || L.tooOld || !L.price) return "";
    var r = rate(), notes = T.loanAssume.map(function (s) { return '<li>' + fmt(s, { r: r, ym: YM }) + '</li>'; });
    if (st.res === 1) notes.push('<li>' + T.loanRes1 + '</li>'); if (st.res === 2) notes.push('<li>' + T.loanRes2 + '</li>');
    if (L.capByDown) notes.push('<li>' + T.loanCapDown + '</li>');
    if (L.hi.price > L.price) notes.push('<li>' + fmt(T.loanRangeNote, { p: fmtMan(L.price) }) + '</li>');
    var tile = function (k, v, sub) { return '<div class="mls"><small>' + k + '</small><b>' + v + '</b>' + (sub || "") + '</div>'; };
    return '<div class="msec mloansec"><h3>' + T.secLoan + '</h3><p class="msub">' + T.secLoanSub + '</p><div class="mlgrid">' +
      tile(T.kPrice, rng(L.price, L.hi.price), fxSpan(L.price)) + tile(T.kLoan, rng(L.loan, L.hi.loan), fxSpan(L.loan)) +
      tile(T.kMonthly, rng(L.monthly, L.hi.monthly), fxSpan(L.monthly)) + tile(T.kYears, fmt(T.yearsU, { y: L.yrs }), '<small class="mfx">' + fmt(T.rateU, { r: r }) + '</small>') +
      '</div><ul class="mlnote">' + notes.join("") + '</ul><p class="mlcta">' + T.loanCta + '</p></div>';
  }
  function secBudget() {
    var B = st.budget, h;
    if (TY() === "land") {
      /* 土地：預算 ÷ 各區坪單價 = 大概買得到幾坪（不含建築費） */
      var rows = wardList().map(function (c) { var w = landW(c); return w && w.tsubo ? { c: c, t: w.tsubo, n: w.n } : null; }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
      h = '<div class="msec"><h3>' + T.secBudgetLand + '</h3><p class="msub">' + fmt(T.secBudgetLandSub, { b: fmtMan(B) }) + '</p><div class="mgrid">';
      h += rows.map(function (r) { var tb = B / r.t; return '<div class="mtile z-' + W[r.c].zone + '"><b>' + T.wardNames[r.c] + '</b><span class="big">' + fmt(T.tsuboBig, { t: Math.round(tb) }) + '</span><small>' + fmt(T.tsuboAt, { t: r.t.toFixed(1), m: Math.round(tb * 3.30579) }) + '</small></div>'; }).join("");
      return h + '</div><p class="mnote">' + T.landNote + '</p></div>';
    }
    /* 每一區「這個預算買得到的最大面積帶」 */
    var all = wardList().map(function (c) {
      var best = -1; for (var b = 0; b < nb(); b++) { var m = med(c, b); if (m != null && m <= B) best = b; }
      return { c: c, best: best };
    });
    var can = all.filter(function (r) { return r.best >= 0; }).sort(function (a, b) { return b.best - a.best || W[b.c].land - W[a.c].land; });
    /* 中央值買不到、但價格帶下限落在預算內的區＝「有機會」（周周：1,000〜2,000萬其實有物件） */
    var maybe = all.filter(function (r) { return r.best < 0; }).map(function (r) {
      var w = DATA().wards[r.c], hit = null; if (w) for (var b = 0; b < nb(); b++) { var x = w.bands[b]; if (x && x.n >= 1 && x.lo != null && x.lo <= B) { hit = { b: b, lo: x.lo }; break; } }
      return hit ? { c: r.c, b: hit.b, lo: hit.lo } : null; }).filter(Boolean).sort(function (a, b) { return a.lo - b.lo; });
    var cannot = all.filter(function (r) { return r.best < 0 && !maybe.some(function (x) { return x.c === r.c; }); });
    h = '<div class="msec"><h3>' + T.secBudget + '</h3><p class="msub">' + fmt(T.secBudgetSub, { b: fmtMan(B), noun: T.typeNoun[TY()] }) + '</p><div class="mgrid">';
    h += can.map(function (r) {
      var m = med(r.c, r.best);
      return '<div class="mtile z-' + W[r.c].zone + '"><b>' + T.wardNames[r.c] + '</b><span class="big">' + shortL()[r.best] + '</span><small>' + fmt(T.medAt, { m: fmtMan(m) }) + '</small></div>';
    }).join("");
    h += maybe.map(function (r) { return '<div class="mtile maybe z-' + W[r.c].zone + '"><b>' + T.wardNames[r.c] + '</b><span class="big">' + shortL()[r.b] + '</span><small>' + fmt(T.chanceAt, { m: fmtMan(r.lo) }) + '</small></div>'; }).join("");
    h += cannot.map(function (r) { return '<div class="mtile off"><b>' + T.wardNames[r.c] + '</b><span class="big">—</span><small>' + T.outOfReach + '</small></div>'; }).join("");
    h += '</div>' + (maybe.length ? '<p class="mnote">' + T.chanceNote + '</p>' : '') + '</div>';
    if (!can.length && !maybe.length) h += secNoResult();
    return h;
  }
  function secWard() {
    var ws = st.wards.slice(0, 3), isLand = TY() === "land";
    return '<div class="msec"><h3>' + fmt(T.secWard, { noun: T.typeNoun[TY()] }) + '</h3>' + ws.map(function (c) {
      var w = DATA().wards[c], lp = W[c];
      if (!w) return '<div class="mward"><div class="mwh"><b>' + T.wardNames[c] + '</b></div><p class="msub">' + T.fewData + '</p></div>';
      var rows = w.bands.map(function (b, i) {
        var has = b.n >= 2 && b.med != null, okB = st.budget ? (has && b.med <= st.budget) : null;
        var rng = isLand ? (b.tsubo ? fmt(T.tsuboAt2, { t: b.tsubo.toFixed(1) }) : T.fewData) : (has ? fmtMan(b.lo) + '〜' + fmtMan(b.hi) : T.fewData);
        return '<tr' + (st.band === i ? ' class="hl"' : '') + '><td>' + shortL()[i] + '</td><td class="num">' + (has ? fmtMan(b.med) + fxSpan(b.med) : '—') + '</td><td class="num rng">' + rng + '</td>' + (st.budget ? '<td>' + (!has ? '' : okB ? '<span class="ok">✓</span>' : '<span class="ng">✕</span>') + '</td>' : '') + '</tr>';
      }).join("");
      var bi = defBand(), stns = ((w.bands[bi] || {}).stations || []).slice().sort(function (a, b) { return a.med - b.med; });
      var inB = st.budget ? stns.filter(function (s) { return s.med <= st.budget; }) : stns;
      var pick = (inB.length ? inB : stns).slice(0, 4);
      return '<div class="mward"><div class="mwh"><b>' + T.wardNames[c] + '</b><span class="mzb z-' + lp.zone + '">' + T.zones[lp.zone] + '</span>' +
        (isLand && w.tsubo ? '<span class="mkv">' + fmt(T.landAll, { t: w.tsubo.toFixed(1), n: w.n }) + '</span>' : '') +
        '<span class="mkv">' + fmt(T.landLine, { p: (lp.land / 10000).toFixed(1), c: lp.chg.toFixed(1) }) + '</span><span class="mkv">' + fmt(T.popLine, { p: (lp.pop / 10000).toFixed(1) }) + '</span></div>' +
        '<table class="mtab"><thead><tr><th>' + T.thSizeT[TY()] + '</th><th>' + (isLand ? T.thMedLand : T.thMed) + '</th><th>' + (isLand ? T.thRangeLand : T.thRange) + '</th>' + (st.budget ? '<th>' + T.thFit + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table>' +
        (pick.length ? '<p class="mst">' + fmt(inB.length && st.budget ? T.stationsIn : T.stationsCheap, { band: shortL()[bi] }) + pick.map(function (s) { return '<span>' + esc(s.st) + ' ' + fmtMan(s.med) + '</span>'; }).join("") + '</p>' : '') + '</div>';
    }).join("") + (isLand ? '<p class="mnote">' + T.landNote + '</p>' : '') + '</div>';
  }
  function secSize() {
    var b = st.band, rows = CODES.map(function (c) { return { c: c, m: med(c, b) }; }).filter(function (r) { return r.m != null; }).sort(function (a, b) { return a.m - b.m; });
    var mx = rows.length ? rows[rows.length - 1].m : 1;
    return '<div class="msec"><h3>' + fmt(T.secSize, { band: bandsL()[b] }) + '</h3><p class="msub">' + fmt(T.secSizeSub, { noun: T.typeNoun[TY()] }) + '</p><div class="mbars">' + rows.map(function (r, i) {
      var ok = st.budget ? r.m <= st.budget : null;
      return '<div class="mbar' + (ok === false ? ' dim' : '') + '"><span class="n">' + (i + 1) + '. ' + T.wardNames[r.c] + '</span><span class="bw"><i class="z-' + W[r.c].zone + '" style="width:' + Math.max(3, r.m / mx * 100).toFixed(1) + '%"></i></span><span class="v">' + fmtMan(r.m) + '</span></div>';
    }).join("") + '</div>' + (st.budget ? '<p class="mnote">' + fmt(T.sizeBudgetNote, { b: fmtMan(st.budget) }) + '</p>' : '') + (TY() === "land" ? '<p class="mnote">' + T.landNote + '</p>' : '') + '</div>';
  }
  function secAge() {
    var a = st.age, list = PROPS.filter(function (x) { return x.age != null && (a === 4 || x.age <= AGE_MAX[a]) && x.p.cat !== "land" && typeOk(x); });
    var byZone = {}; list.forEach(function (x) { var z = W[x.code].zone; (byZone[z] = byZone[z] || []).push(x.price); });
    var zs = Object.keys(byZone).map(function (z) { var v = byZone[z].slice().sort(function (p, q) { return p - q; }); return { z: z, n: v.length, lo: v[0], hi: v[v.length - 1] }; });
    return '<div class="msec"><h3>' + fmt(T.secAge, { a: T.ages[a] }) + '</h3><p class="msub">' + T.ageTips[a] + '</p>' +
      (zs.length ? '<div class="mgrid">' + zs.map(function (r) { return '<div class="mtile z-' + r.z + '"><b>' + T.zones[r.z] + '</b><span class="big">' + r.n + T.unitCase + '</span><small>' + fmtMan(r.lo) + (r.hi !== r.lo ? '〜' + fmtMan(r.hi) : '') + '</small></div>'; }).join("") + '</div><p class="mnote">' + T.ageNote + '</p>' : '<p class="mnote">' + T.ageNone + '</p>') + '</div>';
  }
  function secVerdict() {
    /* 綜合定位：有預算＋大小時，算每區中央值與預算的比例 */
    var B = st.budget, b = st.band, pick = wardList().map(function (c) { var m = med(c, b); return m == null ? null : { c: c, m: m, r: B / m }; }).filter(Boolean);
    if (!pick.length) return "";
    pick.sort(function (x, y) { return y.r - x.r; });
    var bestR = pick[0].r, v = verdict(bestR);
    if (TY() === "ms" && st.age != null && st.age <= 1 && v < 3) v++;   // 新築・築淺通常高於中央值：結論往保守調一級
    var total = pick.length, fit = pick.filter(function (p) { return p.r >= 0.95; }).length;
    var pos = Math.round(fit / total * 100);
    var mb = fit ? 0 : wardList().filter(function (c) { var w = DATA().wards[c], x = w && w.bands[b]; return x && x.lo != null && x.lo <= B; }).length;
    return '<div class="msec mverdict v' + v + '"><div class="mvl">' + T.vLabel + '</div><div class="mvt">' + T.verdicts[v] + '</div><p>' + fmt(T.verdictTxt[v], { b: fmtMan(B), band: (st.type ? T.typeNoun[st.type] + '・' : '') + bandsL()[b], n: fit, t: total, w: T.wardNames[pick[0].c] }) + '</p>' +
      '<div class="mmeter"><i style="width:' + Math.max(4, pos) + '%"></i></div><p class="msub">' + (mb ? fmt(T.meterMaybe, { n: mb }) : fmt(T.meter, { p: pos })) + '</p>' +
      (TY() !== "land" ? '<p class="mvm">' + fmt(T.verdictMonthly, { b: fmtMan(B), m: monthlyTxt(B) }) + ' ' + fxSpan(B) + '</p>' : '') +
      (v >= 2 ? '<ul class="madj">' + T.adjust.map(function (s) { return '<li>' + s + '</li>'; }).join("") + '</ul>' : '') + '</div>';
  }
  function secProps() {
    var sc = PROPS.map(scoreProp).filter(function (r) { return r && r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 6);
    if (!sc.length) return '<div class="msec"><h3>' + T.secProps + '</h3><p class="msub">' + T.noProps + '</p>' + lineBtn() + '</div>';
    var sfx = T.sfx, L = loanCalc(), own = L && !L.tooOld && L.ltv;
    return '<div class="msec"><h3>' + T.secProps + '</h3><p class="msub">' + T.secPropsSub + '</p><div class="mprops">' + sc.map(function (r) {
      var p = r.x.p, ph = (p.photos && p.photos[0]) || "", t = T.lang === "ja" ? p.title : (p.title_cn || p.title);
      return '<a class="mprop" href="prop-' + encodeURIComponent(p.id) + sfx + '.html" onclick="try{gtag(\'event\',\'match_prop_click\')}catch(e){}">' +
        (ph ? '<img src="' + esc(ph) + '" alt="" loading="lazy">' : '<div class="noimg">🏠</div>') +
        '<div class="mpb"><b>' + esc(t) + '</b><span class="pr">' + fmtMan(r.x.price) + (p.cat === "land" ? T.landTotal : "") + '</span>' + fxSpan(r.x.price) +
        '<span class="mpm">' + monthlyTxt(r.x.price) + '</span><span class="mt">' + T.wardNames[r.x.code] + (r.x.area ? '・' + r.x.area + '㎡' : '') + (r.x.age != null ? '・' + (r.x.age === 0 ? T.newBuild : fmt(T.ageY, { y: r.x.age })) : '') + '</span>' +
        (r.yld != null ? '<span class="why iv">' + (r.yld ? fmt(T.yieldTag, { y: r.yld }) : T.uses[1]) + '</span>' : '') +
        (r.stretch ? '<span class="why st">' + fmt(T.whyStretch, { d: fmtMan(r.stretch) }) + '</span>' : r.why.length ? '<span class="why">' + r.why.join("・") + '</span>' : '') + '</div></a>';
    }).join("") + '</div><p class="mnote">' + fmt(own ? T.monthlyNoteOwn : T.monthlyNote, { r: rate(), y: own ? L.yrs : 35 }) + '</p></div>';
  }
  /* 去 SUUMO 看符合條件的物件（周周 2026-11-12：讓客戶知道他可能有哪些選擇，可以原連結）。
     ⚠️ 不把別家的物件抓下來放在我們網站（廣告規約：未經同意不得刊登他社物件），只給「帶好條件的搜尋連結」。
     參數已實測：bs＝011 中古公寓／020 新築戶建／021 中古戶建／030 土地；sc=區碼 kt=價格上限(萬)
     面積：公寓 mb/mt（專有）、戶建 hb/ht（建物）、土地 tb/tt（土地）；cn=屋齡上限。 */
  var BS = { ms: "011", hnew: "020", hused: "021", land: "030" }, AP = { ms: ["mb", "mt"], hnew: ["hb", "ht"], hused: ["hb", "ht"], land: ["tb", "tt"] };
  function suumoUrl(c) {
    var t = TY(), R = RANGES[t], u = "https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?ar=030&bs=" + BS[t] + "&ta=13&sc=" + c + "&pc=30";
    /* SUUMO 的價格上限只接受固定值（500〜8000 每 500、9000、10000、12000），其他數字會跳錯誤頁（周周 2026-11-13：連結都不能用） */
    if (st.budget) { var want = st.budget * 1.05, KT = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 9000, 10000, 12000];
      for (var k = 0; k < KT.length; k++) if (KT[k] >= want) { u += "&kt=" + KT[k]; break; } }
    if (st.band != null) { u += "&" + AP[t][0] + "=" + R[st.band][0]; if (R[st.band][1] < 9999) u += "&" + AP[t][1] + "=" + R[st.band][1]; }
    if (st.age != null && st.age < 4 && (t === "ms" || t === "hused")) u += "&cn=" + [1, 10, 20, 30][st.age];
    return u;
  }
  function secLinks() {
    var ws = st.wards.length ? st.wards.slice(0, 6) : (function () {
      var b = defBand();
      return CODES.map(function (c) { var m = med(c, b); return { c: c, m: m }; }).filter(function (r) { return r.m != null && (!st.budget || r.m <= st.budget * 1.1); })
        .sort(function (a, b) { return st.budget ? (W[b.c].land - W[a.c].land) : (a.m - b.m); }).slice(0, 6).map(function (r) { return r.c; });
    })();
    if (!ws.length && st.budget) {
      /* 中央值都買不到時，改挑「有一部分物件在預算內」的區（價格帶下限最低的 6 區） */
      ws = CODES.map(function (c) { var w = DATA().wards[c], lo = null; if (w) w.bands.forEach(function (x) { if (x && x.lo != null && (lo == null || x.lo < lo)) lo = x.lo; }); return { c: c, lo: lo }; })
        .filter(function (r) { return r.lo != null && r.lo <= st.budget; }).sort(function (a, b) { return a.lo - b.lo; }).slice(0, 6).map(function (r) { return r.c; });
    }
    if (!ws.length) return "";
    return '<div class="msec"><h3>' + T.secLinks + '</h3><p class="msub">' + fmt(T.secLinksSub, { noun: T.typeNoun[TY()] }) + '</p><div class="mlk">' + ws.map(function (c) {
      return '<a href="' + suumoUrl(c) + '" target="_blank" rel="noopener nofollow" onclick="try{gtag(\'event\',\'match_suumo\')}catch(e){}"><b>' + T.wardNames[c] + '</b><span>' + T.linksBtn + ' ↗</span></a>';
    }).join("") + '</div><p class="mnote">' + T.linksNote + '</p></div>';
  }
  var FATE = {};
  function secFate() {
    /* 買房命盤（趣味）：條件填 3 項以上才出現 */
    var c = (st.wards[0]) || (function () { if (!st.budget) return "13112"; var best = null; CODES.forEach(function (k) { var m = med(k, defBand()); if (m != null && m <= st.budget && (!best || W[k].land > W[best].land)) best = k; }); return best || "13121"; })();
    var z = W[c].zone, b = defBand();
    var furn = T.furniture[FURN[TY()][b]], pet = st.pet === 0 ? T.petYes : st.pet === 1 ? T.petNo : "";
    FATE = { c: c, z: z, b: b };
    return '<div class="msec mfate"><div class="mfcard"><div class="mff"><span class="mfs">✦</span><b>' + T.fateTitle + '</b><small>' + T.fateTap + '</small></div><div class="mfb">' +
      '<div class="mfname">' + T.fateName[z] + '</div><p>' + T.fateDesc[z] + '</p>' +
      '<div class="mfrow"><span>🧭 ' + T.fsLabel + '</span><p>' + T.fengshui[z] + '</p></div>' +
      '<div class="mfrow"><span>🛋️ ' + T.furnLabel + '</span><p>' + fmt(T.furnTxt, { band: bandsL()[b] }) + furn + '</p></div>' +
      (pet ? '<div class="mfrow"><span>🐾 ' + T.petLabel + '</span><p>' + pet + '</p></div>' : '') +
      '<div class="mfrow"><span>🍀 ' + T.luckyLabel + '</span><p>' + fmt(T.luckyTxt, { w: T.wardNames[c] }) + '</p></div>' +
      '<p class="mfnote">' + T.fateNote + '</p></div></div>' +
      '<div class="mshare"><button type="button" id="mShare">' + T.shareBtn + '</button></div></div>';
  }

  /* ── 命盤分享圖卡（提案 4）：1080×1350（IG 直式），畫在 canvas 上，手機用分享、電腦直接下載 ── */
  function wrapText(ctx, text, maxW) {
    var lines = [], cur = "";
    String(text).split("").forEach(function (ch) { if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch; });
    if (cur) lines.push(cur); return lines;
  }
  function drawCard() {
    var cv = document.createElement("canvas"), Wd = 1080, Hd = 1350; cv.width = Wd; cv.height = Hd;
    var ctx = cv.getContext("2d"), ff = getComputedStyle(document.body).fontFamily || "sans-serif";
    var g = ctx.createLinearGradient(0, 0, Wd, Hd); g.addColorStop(0, "#1e1b4b"); g.addColorStop(0.55, "#4c1d95"); g.addColorStop(1, "#831843");
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
    for (var i = 0; i < 70; i++) { ctx.globalAlpha = Math.random() * 0.5 + 0.1; ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(Math.random() * Wd, Math.random() * Hd, Math.random() * 2.6 + 0.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "700 34px " + ff; ctx.fillText(T.cardBrand, Wd / 2, 110);
    ctx.fillStyle = "#fde68a"; ctx.font = "900 52px " + ff; ctx.fillText("✦ " + T.fateTitle + " ✦", Wd / 2, 200);
    var ng = ctx.createLinearGradient(200, 0, 880, 0); ng.addColorStop(0, "#fde68a"); ng.addColorStop(0.5, "#fbcfe8"); ng.addColorStop(1, "#a7f3d0");
    ctx.fillStyle = ng; ctx.font = "900 108px " + ff; ctx.fillText(T.fateName[FATE.z], Wd / 2, 350);
    ctx.fillStyle = "#f5f3ff"; ctx.font = "500 36px " + ff;
    wrapText(ctx, T.fateDesc[FATE.z], 860).slice(0, 3).forEach(function (l, i) { ctx.fillText(l, Wd / 2, 430 + i * 54); });
    var rows = [];
    if (st.budget) rows.push([T.cardBudget, fmtMan(st.budget)]);
    if (st.type) rows.push([T.cardType, T.typeNames[st.type]]);
    if (st.wards.length) rows.push([T.cardWard, st.wards.slice(0, 4).map(function (c) { return T.wardNames[c]; }).join("・") + (st.wards.length > 4 ? "…" : "")]);
    if (st.band != null) rows.push([T.cardSize, shortL()[st.band]]);
    var v = $(".mvt"); if (v) rows.push([T.cardVerdict, v.textContent]);
    rows.push([T.cardLucky, T.wardNames[FATE.c]]);
    var y0 = 640; ctx.textAlign = "left";
    rows.slice(0, 6).forEach(function (r, i) {
      var y = y0 + i * 92;
      ctx.fillStyle = "rgba(255,255,255,.09)"; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(120, y - 58, 840, 76, 18); else ctx.rect(120, y - 58, 840, 76); ctx.fill();
      ctx.fillStyle = "#fde68a"; ctx.font = "800 34px " + ff; ctx.fillText(r[0], 160, y);
      ctx.fillStyle = "#fff"; ctx.font = "800 38px " + ff; ctx.textAlign = "right"; ctx.fillText(String(r[1]).slice(0, 22), 920, y); ctx.textAlign = "left";
    });
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "700 32px " + ff;
    ctx.fillText(T.cardFoot, Wd / 2, 1235);
    ctx.fillStyle = "#fde68a"; ctx.font = "800 34px " + ff; ctx.fillText(location.host + location.pathname, Wd / 2, 1290);
    return cv;
  }
  function shareCard() {
    ga("match_share_card");
    var go = function () {
      var cv = drawCard();
      cv.toBlob(function (blob) {
        if (!blob) return;
        var name = "chouchou-fate.png", file = null;
        try { file = new File([blob], name, { type: "image/png" }); } catch (e) { }
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: T.fateTitle, text: T.shareText + " " + location.origin + location.pathname }).catch(function () { });
        } else {
          var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        }
      }, "image/png");
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }
  window.__matchCard = drawCard;   // 給自動測試截圖用

  var LINE_URL = "https://lin.ee/RscRWCp";
  function lineBtn() { return '<a class="mline mlinea" href="' + LINE_URL + '" target="_blank" rel="noopener" onclick="try{gtag(\'event\',\'line_click\',{from:\'match\'})}catch(e){}">' + T.lineBtn + '</a>'; }
  /* 周周 2026-11-13：「填寫低於1000萬的就直接說在東京23區內難，請提高預算」「分析不出來就讓它私訊我，放進LINE連結」 */
  function secLow() { return '<div class="msec mlow"><h3>' + T.lowTitle + '</h3><p>' + T.lowTxt + '</p>' + lineBtn() + '</div>'; }
  function secNoResult() { return '<div class="msec mlow"><p>' + T.noResult + '</p>' + lineBtn() + '</div>'; }
  function secCta() {
    return '<div class="msec mcta"><h3>' + T.ctaTitle + '</h3><p>' + T.ctaTxt + '</p><button type="button" class="mline" id="mSend">' + T.ctaBtn + '</button>' +
      '<div class="mlinks">' + T.links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join("") + '</div></div>' +
      '<div class="msrc">' + fmt(T.sources, { d: S.fetched, ym: YM }) + '</div>';
  }

  function summaryText() {
    var parts = [T.sumHead];
    if (st.type) parts.push(T.sumType + T.typeNames[st.type]);
    if (st.use != null) parts.push(T.sumUse + T.uses[st.use]);
    parts.push(T.sumBudget + (st.budget ? fmtMan(st.budget) : T.notSet));
    parts.push(T.sumWard + (st.wards.length ? st.wards.map(function (c) { return T.wardNames[c]; }).join("、") : T.notSet));
    parts.push(T.sumSize + (st.band != null ? bandsL()[st.band] : T.notSet));
    if (TY() === "ms" || TY() === "hused") parts.push(T.sumAge + (st.age != null ? T.ages[st.age] : T.notSet));
    if (st.inc) parts.push(fmt(T.sumLoan, { i: fmtMan(st.inc), d: fmtMan(st.down || 0), a: st.ageP || "—", r: st.res != null ? T.res[st.res] : "—" }));
    if (st.people != null) parts.push(T.sumPeople + T.people[st.people]);
    if (st.pet != null) parts.push(T.sumPet + T.pet[st.pet]);
    var v = $(".mvt"); if (v) parts.push(T.sumVerdict + v.textContent);
    parts.push(location.origin + location.pathname + "?" + query());
    return parts.join("\n");
  }
  function query() {
    var q = [], add = function (k, v) { if (v != null && v !== "" && !(Array.isArray(v) && !v.length)) q.push(k + "=" + (Array.isArray(v) ? v.join(",") : v)); };
    add("t", st.type); add("u", st.use); add("b", st.budget); add("w", st.wards); add("s", st.band); add("a", st.age); add("p", st.people); add("pet", st.pet);
    return q.join("&");
  }
  function fromQuery() {
    try {
      var u = new URLSearchParams(location.search), g = function (k) { var v = u.get(k); return v === null || v === "" || isNaN(+v) ? null : +v; };
      var t = u.get("t"); st.type = RANGES[t] && (t === "ms" || (S.types && S.types[t])) ? t : null;
      st.use = g("u") === 0 || g("u") === 1 ? g("u") : null; st.budget = g("b"); st.band = g("s"); st.age = g("a"); st.people = g("p"); st.pet = g("pet");
      st.wards = (u.get("w") || "").split(",").filter(function (c) { return W[c]; });
      if (st.band != null && st.band >= nb()) st.band = null;
      return filled() > 0;
    } catch (e) { return false; }
  }

  function saveLead() {
    /* 匿名存一份給周周後台（members-admin.html 的「定位分析紀錄」）。Firestore 規則沒發布或離線就略過。
       ⚠️ 欄位固定（firestore.rules 有驗證），不要加新欄位；類型塞在 verdict 字串前面。 */
    try {
      import("./member-core.js").then(function (M) {
        return import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(function (F) {
          return F.addDoc(F.collection(M.db, "leads"), { budget: st.budget || 0, wards: st.wards.slice(0, 23), band: st.band == null ? -1 : st.band, age: st.age == null ? -1 : st.age,
            people: st.people == null ? -1 : st.people, pet: st.pet == null ? -1 : st.pet, verdict: (((st.type ? T.typeNames[st.type].replace(/（.*$/, "") + "｜" : "") + (($(".mvt") || {}).textContent || "")).slice(0, 30)), lang: /-cn\.html$/.test(location.pathname) ? "cn" : T.lang, createdAt: F.serverTimestamp() });
        });
      }).catch(function () { });
    } catch (e) { }
  }
  function sendLine() {
    var txt = summaryText(); ga("match_line");
    try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch (e) { }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) location.href = "https://line.me/R/oaMessage/%40202dzwok/?" + encodeURIComponent(txt);
    else { alert(T.copied); window.open("https://lin.ee/RscRWCp", "_blank", "noopener"); }
  }

  /* 黏在畫面底部的「傳給周周」（周周 2026-11-13 優化：結果頁很長，看到一半就想問的人不用滑到最底） */
  var STK = null, STK_IO = null;
  function sticky() {
    if (!STK) {
      STK = document.createElement("div"); STK.className = "mstick";
      STK.innerHTML = '<span>' + T.stickyTxt + '</span><button type="button">' + T.stickyBtn + '</button>';
      STK.querySelector("button").addEventListener("click", function () { ga("match_sticky"); sendLine(); });
      document.body.appendChild(STK);
      window.addEventListener("scroll", stkUpd, { passive: true });
    }
    stkUpd();
  }
  function stkUpd() {
    if (!STK) return;
    var out = $("#mOut"), cta = $(".mcta", out), r = out.getBoundingClientRect(), vh = innerHeight;
    var started = r.top < vh * 0.35, ctaVis = cta && cta.getBoundingClientRect().top < vh;
    STK.classList.toggle("on", !!(out.innerHTML && started && !ctaVis && r.bottom > vh));
  }
  function run() {
    if (!st.budget && st.inc) { var L0 = loanCalc(); if (L0 && L0.price) { st.budget = L0.price; paint(); } }
    var n = filled();
    if (!n) { $("#mOut").innerHTML = '<div class="msec in"><p class="msub">' + T.needOne + '</p></div>'; return; }
    ga("match_run", { filled: n, type: st.type || "any", income: st.inc ? 1 : 0 });
    try { history.replaceState(null, "", location.pathname + "?" + query()); } catch (e) { }
    var out = $("#mOut");
    out.innerHTML = '<div class="mload"><div class="orb"><i></i><i></i><i></i></div><p>' + T.loading[Math.floor(Math.random() * T.loading.length)] + '</p></div>';
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () {
      var h = '<div class="mhead"><span>' + T.yourInput + '</span>' + [st.type ? T.typeNames[st.type] : null, st.budget ? fmtMan(st.budget) : null, st.wards.length ? st.wards.map(function (c) { return T.wardNames[c]; }).join("・") : null, st.band != null ? bandsL()[st.band] : null, st.age != null ? T.ages[st.age] : null].filter(Boolean).map(function (s) { return '<b>' + s + '</b>'; }).join("") + '</div>';
      if (st.budget && st.budget < 1000) { out.innerHTML = h + secLow() + secCta(); $$(".msec", out).forEach(function (el) { el.classList.add("in"); }); var s0 = $("#mSend"); if (s0) s0.addEventListener("click", sendLine); saveLead(); return; }
      if (st.budget && st.band != null) h += secVerdict();
      h += secProps();
      h += secMap();
      if (st.budget && !(st.wards.length && st.wards.length <= 3 && st.band != null)) h += secBudget();
      if (st.wards.length && st.wards.length <= 3) h += secWard();
      if (st.band != null && !(st.wards.length && st.wards.length <= 3)) h += secSize();
      if (st.age != null) h += secAge();
      h += secLinks();
      if (n >= 3) h += secFate();
      h += secCta();
      out.innerHTML = h;
      $$(".msec", out).forEach(function (el, i) { el.style.animationDelay = (i * 0.12) + "s"; el.classList.add("in"); });
      var f = $(".mfcard", out); if (f) { f.addEventListener("click", function () { f.classList.add("open"); ga("match_fate_open"); }); setTimeout(function () { f.classList.add("open"); }, 900 + $$(".msec", out).length * 120); }
      var s = $("#mSend"); if (s) s.addEventListener("click", sendLine);
      var sh = $("#mShare"); if (sh) sh.addEventListener("click", shareCard);
      bindMap(out); fillFx(); sticky();
      if ($(".mverdict.v0") || $(".mverdict.v1")) confetti();
      saveLead();
    }, 1500);
  }

  /* 小小的彩紙（只有結論是「餘裕／剛好」才放） */
  function confetti() {
    var cv = document.createElement("canvas"); cv.className = "mconf"; document.body.appendChild(cv);
    var W_ = cv.width = innerWidth, H_ = cv.height = innerHeight, ctx = cv.getContext("2d"), cols = ["#f43f5e", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"];
    var ps = Array.from({ length: 90 }, function () { return { x: W_ / 2 + (Math.random() - .5) * 200, y: H_ * .35, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 3, s: 4 + Math.random() * 5, c: cols[Math.random() * 5 | 0], r: Math.random() * 6 }; });
    var t = 0; (function f() { ctx.clearRect(0, 0, W_, H_); ps.forEach(function (p) { p.vy += .25; p.x += p.vx; p.y += p.vy; p.r += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); });
      if (++t < 110) requestAnimationFrame(f); else cv.remove(); })();
  }

  loadFx();
  buildInputs(); paint();
  if (fromQuery()) { onType(); paint(); var lb = $("#mLoanBox"); if (lb && st.inc) lb.open = true; run(); }
})();
