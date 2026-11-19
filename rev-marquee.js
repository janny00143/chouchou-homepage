/* 首頁「客戶怎麼說」評價跑馬燈（2026-11-19 改寫）
   周周回報：手機滑到評價區會停住，手指沒辦法左右滑。
   原因：舊版用 CSS transform 動畫 + overflow:hidden，手機一碰只會「暫停」，不能捲。
   改成真正可以捲動的區塊：平常自己慢慢往左跑；手指／滑鼠一碰就停、可以自由左右滑，
   放開 3 秒後從目前位置繼續。卡片有複製一份，跑到一半會無縫接回開頭。
   index.html／index-cn.html／ja.html 共用。 */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function init(m) {
    var t = m.querySelector('.rev-track'); if (!t || m.dataset.rvInit) return;
    m.dataset.rvInit = '1'; m.removeAttribute('onclick'); m.classList.remove('paused');
    var pos = m.scrollLeft, hold = false, timer = null, last = 0, visible = true, SPEED = 28; // px／秒
    function stop() { hold = true; clearTimeout(timer); }
    function go() { clearTimeout(timer); timer = setTimeout(function () { pos = m.scrollLeft; hold = false; }, 3000); }
    ['pointerdown', 'touchstart', 'wheel', 'mouseenter', 'focusin'].forEach(function (e) { m.addEventListener(e, stop, { passive: true }); });
    ['pointerup', 'touchend', 'touchcancel', 'mouseleave', 'focusout'].forEach(function (e) { m.addEventListener(e, go, { passive: true }); });
    m.addEventListener('scroll', function () {
      var half = t.scrollWidth / 2;
      if (half > 0 && m.scrollLeft >= half) { m.scrollLeft -= half; }
      if (hold) pos = m.scrollLeft;
    }, { passive: true });
    if (reduce) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(m);
    function step(ts) {
      if (!last) last = ts;
      var dt = Math.min(64, ts - last); last = ts;
      if (!hold && visible && !document.hidden) {
        var half = t.scrollWidth / 2;
        pos += SPEED * dt / 1000; if (half > 0 && pos >= half) pos -= half;
        m.scrollLeft = pos;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function all() { document.querySelectorAll('.rev-marq').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
