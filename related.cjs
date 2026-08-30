/* ============================================================
   「延伸閱讀／関連記事」的選文邏輯（generate-pages.cjs 與 build-ja.cjs 共用）
   ------------------------------------------------------------
   2026-08-30 周周核准的改法：
   舊做法是「同分類的前 3 篇」，導致同一分類底下每篇文章的延伸閱讀
   都指向同樣那 3 篇 —— 47 篇文章頁裡有 14 篇完全沒有被任何文章連到，
   熱門的幾篇卻被連 7～8 次。這對收錄與排名很不利。

   新做法：一邊產生一邊記錄「每篇已經被連到幾次」，每次都優先挑
   目前入連最少的，讓連結平均分散。
     ・同分類先挑 2 條（保持主題相關性）
     ・第 3 條從全部文章挑（同樣挑入連最少的），自然形成跨分類導流
   排序是「入連次數 → ART 順序」，完全決定性，重跑結果一致。
   ============================================================ */

function buildRelMap(ART, isEligible, N = 3, SAME = 2) {
  const idx = new Map(ART.map((a, i) => [a.id, i]));
  const inbound = Object.create(null);
  ART.forEach(a => { inbound[a.id] = 0; });

  const map = Object.create(null);
  for (const a of ART) {
    if (!isEligible(a)) continue;
    const others = ART.filter(r => r.id !== a.id && isEligible(r));
    const picked = [];
    const take = (pool, upTo) => {
      pool.slice()
        .sort((x, y) => (inbound[x.id] - inbound[y.id]) || (idx.get(x.id) - idx.get(y.id)))
        .forEach(r => {
          if (picked.length >= upTo) return;
          if (picked.indexOf(r) !== -1) return;
          picked.push(r);
          inbound[r.id]++;
        });
    };
    take(others.filter(r => r.cat === a.cat), Math.min(SAME, N)); // 同分類優先
    take(others, N);                                              // 不足的跨分類補滿
    map[a.id] = picked;
  }
  return map;
}

module.exports = { buildRelMap };
