/* 照片防盜：看起來是乾淨的圖，但另存／長按存圖／拖曳時拿到的是帶浮水印的版本。
   做法：每張 prop/ 照片上方蓋一張同大小、完全透明的 prop-wm/ 同名圖。
   畫面照舊；滑鼠右鍵、手機長按、拖曳碰到的是最上層那張。 */
(function () {
  var PRE = "prop/", WM = "prop-wm/";
  function norm(s) { return String(s || "").replace(/^\.\//, ""); }
  function isTarget(img) {
    var s = norm(img.getAttribute("src"));
    return s.indexOf(PRE) === 0 && !img.classList.contains("imgguard-ov");
  }
  function place(img, ov) {
    var w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) { ov.style.display = "none"; return; }
    ov.style.display = "";
    ov.style.left = img.offsetLeft + "px"; ov.style.top = img.offsetTop + "px";
    ov.style.width = w + "px"; ov.style.height = h + "px";
  }
  function guard(img) {
    if (img.__g || !isTarget(img) || !img.parentNode) return;
    var ov = document.createElement("img");
    ov.className = "imgguard-ov"; ov.alt = ""; ov.setAttribute("aria-hidden", "true");
    ov.decoding = "async"; ov.loading = "lazy";
    ov.src = WM + norm(img.getAttribute("src")).slice(PRE.length);
    ov.addEventListener("click", function (e) {      // 照片本身若有點擊功能（放大、換圖），轉給它
      e.preventDefault(); e.stopPropagation();
      img.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
    img.insertAdjacentElement("afterend", ov);
    img.__g = ov;
    place(img, ov);
    img.addEventListener("load", function () { place(img, ov); });
    if (window.ResizeObserver) new ResizeObserver(function () { place(img, ov); }).observe(img);
  }
  function syncSrc(img) {
    if (!img.__g) return guard(img);
    var s = norm(img.getAttribute("src"));
    if (s.indexOf(PRE) === 0) {
      var u = WM + s.slice(PRE.length);
      if (img.__g.getAttribute("src") !== u) img.__g.src = u;
      place(img, img.__g);
    }
  }
  function scan(root) {
    var list = (root.querySelectorAll ? root.querySelectorAll('img[src^="prop/"],img[src^="./prop/"]') : []);
    for (var i = 0; i < list.length; i++) guard(list[i]);
  }
  function start() {
    var st = document.createElement("style");
    st.textContent = ".imgguard-ov{position:absolute;opacity:0;z-index:2;margin:0;padding:0;border:0;max-width:none;max-height:none;object-fit:contain;-webkit-user-drag:auto;cursor:inherit}";
    document.head.appendChild(st);
    scan(document);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "attributes") { if (m.target.tagName === "IMG" && !m.target.classList.contains("imgguard-ov")) syncSrc(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.nodeType === 1) { if (n.tagName === "IMG") guard(n); else scan(n); } }
      }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    window.addEventListener("resize", function () {
      var all = document.querySelectorAll("img"); for (var i = 0; i < all.length; i++) if (all[i].__g) place(all[i], all[i].__g);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
