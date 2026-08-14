/* ============================================================
   文章留言區（Google 登入・即時顯示）
   ------------------------------------------------------------
   ▍怎麼用？
     在文章頁放一個容器：<div id="cmts" data-slug="文章slug" data-lang="tw"></div>
     再載入：<script type="module" src="comments.js"></script>
   ▍資料存在 Firebase Firestore 的 comments 集合
   ▍管理：ADMIN_EMAILS 裡的帳號登入後，每則留言都會出現刪除鈕
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp }
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

/* App Check（防機器人）：把 Firebase 後台給的 reCAPTCHA v3 網站金鑰填進來就會自動啟用；
   留空則不啟用，功能照常運作。 */
const RECAPTCHA_SITE_KEY = "6Lf0joMtAAAAANfTspfN91tDC5pWQ-oG6fzfgLb2";

/* 同一個人兩則留言之間至少要間隔幾秒（防洗版） */
const COOLDOWN_SEC = 30;

/* 周周的管理帳號（登入後可刪除任何留言）。要改就改這裡。 */
const ADMIN_EMAILS = ["janny00jou@gmail.com"];

/* 有新留言時寄信通知周周用的 Web3Forms key（與意見回饋表單同一組，
   本來就是公開用的表單 key，不是密碼）。留空字串就會關掉通知功能。 */
const NOTIFY_KEY = "d1ac2743-8999-4270-abe8-9896caaf693b";

/* ⚠️ 測試用開關（2026-08-14 周周測通知時暫時打開）
   true  = 連周周自己留言也寄通知（測試用）
   false = 周周自己留言不寄（正式狀態）
   測試確認信有進來之後，要改回 false。 */
const NOTIFY_ADMIN_TOO = true;

/* ── 留言過濾（周周指示：禁連結、禁謾罵、禁詐騙）──
   周周本人（ADMIN_EMAILS）不受連結限制，方便回覆時貼 LINE。 */
const RE_LINK = /(https?:\/\/|www\.|[a-z0-9-]{2,}\.(com|net|org|jp|tw|cn|io|me|co|xyz|top|shop|link|site|online|vip|info|ru|biz|club)\b|[@＠]line|line\s*id|賴\s*id|加\s*賴)/i;
const WORDS_ABUSE = ["幹你娘","幹妳娘","操你","去死","白痴","白癡","智障","腦殘","脑残","廢物","废物","王八蛋","混蛋","神經病","神经病","婊子","賤人","贱人","他媽的","他妈的","媽的","妈的","fuck","shit","bitch","asshole","死ね","バカ","アホ","クソ","キチガイ"];
const WORDS_SCAM = ["保證獲利","保证获利","穩賺","稳赚","包賺","包赚","日賺","日赚","月入十萬","躺著賺","躺着赚","博弈","娛樂城","娱乐城","彩金","刷單","刷单","代操","帶單","带单","報明牌","内线消息","內線消息","私訊我加","私讯我加","加我賴","加我赖","高薪兼職","高薪兼职","無需經驗日領","無息借貸","无息借贷","貸款代辦","贷款代办","代辦貸款","代办贷款","洗錢","洗钱","虛擬貨幣投資","虚拟货币投资","保證過件","保证过件"];
function checkText(txt, isAdmin){
  const low = txt.toLowerCase();
  if(!isAdmin && RE_LINK.test(txt)) return "link";
  for(const w of WORDS_ABUSE) if(low.indexOf(w.toLowerCase())>-1) return "abuse";
  for(const w of WORDS_SCAM)  if(low.indexOf(w.toLowerCase())>-1) return "scam";
  return "";
}


const T = {
  tw: { title:"留言討論", sub:"用 Google 登入後就能留言，送出後立刻顯示。",
        login:"使用 Google 登入後留言", logout:"登出", ph:"想問什麼、想補充什麼都可以…",
        send:"送出留言", sending:"送出中…", empty:"還沒有留言，來當第一個留言的人吧！",
        del:"刪除", delConfirm:"確定要刪除這則留言嗎？", admin:"管理員-周周",
        err:"送出失敗，請稍後再試。", loginErr:"登入沒有完成，請再試一次。",
        loading:"載入留言中…", counter:"字", tooLong:"留言請控制在 1000 字以內。", errLink:"為了避免廣告，留言不能包含網址或 LINE ID 喔。", errAbuse:"留言含有不當用字，請修改後再送出。", errScam:"留言含有疑似詐騙或招攬內容，無法送出。", errWait:"留言太頻繁了，請等 {s} 秒後再送出。" },
  cn: { title:"留言讨论", sub:"用 Google 登录后就能留言，送出后立刻显示。",
        login:"使用 Google 登录后留言", logout:"登出", ph:"想问什么、想补充什么都可以…",
        send:"送出留言", sending:"送出中…", empty:"还没有留言，来当第一个留言的人吧！",
        del:"删除", delConfirm:"确定要删除这则留言吗？", admin:"管理员-周周",
        err:"送出失败，请稍后再试。", loginErr:"登录没有完成，请再试一次。",
        loading:"载入留言中…", counter:"字", tooLong:"留言请控制在 1000 字以内。", errLink:"为了避免广告，留言不能包含网址或 LINE ID 喔。", errAbuse:"留言含有不当用字，请修改后再送出。", errScam:"留言含有疑似诈骗或招揽内容，无法送出。", errWait:"留言太频繁了，请等 {s} 秒后再送出。" },
  ja: { title:"コメント", sub:"Googleでログインするとコメントできます。送信後すぐに表示されます。",
        login:"Googleでログインしてコメント", logout:"ログアウト", ph:"ご質問・ご感想などお気軽にどうぞ…",
        send:"送信", sending:"送信中…", empty:"まだコメントはありません。最初のコメントをどうぞ！",
        del:"削除", delConfirm:"このコメントを削除しますか？", admin:"管理者-周欣妤",
        err:"送信できませんでした。しばらくしてからお試しください。", loginErr:"ログインが完了しませんでした。もう一度お試しください。",
        loading:"コメントを読み込み中…", counter:"文字", tooLong:"コメントは1000文字以内でお願いします。", errLink:"広告防止のため、URLやLINE IDを含むコメントは投稿できません。", errAbuse:"不適切な表現が含まれています。修正のうえ送信してください。", errScam:"勧誘・詐欺と思われる内容が含まれるため送信できません。", errWait:"投稿が頻繁すぎます。{s}秒後にお試しください。" }
};

const CSS = `
.cmt-wrap{margin:34px 0 10px;padding-top:26px;border-top:1px solid var(--line,#e7e5e4)}
.cmt-h{font-size:20px;font-weight:800;margin:0 0 4px}
.cmt-sub{font-size:13.5px;color:var(--mut,#78716c);margin:0 0 18px}
.cmt-box{background:#fafaf9;border:1px solid var(--line,#e7e5e4);border-radius:16px;padding:16px 18px;margin-bottom:22px}
.cmt-me{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:14px}
.cmt-me img{width:32px;height:32px;border-radius:50%;flex:0 0 auto}
.cmt-me b{font-weight:700}
.cmt-out{margin-left:auto;background:none;border:none;color:var(--mut,#78716c);font-size:13px;cursor:pointer;text-decoration:underline;font-family:inherit}
.cmt-ta{width:100%;box-sizing:border-box;min-height:92px;resize:vertical;border:1px solid var(--line,#e7e5e4);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;line-height:1.8;background:#fff;color:inherit}
.cmt-ta:focus{outline:none;border-color:#f6adbe}
.cmt-row{display:flex;align-items:center;gap:12px;margin-top:10px}
.cmt-cnt{font-size:12.5px;color:var(--mut,#a8a29e);margin-left:auto}
.cmt-btn{background:var(--rose,#f43f5e);color:#fff;border:none;font-family:inherit;font-weight:700;font-size:14.5px;padding:10px 24px;border-radius:999px;cursor:pointer}
.cmt-btn:disabled{opacity:.5;cursor:default}
.cmt-google{display:inline-flex;align-items:center;gap:10px;background:#fff;border:1.5px solid var(--line,#e7e5e4);border-radius:999px;padding:11px 22px;font-family:inherit;font-size:15px;font-weight:700;color:#3c4043;cursor:pointer}
.cmt-google:hover{border-color:#f6adbe}
.cmt-google svg{width:19px;height:19px;flex:0 0 auto}
.cmt-list{display:flex;flex-direction:column;gap:16px}
.cmt-item{display:flex;gap:12px}
.cmt-av{width:38px;height:38px;border-radius:50%;flex:0 0 auto;background:#eee}
.cmt-body{flex:1;min-width:0}
.cmt-top{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.cmt-name{font-weight:700;font-size:14.5px}
.cmt-badge{font-size:11.5px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--rose,#f43f5e),#fb923c);padding:2px 9px;border-radius:999px;white-space:nowrap;flex:none}
.cmt-time{font-size:12.5px;color:var(--mut,#a8a29e)}
.cmt-del{background:none;border:none;color:var(--mut,#a8a29e);font-size:12.5px;cursor:pointer;font-family:inherit;text-decoration:underline;padding:0}
.cmt-del:hover{color:var(--rose,#f43f5e)}
.cmt-text{font-size:15px;line-height:1.85;margin:5px 0 0;white-space:pre-wrap;word-break:break-word}
.cmt-note{font-size:13.5px;color:var(--mut,#78716c);margin:0}
.cmt-err{font-size:13.5px;color:#dc2626;margin:8px 0 0}
`;

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

/* ── 有人留言 → 立刻寄信通知周周（用網站原本就在用的 Web3Forms，免費且即時）──
   ・周周自己留言不通知（不然會一直收到自己的信）
   ・寄失敗不影響留言本身，留言已經存進 Firestore 了
   ・刻意不寄留言者的 Email：那是個資，要看名單去 Firebase → Authentication → 用戶 就有 */
function notifyOwner(text, user, slug){
  try{
    if(!NOTIFY_KEY) return;
    const isAdm = user && ADMIN_EMAILS.indexOf((user.email||"").toLowerCase())>-1;
    if(isAdm && !NOTIFY_ADMIN_TOO) return;
    const title = (document.title||"").replace(/｜.*$/,"").trim() || slug;
    const url = location.href.split("#")[0] + "#cmts";
    fetch("https://api.web3forms.com/submit",{
      method:"POST",
      headers:{"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({
        access_key: NOTIFY_KEY,
        subject: (isAdm ? "🧪 通知測試｜" : "💬 網站有新留言｜") + title.slice(0,50),
        from_name: "周周網站・留言通知",
        "留言者": (user && user.displayName) || "（未提供名稱）",
        "留言內容": text,
        "文章／頁面": title,
        "頁面網址": url,
        "留言時間": new Date().toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}) + "（日本時間）",
        "備註": "要刪除這則留言：用 Google 登入後，留言旁邊會出現「刪除」鈕。"
      })
    }).catch(function(){});
  }catch(e){}
}

function ago(d, lang){
  if(!d) return "";
  const s = Math.floor((Date.now()-d.getTime())/1000);
  const U = lang==="ja" ? [[60,"秒前"],[3600,"分前"],[86400,"時間前"],[2592000,"日前"]]
          : lang==="cn" ? [[60,"秒前"],[3600,"分钟前"],[86400,"小时前"],[2592000,"天前"]]
          :               [[60,"秒前"],[3600,"分鐘前"],[86400,"小時前"],[2592000,"天前"]];
  if(s<60) return U[0][1].replace(/^/,s+"");
  if(s<3600) return Math.floor(s/60)+U[1][1];
  if(s<86400) return Math.floor(s/3600)+U[2][1];
  if(s<2592000) return Math.floor(s/86400)+U[3][1];
  return d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate();
}

const GOOGLE_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v7.4h12.7c-.3 2.1-1.6 5.3-4.7 7.4l7.2 5.6c4.3-4 6.9-9.9 6.9-16.3z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.3-8.7 2.3-6.3 0-11.7-3.7-13.6-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

(function init(){
  const el = document.getElementById("cmts");
  if(!el) return;
  const slug = el.dataset.slug || location.pathname.split("/").pop().replace(/\.html$/,"") || "index";
  const f = location.pathname.split("/").pop() || "";
  const lang = /-cn\.html$/.test(f) ? "cn" : (/-ja\.html$/.test(f) ? "ja" : (T[el.dataset.lang] ? el.dataset.lang : "tw"));
  const t = T[lang];

  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  el.className = "cmt-wrap";
  el.innerHTML =
    '<h2 class="cmt-h">'+esc(el.dataset.title || t.title)+'</h2>'+
    '<p class="cmt-sub">'+esc(el.dataset.sub || t.sub)+'</p>'+
    '<div class="cmt-box" id="cmtBox"></div>'+
    '<div class="cmt-list" id="cmtList"><p class="cmt-note">'+esc(t.loading)+'</p></div>';

  const box = el.querySelector("#cmtBox"), list = el.querySelector("#cmtList");

  let app, auth, db, provider;
  try{
    app = initializeApp(firebaseConfig);
    if(RECAPTCHA_SITE_KEY){
      try{ initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }); }catch(e){}
    }
    auth = getAuth(app); db = getFirestore(app);
    provider = new GoogleAuthProvider();
  }catch(e){ box.innerHTML = '<p class="cmt-err">'+esc(t.err)+'</p>'; return; }

  let me = null;

  function renderBox(){
    if(!me){
      box.innerHTML = '<button class="cmt-google" id="cmtLogin">'+GOOGLE_SVG+esc(t.login)+'</button>';
      box.querySelector("#cmtLogin").onclick = async () => {
        try{ await signInWithPopup(auth, provider); }
        catch(e){
          if(e && (e.code==="auth/popup-closed-by-user"||e.code==="auth/cancelled-popup-request")) return;
          const p=document.createElement("p"); p.className="cmt-err"; p.textContent=t.loginErr; box.appendChild(p);
        }
      };
      return;
    }
    box.innerHTML =
      '<div class="cmt-me">'+
        (me.photoURL?'<img src="'+esc(me.photoURL)+'" alt="" referrerpolicy="no-referrer">':'')+
        '<b>'+esc(me.displayName||"")+'</b>'+
        '<button class="cmt-out" id="cmtOut">'+esc(t.logout)+'</button>'+
      '</div>'+
      '<textarea class="cmt-ta" id="cmtTa" maxlength="1000" placeholder="'+esc(t.ph)+'"></textarea>'+
      '<div class="cmt-row"><button class="cmt-btn" id="cmtSend">'+esc(t.send)+'</button>'+
      '<span class="cmt-cnt" id="cmtCnt">0 / 1000 '+esc(t.counter)+'</span></div>';

    const ta = box.querySelector("#cmtTa"), send = box.querySelector("#cmtSend"), cnt = box.querySelector("#cmtCnt");
    box.querySelector("#cmtOut").onclick = () => signOut(auth);
    ta.oninput = () => { cnt.textContent = ta.value.length+" / 1000 "+t.counter; };
    send.onclick = async () => {
      const text = ta.value.trim();
      if(!text) return;
      if(text.length>1000){ alert(t.tooLong); return; }
      const isAdm = ADMIN_EMAILS.indexOf((me.email||"").toLowerCase())>-1;
      const bad = checkText(text, isAdm);
      if(bad){ alert(bad==="link"?t.errLink:(bad==="abuse"?t.errAbuse:t.errScam)); return; }
      if(!isAdm){
        let last=0; try{ last=parseInt(localStorage.getItem("cmtLast")||"0",10)||0; }catch(e){}
        const wait = COOLDOWN_SEC - Math.floor((Date.now()-last)/1000);
        if(last && wait>0){ alert(t.errWait.replace("{s}", wait)); return; }
      }
      send.disabled = true; send.textContent = t.sending;
      try{
        await addDoc(collection(db,"comments"), {
          slug, text, uid: me.uid,
          name: me.displayName || "", photo: me.photoURL || "",
          admin: ADMIN_EMAILS.indexOf((me.email||"").toLowerCase())>-1,
          createdAt: serverTimestamp()
        });
        ta.value = ""; cnt.textContent = "0 / 1000 "+t.counter;
        try{ localStorage.setItem("cmtLast", String(Date.now())); }catch(e){}
        notifyOwner(text, me, slug);
      }catch(e){
        const p=document.createElement("p"); p.className="cmt-err"; p.textContent=t.err; box.appendChild(p);
      }finally{ send.disabled=false; send.textContent=t.send; }
    };
  }

  function renderList(rows){
    if(!rows.length){ list.innerHTML = '<p class="cmt-note">'+esc(t.empty)+'</p>'; return; }
    const isAdmin = me && ADMIN_EMAILS.indexOf((me.email||"").toLowerCase())>-1;
    list.innerHTML = rows.map(r=>{
      const canDel = me && (me.uid===r.uid || isAdmin);
      const badge = r.admin ? '<span class="cmt-badge">'+esc(t.admin)+'</span>' : '';
      return '<div class="cmt-item">'+
        (r.photo?'<img class="cmt-av" src="'+esc(r.photo)+'" alt="" referrerpolicy="no-referrer">':'<span class="cmt-av"></span>')+
        '<div class="cmt-body">'+
          '<div class="cmt-top"><span class="cmt-name">'+esc(r.name)+'</span>'+badge+
          '<span class="cmt-time">'+esc(ago(r.createdAt,lang))+'</span>'+
          (canDel?'<button class="cmt-del" data-id="'+esc(r.id)+'">'+esc(t.del)+'</button>':'')+
          '</div>'+
          '<p class="cmt-text">'+esc(r.text)+'</p>'+
        '</div></div>';
    }).join("");
    list.querySelectorAll(".cmt-del").forEach(b=>{
      b.onclick = async () => {
        if(!confirm(t.delConfirm)) return;
        try{ await deleteDoc(doc(db,"comments",b.dataset.id)); }catch(e){ alert(t.err); }
      };
    });
  }

  let rows = [];
  onAuthStateChanged(auth, u => { me = u; renderBox(); renderList(rows); });

  onSnapshot(
    query(collection(db,"comments"), where("slug","==",slug)),
    snap => {
      rows = snap.docs.map(d=>{
        const v = d.data();
        return { id:d.id, text:v.text||"", name:v.name||"", photo:v.photo||"", uid:v.uid||"", admin:!!v.admin,
                 createdAt: v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : null };
      });
      rows.sort((a,b)=>(b.createdAt?b.createdAt.getTime():0)-(a.createdAt?a.createdAt.getTime():0));
      renderList(rows);
    },
    () => { list.innerHTML = '<p class="cmt-note">'+esc(t.empty)+'</p>'; }
  );
})();
