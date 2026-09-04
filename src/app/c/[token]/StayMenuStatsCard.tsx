"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// Stay Menu 답변 직후 보여주는 통계 카드 — 이전 기수 인용문을 무작위로 보여주던
// StayMenuPeerQuotesCard 대신, 같은 기수(동기) 안에서 응답이 어떻게 갈렸는지 비율로
// 보여준다(사용자 요청: "같은 시점의 선배들은 이렇게 말했어요" 화면을 빼고 같은 동기들의
// 통계를 내어달라). FrictionMapStatsCard와 같은 형태다.
// 레오(입체레오 22번, 책 읽는 포즈) — 같은 동기들의 이야기를 한눈에 살펴보는 느낌.

type Stat = { choice: string; response_count: number };

export default function StayMenuStatsCard({
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
      const { data } = await supabase.rpc("get_stay_menu_stats", { p_cohort_id: cohortId });
      setStats(data ?? []);
    }
    load();
  }, [cohortId]);

  const total = stats?.reduce((sum, s) => sum + Number(s.response_count), 0) ?? 0;

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={22} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        같은 동기들은 이런 게 있으면 더 버틸 수 있대요.
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
                  <div
                    className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-bg-1)]"
                    style={{ boxShadow: "var(--shadow-inset-sm)" }}
                  >
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
