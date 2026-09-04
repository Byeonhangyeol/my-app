"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// Stay Menu 답변 직후 바로 보여주는 공유 카드 — 같은 기수의 참여 인원과, 1년 이상
// 근속한 선배들의 Stay Point를 함께 보여준다 (공유 화이트리스트 2·3번 항목).
// (DESIGN.md "공유 통계 카드", PLAN.md 17번 작업)
// 레오(입체레오 23번, 밀짚모자 쓴 농부+새싹) — 오래 근속하며 가꿔온 선배의 지혜를 표현.

export default function StayMenuShareCard({
  cohortId,
  onNext,
  onBack,
}: {
  cohortId: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  const [stayMenuCount, setStayMenuCount] = useState<number | null>(null);
  const [quotes, setQuotes] = useState<string[] | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [countRes, quotesRes] = await Promise.all([
        supabase.rpc("get_cohort_step_count", { p_cohort_id: cohortId, p_step: "stay_menu" }),
        supabase.rpc("get_stay_point_quotes", { p_limit: 3 }),
      ]);
      setStayMenuCount(countRes.data ?? 0);
      setQuotes((quotesRes.data ?? []).map((row: { answer_text: string }) => row.answer_text));
    }
    load();
  }, [cohortId]);

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={23} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        같은 동기 중 벌써 {stayMenuCount ?? "..."}명이 함께 답해주셨어요.
      </p>
      <div className="mt-3 font-body text-body text-[var(--text-body-color)] sm:mt-4">
        <p className="font-body text-hint text-center text-[var(--text-gray)]">1년 이상 근속한 선배들의 Stay Point</p>
        {quotes === null ? (
          <p className="mt-1 font-body text-hint text-center text-[var(--text-gray)]">불러오는 중...</p>
        ) : quotes.length === 0 ? (
          <p className="mt-1 font-body text-hint text-center text-[var(--text-gray)]">아직 모인 Stay Point가 없어요.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-2">
            {quotes.map((q, i) => (
              <li key={i}>&quot;{q}&quot;</li>
            ))}
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
