"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { isAlreadySavedError } from "@/lib/alreadySaved";
import type { BaseDisclosure } from "@/types/db";
import { LeoCharacter, SoftCard, SoftTextarea, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// Stay Point: 1년 이상 근속한 간호사가 실제로 무엇으로 버텼는지 확인하는 질문.
// Flight Risk·마찰 지도·Stay Menu와는 별개의 단독 트랙이다 (PLAN.md 11번 작업,
// DESIGN.md "대화 화면 (1년 경과, Stay Point)"). 뒤이어 StayPointNeedsStep(후배에게
// 필요한 것)이 이어진다.
// 대화 시작 전에 고른 기본 공개 수준(baseDisclosure)을 그대로 써서 저장한다 — 이 질문은
// 공개 의향을 다시 묻지 않는다(사용자 요청).
// 레오(입체레오 4번, 하트 풍선 들고 신나게 점프) — 1년을 버텨온 것에 대한 기쁨과 뿌듯함.

export default function StayPointStep({
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
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(text: string) {
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("responses").insert({
      cohort_id: cohortId,
      device_id: deviceId,
      step: "stay_point",
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("답변을 입력해주세요.");
      return;
    }
    setError(null);
    save(trimmed);
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={4} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        입사한 지 1년이 넘으셨네요. 그동안 버틸 수 있었던 건 무엇 덕분이었나요?
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <SoftTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="여기에 답변을 적어주세요"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center justify-between">
          {onBack ? (
            <SoftIconButton onClick={onBack} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
          ) : (
            <span />
          )}
          <SoftButton type="submit" disabled={submitting}>
            {submitting ? "저장하는 중..." : "다음"}
          </SoftButton>
        </div>
      </form>
    </SoftCard>
  );
}
