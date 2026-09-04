import type { ResponseBreakdown } from "@/lib/stats";

// Flight Risk·마찰 지도의 항목(예: "사직 고민 예", 마찰 지도 선택지 하나)을 클릭했을 때
// 펼쳐 보여주는 "어느 부서 · 어느 입사월에서 나온 응답인지" 세부 내역.
export function BreakdownPanel({ breakdown }: { breakdown: ResponseBreakdown }) {
  return (
    <div
      className="mt-2 grid grid-cols-1 gap-3 rounded-[var(--radius-md)] p-3 text-xs sm:grid-cols-2"
      style={{ background: "var(--surface-bg-2)", boxShadow: "var(--shadow-inset-sm)" }}
    >
      <div>
        <p className="font-medium text-slate-500">부서별</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {breakdown.departments.map((d) => (
            <li key={d.label} className="flex justify-between text-slate-600">
              <span>{d.label}</span>
              <span className="text-slate-400">{d.count}명</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium text-slate-500">입사월별</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {breakdown.hireMonths.map((m) => (
            <li key={m.label} className="flex justify-between text-slate-600">
              <span>{m.label}</span>
              <span className="text-slate-400">{m.count}명</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
