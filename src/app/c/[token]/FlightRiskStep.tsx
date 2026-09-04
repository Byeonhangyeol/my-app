"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAlreadySavedError } from "@/lib/alreadySaved";
import type { BaseDisclosure } from "@/types/db";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// Flight Risk 체크: 지금 사직을 진지하게 고민하고 있는지 확인하는 첫 질문.
// 서술형이 아니라 예/아니오 버튼을 누르는 방식으로 바로 답한다.
// 대화 시작 전에 고른 기본 공개 수준(baseDisclosure)을 그대로 써서 저장한다 — 답변마다
// 공개 의향을 다시 묻지 않고, 대화 맨 끝(FinalDisclosureStep)에서 한 번만 확인한다
// (사용자 요청: 예전엔 이 질문에서도 매번 물어봤는데, 번거롭다는 피드백에 따라 변경).
// 레오(입체레오 17번, 체중계에 올라선 포즈) — "상태 체크" 질문을 문자 그대로 표현.

export default function FlightRiskStep({
  cohortId,
  deviceId,
  baseDisclosure,
  onComplete,
  onBack,
}: {
  cohortId: string;
  deviceId: string;
  baseDisclosure: BaseDisclosure;
  onComplete: () => void;
  onBack?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(text: "예" | "아니오") {
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("responses").insert({
      cohort_id: cohortId,
      device_id: deviceId,
      step: "flight_risk",
      answer_text: text,
      disclosure_level: baseDisclosure.level,
      disclosed_name: baseDisclosure.name ?? null,
      disclosed_department: baseDisclosure.department ?? null,
    });
    setSubmitting(false);
    // 오류가 나서 새로고침한 뒤 같은 질문을 다시 답한 경우, 이미 저장돼 있어서 나는 유니크
    // 제약 위반(23505)은 진짜 실패가 아니므로 에러 없이 다음 단계로 넘어간다.
    if (insertError && !isAlreadySavedError(insertError)) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      return;
    }
    onComplete();
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={17} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        지금 사직을 진지하게 고민하고 있나요?
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <SoftButton onClick={() => save("예")} disabled={submitting}>
          예
        </SoftButton>
        <SoftButton variant="secondary" onClick={() => save("아니오")} disabled={submitting}>
          아니오
        </SoftButton>
      </div>
      {error && <p className="mt-2 text-center text-sm text-red-500">{error}</p>}
      {onBack && (
        <SoftIconButton onClick={onBack} aria-label="뒤로" className="mx-auto mt-3">
          <BackArrowIcon />
        </SoftIconButton>
      )}
    </SoftCard>
  );
}
