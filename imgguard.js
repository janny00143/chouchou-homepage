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
    if (!w || !h) { ov.style.setProperty("display", "none", "important"); return; }
    ov.style.setProperty("display", "block", "important");
    ov.style.setProperty("left", img.offsetLeft + "px", "important"); ov.style.setProperty("top", img.offsetTop + "px", "important");
    ov.style.setProperty("width", w + "px", "important"); ov.style.setProperty("height", h + "px", "important");
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
    if (getComputedStyle(img.parentNode).position === "static") img.parentNode.style.position = "relative";
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
    st.textContent = "img.imgguard-ov{position:absolute!important;opacity:0!important;visibility:visible!important;z-index:2!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;filter:none!important;transform:none!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;flex:none!important;object-fit:contain!important;background:none!important;cursor:inherit}";
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
