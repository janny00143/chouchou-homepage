/* ══════════════════════════════════════════════════════════════════
   買房定位分析（tokyo-home-match.html／-ja；簡中由 build-cn 轉）
   周周 2026-11-12：「讓不知道自己多少錢、可以買什麼程度房子的人來評估」
   ・四個條件都可以不填：預算／地區／大小／屋齡。填幾個就分析幾個，全填會出「買房命盤」。
   ・數據：souba.js（SUUMO 中古マンション價格相場，fetch-souba.cjs 定期更新）、
           wards-data.js（地價公示・人口）、properties.js（周周的在售物件，用來配對）。
   ・文字全部放在頁面的 window.MATCH_T（.js 不會被 build-cn 轉簡體）。
   ・分析結果可以一鍵傳 LINE 給周周；同時匿名存一份到 Firestore「leads」給周周後台看（失敗就略過）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var T = window.MATCH_T, S = window.SOUBA, W = window.WARDS23;
  if (!T || !S || !W) return;
  var ALLP = (window.PROPERTIES || []).filter(function (p) { return !p.sold; });
  var CODES = Object.keys(W);
  var BAND_MID = [30, 50, 70, 90, 115];        // 每個面積帶拿來估家具、配對用的代表值（㎡）
  var BAND_RANGE = [[0, 40], [40, 60], [60, 80], [80, 100], [100, 999]];
  var AGE_MAX = [0, 10, 20, 30, 999];           // 新築／10年內／20年內／30年內／不限
  var NOW_Y = new Date().getFullYear();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmtMan = function (v) { if (v == null || isNaN(v)) return "—"; v = Math.round(v); return v >= 10000 ? (Math.floor(v / 10000) + T.oku + (v % 10000 ? (v % 10000).toLocaleString() + T.man : "")) : v.toLocaleString() + T.man; };
  var fmt = function (s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] == null ? "" : o[k]; }); };
  function ga(n, x) { try { if (typeof gtag === "function") gtag("event", n, x || {}); } catch (e) { } }
  function med(code, b) { var w = S.wards[code]; if (!w || !w.bands[b]) return null; var x = w.bands[b]; return x.n >= 2 ? x.med : null; }

  /* ── 狀態 ── */
  var st = { budget: null, wards: [], band: null, age: null, people: null, pet: null };

  /* ── 輸入區 ── */
  function chips(el, items, multi, key) {
    el.innerHTML = items.map(function (it) { return '<button type="button" class="mc" data-v="' + esc(it.v) + '">' + it.h + '</button>'; }).join("");
    el.addEventListener("click", function (e) {
      var b = e.target.closest(".mc"); if (!b) return;
      var v = b.getAttribute("data-v");
      if (multi) {
        var i = st[key].indexOf(v); if (i >= 0) st[key].splice(i, 1); else st[key].push(v);
      } else { st[key] = (String(st[key]) === v) ? null : (isNaN(+v) ? v : +v); }
      paint();
    });
  }
  function paint() {
    $$("#mWards .mc").forEach(function (b) { b.classList.toggle("on", st.wards.indexOf(b.getAttribute("data-v")) >= 0); });
    [["#mBand", "band"], ["#mAge", "age"], ["#mPeople", "people"], ["#mPet", "pet"]].forEach(function (x) {
      $$(x[0] + " .mc").forEach(function (b) { b.classList.toggle("on", String(st[x[1]]) === b.getAttribute("data-v")); });
    });
    $$("#mBudgetQ .mc").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-v") === st.budget); });
    var bi = $("#mBudget"); if (bi && document.activeElement !== bi) bi.value = st.budget ? st.budget : "";
    var n = filled(); $("#mGo").textContent = n >= 3 ? T.goFull : T.go;
    $("#mCount").textContent = fmt(T.filled, { n: n });
  }
  function filled() { return (st.budget ? 1 : 0) + (st.wards.length ? 1 : 0) + (st.band != null ? 1 : 0) + (st.age != null ? 1 : 0); }

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
    chips($("#mBand"), T.bands.map(function (h, i) { return { v: i, h: h }; }), false, "band");
    chips($("#mAge"), T.ages.map(function (h, i) { return { v: i, h: h }; }), false, "age");
    chips($("#mPeople"), T.people.map(function (h, i) { return { v: i, h: h }; }), false, "people");
    chips($("#mPet"), T.pet.map(function (h, i) { return { v: i, h: h }; }), false, "pet");
    $("#mBudgetQ").innerHTML = T.budgetQuick.map(function (v) { return '<button type="button" class="mc" data-v="' + v + '">' + fmtMan(v) + '</button>'; }).join("");
    $("#mBudgetQ").addEventListener("click", function (e) { var b = e.target.closest(".mc"); if (!b) return; var v = +b.getAttribute("data-v"); st.budget = st.budget === v ? null : v; paint(); });
    $("#mBudget").addEventListener("input", function () { var v = parseInt(String(this.value).replace(/[^\d]/g, ""), 10); st.budget = v > 0 ? v : null; paint(); });
    $("#mReset").addEventListener("click", function () { st = { budget: null, wards: [], band: null, age: null, people: null, pet: null }; paint(); $("#mOut").innerHTML = ""; history.replaceState(null, "", location.pathname); });
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
    else if (p.cat === "house") { var hm = sz.match(/建物([\d.]+)㎡/); area = hm ? +hm[1] : 0; }
    else { var am = sz.match(/([\d.]+)㎡/); area = am ? +am[1] : 0; }
    var ag = String(p.age || ""), age = /新築/.test(ag) || p.cat === "land" ? 0 : (function () { var y = ag.match(/(\d{4})年/); return y ? Math.max(0, NOW_Y - +y[1]) : null; })();
    return { p: p, code: code, price: price, area: area, age: age };
  }).filter(function (x) { return x && x.price > 0; });

  function bandOf(a) { for (var i = 0; i < BAND_RANGE.length; i++) if (a >= BAND_RANGE[i][0] && a < BAND_RANGE[i][1]) return i; return 4; }
  function scoreProp(x) {
    var s = 0, why = [];
    if (st.budget) { var r = x.price / st.budget; if (r <= 1.0 && r >= 0.55) { s += 4 - (1 - r) * 3; why.push(T.whyBudget); } else if (r <= 1.08) { s += 1.5; why.push(T.whyBudgetNear); } else return null; }
    if (st.wards.length) { if (st.wards.indexOf(x.code) >= 0) { s += 3; why.push(T.whyWard); } else s -= 3; }
    if (st.band != null && x.area) { var d = Math.abs(bandOf(x.area) - st.band); if (d === 0) { s += 2.5; why.push(T.whySize); } else if (d === 1) s += 0.8; else s -= 1; }
    if (st.age != null && st.age < 4) { if (x.age != null && x.age <= AGE_MAX[st.age]) { s += 2; why.push(T.whyAge); } else s -= 1; }
    if (st.people != null && x.area) { var need = [25, 45, 60, 75][st.people] || 60; if (x.area >= need) s += 0.5; }
    return { x: x, s: s, why: why };
  }

  /* ── 分析 ── */
  function verdict(r) { return r >= 1.15 ? 0 : r >= 0.95 ? 1 : r >= 0.8 ? 2 : 3; }  // 0 餘裕 1 剛好 2 有點緊 3 需要調整
  function wardList() { return st.wards.length ? st.wards : CODES; }

  function secBudget() {
    /* 每一區「這個預算買得到的最大面積帶」 */
    var B = st.budget, rows = wardList().map(function (c) {
      var best = -1; for (var b = 0; b < 5; b++) { var m = med(c, b); if (m != null && m <= B) best = b; }
      return { c: c, best: best };
    });
    var can = rows.filter(function (r) { return r.best >= 0; }).sort(function (a, b) { return b.best - a.best || W[b.c].land - W[a.c].land; });
    var cannot = rows.filter(function (r) { return r.best < 0; });
    var h = '<div class="msec"><h3>' + T.secBudget + '</h3><p class="msub">' + fmt(T.secBudgetSub, { b: fmtMan(B) }) + '</p><div class="mgrid">';
    h += can.map(function (r) {
      var m = med(r.c, r.best);
      return '<div class="mtile z-' + W[r.c].zone + '"><b>' + T.wardNames[r.c] + '</b><span class="big">' + T.bandShort[r.best] + '</span><small>' + fmt(T.medAt, { m: fmtMan(m) }) + '</small></div>';
    }).join("");
    h += cannot.map(function (r) { return '<div class="mtile off"><b>' + T.wardNames[r.c] + '</b><span class="big">—</span><small>' + T.outOfReach + '</small></div>'; }).join("");
    h += '</div></div>';
    return h;
  }
  function secWard() {
    var ws = st.wards.slice(0, 3);
    return '<div class="msec"><h3>' + T.secWard + '</h3>' + ws.map(function (c) {
      var w = S.wards[c], lp = W[c];
      var rows = w.bands.map(function (b, i) {
        var okB = st.budget ? (b.med != null && b.med <= st.budget) : null;
        return '<tr' + (st.band === i ? ' class="hl"' : '') + '><td>' + T.bands[i] + '</td><td class="num">' + (b.n >= 2 ? fmtMan(b.med) : '—') + '</td><td class="num rng">' + (b.n >= 2 ? fmtMan(b.lo) + '〜' + fmtMan(b.hi) : T.fewData) + '</td>' + (st.budget ? '<td>' + (b.n < 2 ? '' : okB ? '<span class="ok">✓</span>' : '<span class="ng">✕</span>') + '</td>' : '') + '</tr>';
      }).join("");
      var bi = st.band != null ? st.band : 2, stns = (w.bands[bi].stations || []).slice().sort(function (a, b) { return a.med - b.med; });
      var inB = st.budget ? stns.filter(function (s) { return s.med <= st.budget; }) : stns;
      var pick = (inB.length ? inB : stns).slice(0, 4);
      return '<div class="mward"><div class="mwh"><b>' + T.wardNames[c] + '</b><span class="mzb z-' + lp.zone + '">' + T.zones[lp.zone] + '</span>' +
        '<span class="mkv">' + fmt(T.landLine, { p: (lp.land / 10000).toFixed(1), c: lp.chg.toFixed(1) }) + '</span><span class="mkv">' + fmt(T.popLine, { p: (lp.pop / 10000).toFixed(1) }) + '</span></div>' +
        '<table class="mtab"><thead><tr><th>' + T.thSize + '</th><th>' + T.thMed + '</th><th>' + T.thRange + '</th>' + (st.budget ? '<th>' + T.thFit + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table>' +
        (pick.length ? '<p class="mst">' + fmt(inB.length && st.budget ? T.stationsIn : T.stationsCheap, { band: T.bandShort[bi] }) + pick.map(function (s) { return '<span>' + esc(s.st) + ' ' + fmtMan(s.med) + '</span>'; }).join("") + '</p>' : '') + '</div>';
    }).join("") + '</div>';
  }
  function secSize() {
    var b = st.band, rows = CODES.map(function (c) { return { c: c, m: med(c, b) }; }).filter(function (r) { return r.m != null; }).sort(function (a, b) { return a.m - b.m; });
    var mx = rows.length ? rows[rows.length - 1].m : 1;
    return '<div class="msec"><h3>' + fmt(T.secSize, { band: T.bands[b] }) + '</h3><p class="msub">' + T.secSizeSub + '</p><div class="mbars">' + rows.map(function (r, i) {
      var ok = st.budget ? r.m <= st.budget : null;
      return '<div class="mbar' + (ok === false ? ' dim' : '') + '"><span class="n">' + (i + 1) + '. ' + T.wardNames[r.c] + '</span><span class="bw"><i class="z-' + W[r.c].zone + '" style="width:' + Math.max(3, r.m / mx * 100).toFixed(1) + '%"></i></span><span class="v">' + fmtMan(r.m) + '</span></div>';
    }).join("") + '</div>' + (st.budget ? '<p class="mnote">' + fmt(T.sizeBudgetNote, { b: fmtMan(st.budget) }) + '</p>' : '') + '</div>';
  }
  function secAge() {
    var a = st.age, list = PROPS.filter(function (x) { return x.age != null && (a === 4 || x.age <= AGE_MAX[a]) && x.p.cat !== "land"; });
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
    if (st.age != null && st.age <= 1 && v < 3) v++;   // 新築・築淺通常高於中央值：結論往保守調一級
    var total = pick.length, fit = pick.filter(function (p) { return p.r >= 0.95; }).length;
    var pos = Math.round(fit / total * 100);
    return '<div class="msec mverdict v' + v + '"><div class="mvl">' + T.vLabel + '</div><div class="mvt">' + T.verdicts[v] + '</div><p>' + fmt(T.verdictTxt[v], { b: fmtMan(B), band: T.bands[b], n: fit, t: total, w: T.wardNames[pick[0].c] }) + '</p>' +
      '<div class="mmeter"><i style="width:' + Math.max(4, pos) + '%"></i></div><p class="msub">' + fmt(T.meter, { p: pos }) + '</p>' +
      (v >= 2 ? '<ul class="madj">' + T.adjust.map(function (s) { return '<li>' + s + '</li>'; }).join("") + '</ul>' : '') + '</div>';
  }
  function secProps() {
    var sc = PROPS.map(scoreProp).filter(function (r) { return r && r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 6);
    if (!sc.length) return '<div class="msec"><h3>' + T.secProps + '</h3><p class="msub">' + T.noProps + '</p></div>';
    var sfx = T.sfx;
    return '<div class="msec"><h3>' + T.secProps + '</h3><p class="msub">' + T.secPropsSub + '</p><div class="mprops">' + sc.map(function (r) {
      var p = r.x.p, ph = (p.photos && p.photos[0]) || "", t = T.lang === "ja" ? p.title : (p.title_cn || p.title);
      return '<a class="mprop" href="prop-' + encodeURIComponent(p.id) + sfx + '.html" onclick="try{gtag(\'event\',\'match_prop_click\')}catch(e){}">' +
        (ph ? '<img src="' + esc(ph) + '" alt="" loading="lazy">' : '<div class="noimg">🏠</div>') +
        '<div class="mpb"><b>' + esc(t) + '</b><span class="pr">' + fmtMan(r.x.price) + (p.cat === "land" ? T.landTotal : "") + '</span><span class="mt">' + T.wardNames[r.x.code] + (r.x.area ? '・' + r.x.area + '㎡' : '') + (r.x.age != null ? '・' + (r.x.age === 0 ? T.newBuild : fmt(T.ageY, { y: r.x.age })) : '') + '</span>' +
        (r.why.length ? '<span class="why">' + r.why.join("・") + '</span>' : '') + '</div></a>';
    }).join("") + '</div></div>';
  }
  /* 去 SUUMO 看「其他公司」符合條件的物件（周周 2026-11-12：讓客戶知道他可能有哪些選擇，可以原連結）。
     ⚠️ 不把別家的物件抓下來放在我們網站（廣告規約：未經同意不得刊登他社物件），只給「帶好條件的搜尋連結」。
     參數已實測：sc=區碼 kt=價格上限(萬) mb/mt=面積 cn=屋齡上限。 */
  function suumoUrl(c) {
    var u = "https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?ar=030&bs=011&ta=13&sc=" + c + "&pc=30";
    if (st.budget) u += "&kb=1&kt=" + Math.round(st.budget * 1.05);
    if (st.band != null) { u += "&mb=" + BAND_RANGE[st.band][0]; if (st.band < 4) u += "&mt=" + BAND_RANGE[st.band][1]; }
    if (st.age != null && st.age < 4) u += "&cn=" + [1, 10, 20, 30][st.age];
    return u;
  }
  function secLinks() {
    var ws = st.wards.length ? st.wards.slice(0, 6) : (function () {
      var b = st.band != null ? st.band : 2;
      return CODES.map(function (c) { var m = med(c, b); return { c: c, m: m }; }).filter(function (r) { return r.m != null && (!st.budget || r.m <= st.budget * 1.1); })
        .sort(function (a, b) { return st.budget ? (W[b.c].land - W[a.c].land) : (a.m - b.m); }).slice(0, 6).map(function (r) { return r.c; });
    })();
    if (!ws.length) return "";
    return '<div class="msec"><h3>' + T.secLinks + '</h3><p class="msub">' + T.secLinksSub + '</p><div class="mlk">' + ws.map(function (c) {
      return '<a href="' + suumoUrl(c) + '" target="_blank" rel="noopener nofollow" onclick="try{gtag(\'event\',\'match_suumo\')}catch(e){}"><b>' + T.wardNames[c] + '</b><span>' + T.linksBtn + ' ↗</span></a>';
    }).join("") + '</div><p class="mnote">' + T.linksNote + '</p></div>';
  }
  function secFate() {
    /* 買房命盤（趣味）：全部或大部分條件都填時才出現 */
    var c = (st.wards[0]) || (function () { if (!st.budget) return "13112"; var best = null; CODES.forEach(function (k) { var m = med(k, st.band != null ? st.band : 2); if (m != null && m <= st.budget && (!best || W[k].land > W[best].land)) best = k; }); return best || "13121"; })();
    var z = W[c].zone, b = st.band != null ? st.band : 2;
    var furn = T.furniture[b], pet = st.pet === 0 ? T.petYes : st.pet === 1 ? T.petNo : "";
    return '<div class="msec mfate"><div class="mfcard"><div class="mff"><span class="mfs">✦</span><b>' + T.fateTitle + '</b><small>' + T.fateTap + '</small></div><div class="mfb">' +
      '<div class="mfname">' + T.fateName[z] + '</div><p>' + T.fateDesc[z] + '</p>' +
      '<div class="mfrow"><span>🧭 ' + T.fsLabel + '</span><p>' + T.fengshui[z] + '</p></div>' +
      '<div class="mfrow"><span>🛋️ ' + T.furnLabel + '</span><p>' + fmt(T.furnTxt, { band: T.bands[b] }) + furn + '</p></div>' +
      (pet ? '<div class="mfrow"><span>🐾 ' + T.petLabel + '</span><p>' + pet + '</p></div>' : '') +
      '<div class="mfrow"><span>🍀 ' + T.luckyLabel + '</span><p>' + fmt(T.luckyTxt, { w: T.wardNames[c] }) + '</p></div>' +
      '<p class="mfnote">' + T.fateNote + '</p></div></div></div>';
  }
  function secCta(summary) {
    return '<div class="msec mcta"><h3>' + T.ctaTitle + '</h3><p>' + T.ctaTxt + '</p><button type="button" class="mline" id="mSend">' + T.ctaBtn + '</button>' +
      '<div class="mlinks">' + T.links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join("") + '</div></div>' +
      '<div class="msrc">' + fmt(T.sources, { d: S.fetched }) + '</div>';
  }

  function summaryText() {
    var parts = [T.sumHead];
    parts.push(T.sumBudget + (st.budget ? fmtMan(st.budget) : T.notSet));
    parts.push(T.sumWard + (st.wards.length ? st.wards.map(function (c) { return T.wardNames[c]; }).join("、") : T.notSet));
    parts.push(T.sumSize + (st.band != null ? T.bands[st.band] : T.notSet));
    parts.push(T.sumAge + (st.age != null ? T.ages[st.age] : T.notSet));
    if (st.people != null) parts.push(T.sumPeople + T.people[st.people]);
    if (st.pet != null) parts.push(T.sumPet + T.pet[st.pet]);
    var v = $(".mvt"); if (v) parts.push(T.sumVerdict + v.textContent);
    parts.push(location.origin + location.pathname + "?" + query());
    return parts.join("\n");
  }
  function query() {
    var q = []; if (st.budget) q.push("b=" + st.budget); if (st.wards.length) q.push("w=" + st.wards.join(",")); if (st.band != null) q.push("s=" + st.band); if (st.age != null) q.push("a=" + st.age);
    if (st.people != null) q.push("p=" + st.people); if (st.pet != null) q.push("pet=" + st.pet); return q.join("&");
  }
  function fromQuery() {
    try { var u = new URLSearchParams(location.search), g = function (k) { var v = u.get(k); return v === null || v === "" ? null : +v; };
      st.budget = g("b"); st.band = g("s"); st.age = g("a"); st.people = g("p"); st.pet = g("pet");
      st.wards = (u.get("w") || "").split(",").filter(function (c) { return W[c]; });
      return filled() > 0; } catch (e) { return false; }
  }

  function saveLead() {
    /* 匿名存一份給周周後台（members-admin.html 的「定位分析紀錄」）。Firestore 規則沒發布或離線就略過。 */
    try {
      import("./member-core.js").then(function (M) {
        return import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(function (F) {
          return F.addDoc(F.collection(M.db, "leads"), { budget: st.budget || 0, wards: st.wards.slice(0, 23), band: st.band == null ? -1 : st.band, age: st.age == null ? -1 : st.age,
            people: st.people == null ? -1 : st.people, pet: st.pet == null ? -1 : st.pet, verdict: (($(".mvt") || {}).textContent || "").slice(0, 30), lang: /-cn\.html$/.test(location.pathname) ? "cn" : T.lang, createdAt: F.serverTimestamp() });
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

  function run() {
    var n = filled();
    if (!n) { $("#mOut").innerHTML = '<div class="msec"><p class="msub">' + T.needOne + '</p></div>'; return; }
    ga("match_run", { filled: n });
    try { history.replaceState(null, "", location.pathname + "?" + query()); } catch (e) { }
    var out = $("#mOut");
    out.innerHTML = '<div class="mload"><div class="orb"><i></i><i></i><i></i></div><p>' + T.loading[Math.floor(Math.random() * T.loading.length)] + '</p></div>';
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () {
      var h = '<div class="mhead"><span>' + T.yourInput + '</span>' + [st.budget ? fmtMan(st.budget) : null, st.wards.length ? st.wards.map(function (c) { return T.wardNames[c]; }).join("・") : null, st.band != null ? T.bands[st.band] : null, st.age != null ? T.ages[st.age] : null].filter(Boolean).map(function (s) { return '<b>' + s + '</b>'; }).join("") + '</div>';
      if (st.budget && st.band != null) h += secVerdict();
      if (st.budget && !(st.wards.length && st.wards.length <= 3 && st.band != null)) h += secBudget();
      if (st.wards.length && st.wards.length <= 3) h += secWard();
      if (st.band != null && !(st.wards.length && st.wards.length <= 3)) h += secSize();
      if (st.age != null) h += secAge();
      h += secProps();
      h += secLinks();
      if (n >= 3) h += secFate();
      h += secCta();
      out.innerHTML = h;
      $$(".msec", out).forEach(function (el, i) { el.style.animationDelay = (i * 0.12) + "s"; el.classList.add("in"); });
      var f = $(".mfcard", out); if (f) { f.addEventListener("click", function () { f.classList.add("open"); ga("match_fate_open"); }); setTimeout(function () { f.classList.add("open"); }, 900 + $$(".msec", out).length * 120); }
      var s = $("#mSend"); if (s) s.addEventListener("click", sendLine);
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

  buildInputs(); paint();
  if (fromQuery()) { paint(); run(); }
})();
