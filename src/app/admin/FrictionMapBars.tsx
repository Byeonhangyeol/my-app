// 마찰 지도를 "응답 많은 순 가로 막대 목록"으로 보여준다. 정렬·비율 계산은 admin/page.tsx가
// 넘겨주는 computeFrictionMapStats() 결과(이미 응답 수 내림차순)를 그대로 쓰고, 이 컴포넌트는
// 막대 길이·색·레이아웃 같은 표현만 담당한다 — 범례·격자선·차트 테두리 없이 "항목명 + 막대 +
// n명 · 비율%" 세 가지만으로 한눈에 읽히게 한다.

type FrictionEntry = { choice: string; count: number };

export function FrictionMapBars({ items }: { items: FrictionEntry[] }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);

  if (items.length === 0) {
    return <p className="mt-2 text-sm text-slate-400">아직 응답이 없어요.</p>;
  }

  // 상위 강조 기준값 — 정렬된 목록의 3번째(index 2) 응답 수. 동률이면 같은 강조 수준으로
  // 보이도록, "개수 >= 이 값"인 항목을 전부 강조색으로 묶는다.
  const topThreshold = items[2]?.count ?? 0;

  return (
    <ul className="mt-2 flex flex-col gap-3">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        const isTop = item.count >= topThreshold;
        return (
          <li key={item.choice} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm text-slate-600 sm:min-w-[9.5rem] sm:max-w-[11rem] sm:shrink-0">
              {item.choice}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(pct, 3)}%`,
                    background: isTop
                      ? "linear-gradient(180deg, #ff9fb8 0%, var(--pink, #ff8fab) 100%)"
                      : "linear-gradient(180deg, #d8d4d1 0%, #c7c2be 100%)",
                    boxShadow: isTop
                      ? "0 1px 3px rgba(255,111,146,0.35)"
                      : "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                />
              </div>
              <span className="shrink-0 text-xs text-slate-500 sm:text-sm">
                {item.count}명 · {pct}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
