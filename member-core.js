/* ══════════════════════════════════════════════════════════════════
   會員制核心（周周 2026-11-12 指示＋密語確認）
   「物件收藏做成登錄會員制，可以用收藏功能，也可以每月定期發送電子報，
    讓大家註冊我的會員，我也可以更加掌握客戶」

   ▍資料放哪裡
     Firebase Authentication（Google 登入／Email＋密碼）＋
     Firestore 的 members/{uid}，一人一份：
       name 姓名・region 居住地・lineId・phone・email（全部必填，周周指定）
       consentPrivacy 同意個資說明（必須 true）・consentNews 同意收電子報
       favs 收藏（[{id,t,p,u}]，最多 30）・lang・createdAt・updatedAt
     規則（firestore.rules）：本人只能讀寫自己那份；全部名單只有周周（isAdmin）讀得到。
     ⚠️ 規則改完要周周自己到 Firebase 主控台貼上並發布，firestore.rules 只是備份。

   ▍誰用這支
     member.html／member-ja.html（簡中由 build-cn 轉）：登入、填資料、會員中心
     favs.js：會員登入過（localStorage chou_member=1）時，收藏變動就用 pushFavs() 同步上雲
     members-admin.html：周周的會員後台（名單、匯出 CSV 給 Brevo 電子報）

   ▍跟 comments.js／views.js 共用同一個 Firebase 專案，用 getApps() 避免重複初始化。
   ══════════════════════════════════════════════════════════════════ */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, deleteUser }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzwbqz1f7PqDifv4GNd6b1v4Y-JK5tli4",
  authDomain: "chouchou-homepage.firebaseapp.com",
  projectId: "chouchou-homepage",
  storageBucket: "chouchou-homepage.firebasestorage.app",
  messagingSenderId: "487849516915",
  appId: "1:487849516915:web:62fb4b31c8e358595aef06"
};
const RECAPTCHA_SITE_KEY = "6Lf0joMtAAAAANfTspfN91tDC5pWQ-oG6fzfgLb2";
const FAV_KEY = "chou_favs_v1", FLAG = "chou_member", MAX_FAVS = 30;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
if (RECAPTCHA_SITE_KEY && !window.__appCheckDone) {
  try { initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }); window.__appCheckDone = true; }
  catch (e) { /* 其他程式已初始化過 */ }
}
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ── 居住地選單（周周 11/12：台灣分細一點）。存的是繁中標籤，後台直接看得懂 ── */
export const REGIONS = [
  ["台灣", ["台北市", "新北市", "基隆市", "桃園市", "新竹縣市", "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣",
            "嘉義縣市", "台南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "澎湖・金門・馬祖"]],
  ["日本", ["東京都", "神奈川・千葉・埼玉", "大阪・京都・兵庫", "日本其他地區"]],
  ["其他", ["香港", "澳門", "中國大陸", "新加坡", "馬來西亞", "美國・加拿大", "其他國家・地區"]]
];
export const REGION_JA = {
  "台灣": "台湾", "日本": "日本", "其他": "その他",
  "台北市": "台北市", "新北市": "新北市", "基隆市": "基隆市", "桃園市": "桃園市", "新竹縣市": "新竹県・市", "苗栗縣": "苗栗県",
  "台中市": "台中市", "彰化縣": "彰化県", "南投縣": "南投県", "雲林縣": "雲林県", "嘉義縣市": "嘉義県・市", "台南市": "台南市",
  "高雄市": "高雄市", "屏東縣": "屏東県", "宜蘭縣": "宜蘭県", "花蓮縣": "花蓮県", "台東縣": "台東県", "澎湖・金門・馬祖": "澎湖・金門・馬祖",
  "東京都": "東京都", "神奈川・千葉・埼玉": "神奈川・千葉・埼玉", "大阪・京都・兵庫": "大阪・京都・兵庫", "日本其他地區": "日本のその他の地域",
  "香港": "香港", "澳門": "マカオ", "中國大陸": "中国本土", "新加坡": "シンガポール", "馬來西亞": "マレーシア",
  "美國・加拿大": "アメリカ・カナダ", "其他國家・地區": "その他の国・地域"
};

export const REGION_CN = {
  "台灣": "台湾", "新竹縣市": "新竹县市", "苗栗縣": "苗栗县", "彰化縣": "彰化县", "南投縣": "南投县", "雲林縣": "云林县",
  "嘉義縣市": "嘉义县市", "屏東縣": "屏东县", "宜蘭縣": "宜兰县", "花蓮縣": "花莲县", "台東縣": "台东县",
  "澎湖・金門・馬祖": "澎湖・金门・马祖", "東京都": "东京都", "神奈川・千葉・埼玉": "神奈川・千叶・埼玉",
  "大阪・京都・兵庫": "大阪・京都・兵库", "日本其他地區": "日本其他地区", "其他": "其他", "澳門": "澳门",
  "中國大陸": "中国大陆", "馬來西亞": "马来西亚", "美國・加拿大": "美国・加拿大", "其他國家・地區": "其他国家・地区"
};

/* ── 登入 ── */
export function onUser(cb) { return onAuthStateChanged(auth, cb); }
export async function loginGoogle() {
  const p = new GoogleAuthProvider();
  try { return await signInWithPopup(auth, p); }
  catch (e) {
    /* LINE／IG 的內建瀏覽器擋彈出視窗 → 改用整頁轉址 */
    if (e && /popup-blocked|operation-not-supported/.test(e.code || "")) return signInWithRedirect(auth, p);
    throw e;
  }
}
export const signupEmail = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
export const loginEmail = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const resetPw = (email) => sendPasswordResetEmail(auth, email);
export async function logout() { try { localStorage.removeItem(FLAG); } catch (e) { } return signOut(auth); }

/* ── 會員資料 ── */
const ref = (uid) => doc(db, "members", uid);
export async function getMember(uid) { const s = await getDoc(ref(uid)); return s.exists() ? s.data() : null; }

function cleanFavs(a) {
  return (Array.isArray(a) ? a : []).slice(0, MAX_FAVS).map(x => ({
    id: String(x.id || "").slice(0, 80), t: String(x.t || "").slice(0, 120),
    p: String(x.p || "").slice(0, 60), u: String(x.u || "").slice(0, 300), i: String(x.i || "").slice(0, 300)
  })).filter(x => x.id);
}
export function localFavs() { try { const a = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function setLocalFavs(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch (e) { } }

/* 第一次填資料或修改資料。f = {name, region, lineId, phone, email, consentNews} */
export async function saveProfile(user, f, existing, lang) {
  const base = {
    name: f.name, region: f.region, lineId: f.lineId, phone: f.phone, email: f.email,
    consentPrivacy: true, consentNews: !!f.consentNews, lang: lang || "tw",
    updatedAt: serverTimestamp()
  };
  if (!existing) {
    await setDoc(ref(user.uid), Object.assign(base, { favs: cleanFavs(localFavs()), createdAt: serverTimestamp() }));
  } else {
    await updateDoc(ref(user.uid), base);
  }
  try { localStorage.setItem(FLAG, "1"); } catch (e) { }
}

/* 登入時：雲端與這台裝置的收藏合併（聯集，雲端的排前面），兩邊都更新 */
export async function mergeFavs(user, member) {
  const cloud = cleanFavs(member && member.favs), local = localFavs(), seen = {}, out = [];
  cloud.concat(local).forEach(x => { if (x && x.id && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
  const merged = cleanFavs(out);
  setLocalFavs(merged);
  if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
    await updateDoc(ref(user.uid), { favs: merged, updatedAt: serverTimestamp() });
  }
  try { localStorage.setItem(FLAG, "1"); } catch (e) { }
  return merged;
}

/* favs.js 在收藏變動時呼叫：會員已登入就把這台裝置的收藏寫上雲端 */
let pushTimer = null;
export function pushFavs() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) return;
      try { await updateDoc(ref(user.uid), { favs: cleanFavs(localFavs()), updatedAt: serverTimestamp() }); }
      catch (e) { /* 還沒填會員資料（沒有文件）或離線：略過，下次登入會合併 */ }
    });
  }, 400);
}

export async function setNews(user, on) { await updateDoc(ref(user.uid), { consentNews: !!on, updatedAt: serverTimestamp() }); }

/* 刪除會員：先刪資料，再刪登入帳號（太久沒登入時 Firebase 會要求重新登入，資料仍已刪除） */
export async function deleteAccount(user) {
  await deleteDoc(ref(user.uid));
  try { localStorage.removeItem(FLAG); } catch (e) { }
  try { await deleteUser(user); } catch (e) { await signOut(auth); }
}

/* 後台：全部會員（規則只讓周周讀得到） */
export async function allMembers() {
  const s = await getDocs(collection(db, "members"));
  const out = []; s.forEach(d => out.push(Object.assign({ uid: d.id }, d.data()))); return out;
}
