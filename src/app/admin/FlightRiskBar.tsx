"use client";

import { useState } from "react";
import type { ResponseBreakdown } from "@/lib/stats";
import { BreakdownPanel } from "./BreakdownPanel";

// Flight Risk를 "100% 누적 가로 막대"로 보여준다. 데이터·계산 로직은 admin/page.tsx의
// computeFlightRiskStats() 결과를 그대로 받기만 하고, 이 컴포넌트는 표현 방식만 담당한다.
// 퍼센트를 클릭하면 그 답변이 어느 부서·어느 입사월에서 나왔는지 펼쳐 보여준다.

export function FlightRiskBar({
  yes,
  no,
  total,
  yesBreakdown,
  noBreakdown,
}: {
  yes: number;
  no: number;
  total: number;
  yesBreakdown: ResponseBreakdown;
  noBreakdown: ResponseBreakdown;
}) {
  const [open, setOpen] = useState<"yes" | "no" | null>(null);
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPct = total > 0 ? Math.round((no / total) * 100) : 0;

  if (total === 0) {
    return <p className="mt-2 text-sm text-slate-400">아직 응답이 없어요.</p>;
  }

  return (
    <div className="mt-2">
      <div className="flex h-9 w-full overflow-hidden rounded-full bg-slate-100 sm:h-10">
        {yes > 0 && (
          <div
            className="flex items-center justify-center bg-red-400 text-xs font-semibold text-white sm:text-sm"
            style={{ width: `${yesPct}%` }}
          >
            {yesPct >= 12 && `${yesPct}%`}
          </div>
        )}
        {no > 0 && (
          <div
            className="flex items-center justify-center bg-slate-200 text-xs font-semibold text-slate-500 sm:text-sm"
            style={{ width: `${noPct}%` }}
          >
            {noPct >= 12 && `${noPct}%`}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1 text-sm">
        <button
          type="button"
          onClick={() => setOpen((prev) => (prev === "yes" ? null : "yes"))}
          className="flex items-baseline gap-1.5 text-left"
        >
          <span className="text-slate-500">사직 고민 &quot;예&quot;</span>
          <span className="text-lg font-bold text-red-500 sm:text-xl">{yesPct}%</span>
          <span className="text-xs text-slate-400">({yes}명)</span>
          <span className="text-xs text-slate-400" aria-hidden>
            {open === "yes" ? "▲" : "▼"}
          </span>
        </button>
        {open === "yes" && <BreakdownPanel breakdown={yesBreakdown} />}
        <button
          type="button"
          onClick={() => setOpen((prev) => (prev === "no" ? null : "no"))}
          className="flex items-baseline gap-1.5 text-left"
        >
          <span className="text-slate-500">사직 고민 &quot;아니오&quot;</span>
          <span className="text-lg font-bold text-slate-500 sm:text-xl">{noPct}%</span>
          <span className="text-xs text-slate-400">({no}명)</span>
          <span className="text-xs text-slate-400" aria-hidden>
            {open === "no" ? "▲" : "▼"}
          </span>
        </button>
        {open === "no" && <BreakdownPanel breakdown={noBreakdown} />}
      </div>
    </div>
  );
}
