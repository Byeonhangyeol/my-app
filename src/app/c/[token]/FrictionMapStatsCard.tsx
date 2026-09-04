"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// 마찰 지도 답변 직후 바로 보여주는 통계 카드 — 같은 기수 사람들이 어떤 점 때문에
// 힘들어했는지 비율로 보여준다 (공유 화이트리스트 1번 항목).
// (DESIGN.md "공유 통계 카드", PLAN.md 17번 작업)
// 레오(입체레오 7번, 돋보기로 들여다보는 포즈) — 모두의 답변을 함께 살펴보는 느낌.

type Stat = { choice: string; response_count: number };

export default function FrictionMapStatsCard({
  cohortId,
  onNext,
  onBack,
}: {
  cohortId: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.rpc("get_friction_map_stats", { p_cohort_id: cohortId });
      setStats(data ?? []);
    }
    load();
  }, [cohortId]);

  const total = stats?.reduce((sum, s) => sum + Number(s.response_count), 0) ?? 0;

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={7} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        같은 동기들은 이런 점 때문에 힘들어했어요.
      </p>
      <div className="mt-4 font-body text-body text-[var(--text-body-color)]">
        {stats === null ? (
          <p className="font-body text-hint text-center text-[var(--text-gray)]">불러오는 중...</p>
        ) : total === 0 ? (
          <p className="font-body text-hint text-center text-[var(--text-gray)]">아직 다른 응답이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {stats.map((s) => {
              const pct = Math.round((Number(s.response_count) / total) * 100);
              return (
                <li key={s.choice}>
                  <div className="flex items-baseline justify-between">
                    <span>{s.choice}</span>
                    <span className="font-hero text-lg font-bold text-[var(--pink-strong)]">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-bg-1)]" style={{ boxShadow: "var(--shadow-inset-sm)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "linear-gradient(180deg, #ffaec4, var(--pink))" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between">
        {onBack ? (
          <SoftIconButton onClick={onBack} aria-label="뒤로">
            <BackArrowIcon />
          </SoftIconButton>
        ) : (
          <span />
        )}
        <SoftButton onClick={onNext}>다음</SoftButton>
      </div>
    </SoftCard>
  );
}
