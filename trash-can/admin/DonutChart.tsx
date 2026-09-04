"use client";

// 재사용 가능한 도넛 차트. 외부 차트 라이브러리 없이 SVG stroke-dasharray로 그린다.
// 범례는 항상 함께 보여줘서(2개 이상 항목이면 항상 범례 필요) 색만으로 구분하지 않게 한다.
// 색은 항목 이름에 고정으로 매겨서(색상표 순서 고정), 정렬 순서가 바뀌어도 같은 항목은
// 항상 같은 색을 유지한다.

export type DonutDatum = { label: string; value: number; color: string };

export function DonutChart({
  data,
  size = 140,
  thickness = 22,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = circumference * 0.015; // 조각 사이 여백 (surface gap)

  let cumulative = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e1e0d9" strokeWidth={thickness} />
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d) => {
              const frac = d.value / total;
              const len = Math.max(frac * circumference - gap, 0);
              const dashoffset = -cumulative;
              cumulative += frac * circumference;
              return (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={dashoffset}
                />
              );
            })}
      </svg>
      <ul className="flex flex-col gap-1.5 text-xs sm:text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
            <span className="text-slate-600">{d.label}</span>
            <span className="text-slate-400">
              {d.value}명 ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
        {data.length === 0 && <li className="text-slate-400">아직 응답이 없어요.</li>}
      </ul>
    </div>
  );
}
