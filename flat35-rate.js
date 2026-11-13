/* Flat35 最頻金利（買房定位分析 tokyo-home-match 的預設試算利率）
   ・每月 1 號由排程「每月 1 號・Flat35 利率核對」到 https://www.flat35.com/ 查當月
     「最頻金利（融資率9割以下・21〜35年）」，有變就改這裡的 rate／year／month，重跑 build-cn 再上線。
   ・頁面上的「2026年11月」字樣都從這裡帶，不用改別的檔。 */
window.FLAT35 = { rate: 3.81, year: 2026, month: 11 };
