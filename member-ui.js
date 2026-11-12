/* ══════════════════════════════════════════════════════════════════
   會員頁的畫面（member.html／member-ja.html；簡中由 build-cn 轉 member.html）
   文字放在各頁 HTML 裡的 window.MEMBER_T（這樣 build-cn 會一起轉成簡體），
   這支只管流程：登入 → 第一次填資料 → 會員中心。
   ══════════════════════════════════════════════════════════════════ */
import * as M from "./member-core.js";

const T = window.MEMBER_T || {};
const path = location.pathname;
const LANG = /-ja\.html$/.test(path) ? "ja" : (/-cn\.html$/.test(path) ? "cn" : "tw");
const PRIVACY = LANG === "ja" ? "privacy-ja.html" : (LANG === "cn" ? "privacy-cn.html" : "privacy.html");
const root = document.getElementById("member");
let USER = null, MEMBER = null, MODE = "login";
/* ?next=properties.html：從物件專區的「會員搶先看」鎖卡片過來的，登入或註冊完就送回去。
   只接受同站的 xxx.html，避免被拿來轉址到外部網站。 */
const NEXT = (() => { try { const n = new URLSearchParams(location.search).get("next") || ""; return /^[a-z0-9-]+\.html$/.test(n) ? n : ""; } catch (e) { return ""; } })();
function goNext(delay) { if (NEXT) setTimeout(() => { location.href = NEXT; }, delay || 0); }

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const regionLabel = r => LANG === "ja" ? (M.REGION_JA[r] || r) : (LANG === "cn" ? (M.REGION_CN[r] || r) : r);
function ga(n, x) { try { if (typeof gtag === "function") gtag("event", n, x || {}); } catch (e) { } }
function errMsg(e) {
  const c = (e && e.code) || "";
  if (/permission-denied/.test(c)) return T.errSetup;
  if (/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c)) return T.errLogin;
  if (/email-already-in-use/.test(c)) return T.errExists;
  if (/weak-password/.test(c)) return T.errWeak;
  if (/invalid-email/.test(c)) return T.errEmail;
  if (/popup-closed|cancelled-popup/.test(c)) return "";
  if (/too-many-requests/.test(c)) return T.errMany;
  return T.errGeneral + (c ? "（" + c + "）" : "");
}
function showErr(id, e) { const el = document.getElementById(id); if (!el) return; const m = typeof e === "string" ? e : errMsg(e); el.textContent = m; el.style.display = m ? "block" : "none"; }
function busy(btn, on) { if (!btn) return; btn.disabled = on; btn.style.opacity = on ? ".6" : ""; }

/* ── 1. 還沒登入 ── */
function viewLogin() {
  wide(false);
  root.innerHTML =
    '<div class="card"><ul class="perks">' + T.perks.map(p => '<li>' + p + '</li>').join("") + '</ul></div>' +
    '<div class="card">' +
    '<button type="button" class="gbtn" id="gLogin"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>' + esc(T.google) + '</button>' +
    '<div class="or">' + esc(T.or) + '</div>' +
    '<div class="tabs2"><button type="button" data-m="login" class="' + (MODE === "login" ? "on" : "") + '">' + esc(T.tabLogin) + '</button><button type="button" data-m="signup" class="' + (MODE === "signup" ? "on" : "") + '">' + esc(T.tabSignup) + '</button></div>' +
    '<form id="eForm" autocomplete="on"><div class="f"><label>Email</label><input id="eMail" type="email" required autocomplete="email"></div>' +
    '<div class="f"><label>' + esc(T.pw) + '</label><input id="ePw" type="password" required minlength="6" autocomplete="' + (MODE === "signup" ? "new-password" : "current-password") + '">' +
    (MODE === "signup" ? '<p class="hint">' + esc(T.pwHint) + '</p>' : '') + '</div>' +
    '<p class="err" id="eErr"></p>' +
    '<button class="submit" type="submit">' + esc(MODE === "signup" ? T.doSignup : T.doLogin) + '</button></form>' +
    (MODE === "login" ? '<p class="small"><a href="#" id="forgot">' + esc(T.forgot) + '</a></p>' : '') +
    '</div>';
  document.getElementById("gLogin").onclick = async (ev) => {
    busy(ev.currentTarget, true);
    try { await M.loginGoogle(); ga("member_login", { method: "google" }); } catch (e) { showErr("eErr", e); }
    busy(ev.currentTarget, false);
  };
  root.querySelectorAll(".tabs2 button").forEach(b => b.onclick = () => { MODE = b.dataset.m; viewLogin(); });
  document.getElementById("eForm").onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector(".submit"); busy(btn, true); showErr("eErr", "");
    const em = document.getElementById("eMail").value.trim(), pw = document.getElementById("ePw").value;
    try {
      if (MODE === "signup") { await M.signupEmail(em, pw); ga("member_signup_auth", { method: "email" }); }
      else { await M.loginEmail(em, pw); ga("member_login", { method: "email" }); }
    } catch (e) { showErr("eErr", e); }
    busy(btn, false);
  };
  const fg = document.getElementById("forgot");
  if (fg) fg.onclick = async (ev) => {
    ev.preventDefault();
    const em = document.getElementById("eMail").value.trim();
    if (!em) { showErr("eErr", T.errNeedEmail); return; }
    try { await M.resetPw(em); showErr("eErr", T.resetSent); } catch (e) { showErr("eErr", e); }
  };
}

/* ── 2. 第一次填資料（或修改資料） ── */
function regionOptions(sel) {
  return '<option value="">' + esc(T.choose) + '</option>' + M.REGIONS.map(g =>
    '<optgroup label="' + esc(regionLabel(g[0])) + '">' + g[1].map(r =>
      '<option value="' + esc(r) + '"' + (r === sel ? " selected" : "") + '>' + esc(regionLabel(r)) + '</option>').join("") + '</optgroup>').join("");
}
function viewProfile(isEdit) {
  wide(false);
  const m = MEMBER || {}, u = USER || {};
  root.innerHTML = '<div class="card"><h2>' + esc(isEdit ? T.editTitle : T.profileTitle) + '</h2><p class="sub">' + esc(isEdit ? "" : T.profileSub) + '</p>' +
    '<form id="pForm">' +
    '<div class="f"><label>' + esc(T.fName) + ' <span class="req">*</span></label><input id="pName" required maxlength="60" value="' + esc(m.name || u.displayName || "") + '" autocomplete="name"></div>' +
    '<div class="f"><label>' + esc(T.fRegion) + ' <span class="req">*</span></label><select id="pRegion" required>' + regionOptions(m.region) + '</select></div>' +
    '<div class="f"><label>' + esc(T.fLine) + ' <span class="req">*</span></label><input id="pLine" required maxlength="60" value="' + esc(m.lineId || "") + '" placeholder="' + esc(T.phLine) + '"></div>' +
    '<div class="f"><label>' + esc(T.fPhone) + ' <span class="req">*</span></label><input id="pPhone" type="tel" required maxlength="24" value="' + esc(m.phone || "") + '" placeholder="' + esc(T.phPhone) + '" autocomplete="tel"></div>' +
    '<div class="f"><label>Email <span class="req">*</span></label><input id="pMail" type="email" required maxlength="120" value="' + esc(m.email || u.email || "") + '" autocomplete="email"></div>' +
    '<label class="chk"><input type="checkbox" id="pNews"' + ((isEdit ? m.consentNews : true) ? " checked" : "") + '><span>' + T.consentNews + '</span></label>' +
    (isEdit ? "" : '<label class="chk"><input type="checkbox" id="pPriv" required><span>' + T.consentPriv.replace("{privacy}", PRIVACY) + ' <span class="req">*</span></span></label>') +
    '<p class="err" id="pErr"></p>' +
    '<button class="submit" type="submit">' + esc(isEdit ? T.save : T.join) + '</button>' +
    (isEdit ? '<button type="button" class="ghost" id="pCancel">' + esc(T.cancel) + '</button>' : '<button type="button" class="ghost" id="pOut">' + esc(T.logout) + '</button>') +
    '</form></div>';
  const f = document.getElementById("pForm");
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = f.querySelector(".submit"); showErr("pErr", "");
    const z2h = s => s.replace(/[０-９＋（）－　]/g, c => ({ "＋": "+", "（": "(", "）": ")", "－": "-", "　": " " }[c] || String.fromCharCode(c.charCodeAt(0) - 0xFEE0)));
    const data = {
      name: document.getElementById("pName").value.trim(),
      region: document.getElementById("pRegion").value,
      lineId: document.getElementById("pLine").value.trim(),
      phone: z2h(document.getElementById("pPhone").value.trim()),
      email: document.getElementById("pMail").value.trim(),
      consentNews: document.getElementById("pNews").checked
    };
    if (!data.name || !data.region || !data.lineId || !data.phone || !data.email) { showErr("pErr", T.errRequired); return; }
    if (!/^[0-9+()\- ]{6,24}$/.test(data.phone)) { showErr("pErr", T.errPhone); return; }
    if (!/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(data.email)) { showErr("pErr", T.errEmail); return; }
    if (!isEdit && !document.getElementById("pPriv").checked) { showErr("pErr", T.errPriv); return; }
    busy(btn, true);
    try {
      await M.saveProfile(USER, data, MEMBER, LANG);
      if (!MEMBER) ga("member_signup", { region: data.region, news: data.consentNews ? 1 : 0 });
      MEMBER = await M.getMember(USER.uid);
      await M.mergeFavs(USER, MEMBER);
      MEMBER = await M.getMember(USER.uid);
      viewHome(isEdit ? T.saved : T.welcome);
      if (!isEdit) goNext(1500);
    } catch (e) { showErr("pErr", e); }
    busy(btn, false);
  };
  const c = document.getElementById("pCancel"); if (c) c.onclick = () => viewHome();
  const o = document.getElementById("pOut"); if (o) o.onclick = () => M.logout();
}

/* ── 3. 會員中心 ── */
/* 會員中心在電腦上用兩欄：左邊收藏、右邊會員資料（周周 2026-11-12） */
function wide(on) { const w = root.closest(".wrap"); if (w) w.classList.toggle("wide", !!on); }
/* 舊的收藏沒有存縮圖：讀一次物件資料補上，順便存回本機與雲端 */
let _thumbTried = false;
function fillThumbs(favs) {
  if (_thumbTried || !favs.some(x => !x.i)) return; _thumbTried = true;
  const s = document.createElement("script"); s.src = "properties.js";
  s.onload = () => {
    const P = {}; (window.PROPERTIES || []).forEach(p => { P[p.id] = p; });
    const base = location.href.replace(/[^\/]*$/, ""); let changed = false;
    const a = M.localFavs().map(x => { const p = P[x.id]; const img = p && (p.thumb || (p.photos && p.photos[0]));
      if (!x.i && img) { changed = true; return Object.assign({}, x, { i: base + img }); } return x; });
    if (!changed) return;
    try { localStorage.setItem("chou_favs_v1", JSON.stringify(a)); } catch (e) { }
    if (USER && MEMBER) { try { M.pushFavs(); } catch (e) { } }
    if (document.getElementById("hEdit")) viewHome();
  };
  document.head.appendChild(s);
}
function viewHome(flash) {
  const m = MEMBER || {}, favs = M.localFavs();
  root.innerHTML =
    (flash ? '<div class="flash">' + esc(flash) + '</div>' : '') +
    '<div class="mgrid"><div class="card"><h2>' + esc(T.hello.replace("{name}", m.name || "")) + '</h2>' +
    '<p class="sub">' + esc(T.homeSub) + '</p>' +
    '<h3>♥ ' + esc(T.myFavs) + '（' + favs.length + '）</h3>' +
    (favs.length ? '<div class="favs">' + favs.map(x => '<a class="fv" href="property' + (LANG === "ja" ? "-ja" : (LANG === "cn" ? "-cn" : "")) + '.html?id=' + encodeURIComponent(x.id) + '">' + (x.i ? '<img src="' + esc(x.i) + '" alt="" loading="lazy">' : '<i>🏠</i>') + '<em><b>' + esc(x.t) + '</b><span>' + esc(x.p) + '</span></em><u>›</u></a>').join("") + '</div>'
      : '<p class="sub">' + T.noFavs + '</p>') +
    '<p style="margin-top:14px"><a class="btn-line" href="' + esc(T.propsUrl) + '">' + esc(T.seeProps) + '</a></p></div>' +
    '<div class="card"><h3>' + esc(T.myInfo) + '</h3><dl class="info">' +
    '<dt>' + esc(T.fName) + '</dt><dd>' + esc(m.name) + '</dd><dt>' + esc(T.fRegion) + '</dt><dd>' + esc(regionLabel(m.region)) + '</dd>' +
    '<dt>' + esc(T.fLine) + '</dt><dd>' + esc(m.lineId) + '</dd><dt>' + esc(T.fPhone) + '</dt><dd>' + esc(m.phone) + '</dd>' +
    '<dt>Email</dt><dd>' + esc(m.email) + '</dd></dl>' +
    '<label class="chk"><input type="checkbox" id="hNews"' + (m.consentNews ? " checked" : "") + '><span>' + T.consentNews + '</span></label>' +
    '<p class="err" id="hErr"></p>' +
    '<div class="row2"><button type="button" class="ghost" id="hEdit">' + esc(T.edit) + '</button><button type="button" class="ghost" id="hOut">' + esc(T.logout) + '</button></div>' +
    '<p class="small" style="margin-top:16px"><a href="#" id="hDel">' + esc(T.del) + '</a>　·　<a href="' + PRIVACY + '">' + esc(T.privacyLink) + '</a></p></div></div>';
  wide(true);
  fillThumbs(favs);
  document.getElementById("hEdit").onclick = () => viewProfile(true);
  document.getElementById("hOut").onclick = () => M.logout();
  document.getElementById("hNews").onchange = async (ev) => {
    try { await M.setNews(USER, ev.target.checked); MEMBER.consentNews = ev.target.checked; showErr("hErr", T.saved); }
    catch (e) { ev.target.checked = !ev.target.checked; showErr("hErr", e); }
  };
  document.getElementById("hDel").onclick = async (ev) => {
    ev.preventDefault();
    if (!confirm(T.delConfirm)) return;
    try { await M.deleteAccount(USER); ga("member_delete"); root.innerHTML = '<div class="flash">' + esc(T.deleted) + '</div>'; }
    catch (e) { showErr("hErr", e); }
  };
}

/* ── 流程 ── */
root.innerHTML = '<p class="sub" style="text-align:center;padding:30px 0">' + esc(T.loading) + '</p>';
M.onUser(async (user) => {
  USER = user;
  if (!user) { MEMBER = null; viewLogin(); return; }
  try {
    MEMBER = await M.getMember(user.uid);
    if (!MEMBER) { viewProfile(false); return; }
    await M.mergeFavs(user, MEMBER);
    viewHome();
    goNext(600);
  } catch (e) {
    root.innerHTML = '<div class="card"><p class="err" style="display:block">' + esc(errMsg(e)) + '</p><button type="button" class="ghost" id="xOut">' + esc(T.logout) + '</button></div>';
    document.getElementById("xOut").onclick = () => M.logout();
  }
});
