"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { isAlreadySavedError } from "@/lib/alreadySaved";
import { LeoCharacter, SoftCard, SoftTextarea, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// 재확인 체크인: 이전 시점 대화 때 답했던 마찰 항목을, 다음 시점에 같은 기기로 다시 왔을 때
// 새 질문 전에 먼저 물어본다. 답했던 항목이 여러 개(3개월·6개월 등 여러 시점에 걸쳐 쌓인
// 경우)면 최신 것 하나만 묻지 않고 누적으로 하나씩 차례로 물어본다(사용자 요청) — 항목마다
// "선택지 — 답변" 형식으로 각각 저장해, friction_map과 같은 방식으로 나중에 다시 돌아볼 수
// 있게 한다(StayPointRecallCard 참고). 이 대화에서만 쓰는 짧은 질문이라 공개 수준은 따로
// 묻지 않고 익명으로 저장한다 (완전 익명/부서만/이름까지 선택은 마찰 지도·Stay Menu·
// Stay Point 답변에만 적용된다). (PRD.md 재확인 체크인, PLAN.md 19번 작업)
// 레오(입체레오 20번, 턱 괴고 궁금한 듯 바라보는 포즈) — "저번에 그거 기억나요?" 하는 느낌.

export default function RecheckStep({
  cohortId,
  deviceId,
  previousChoices,
  onComplete,
  onBack,
}: {
  cohortId: string;
  deviceId: string;
  previousChoices: string[];
  onComplete: () => void;
  onBack?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentChoice = previousChoices[index];
  const isLast = index === previousChoices.length - 1;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !draft.trim()) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("responses").insert({
      cohort_id: cohortId,
      device_id: deviceId,
      step: "recheck",
      answer_text: `${currentChoice} — ${draft.trim()}`,
      disclosure_level: "anonymous",
    });
    setSubmitting(false);
    // 오류가 나서 새로고침한 뒤 같은 항목을 다시 답한 경우, 이미 저장돼 있어서 나는 유니크
    // 제약 위반(23505)은 진짜 실패가 아니므로 에러 없이 다음으로 넘어간다.
    if (insertError && !isAlreadySavedError(insertError)) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      return;
    }
    if (isLast) {
      onComplete();
      return;
    }
    setDraft("");
    setIndex((i) => i + 1);
  }

  // 항목이 여러 개일 때는 "뒤로"가 화면 자체를 벗어나지 않고, 방금 전 항목으로 먼저
  // 돌아간다 — 첫 항목일 때만 부모(intro)로 나간다.
  function handleBack() {
    if (index > 0) {
      setIndex((i) => i - 1);
      setDraft("");
      return;
    }
    onBack?.();
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={20} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        저번에 &quot;{currentChoice}&quot; 때문에 힘들다고 하셨었는데,
        <br />
        요즘은 어때요?
      </p>
      <p className="font-body text-hint mt-2 text-center text-[var(--text-gray)]">
        지난 응답을 기억하는 건 이 기기뿐이에요. 누가 응답했는지는 알 수 없습니다.
        {previousChoices.length > 1 && ` (${index + 1}/${previousChoices.length})`}
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <SoftTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="여기에 답변을 적어주세요"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center justify-between">
          {onBack || index > 0 ? (
            <SoftIconButton onClick={handleBack} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
          ) : (
            <span />
          )}
          <SoftButton type="submit" disabled={submitting || !draft.trim()}>
            {submitting ? "저장하는 중..." : isLast ? "다음" : "다음 항목"}
          </SoftButton>
        </div>
      </form>
    </SoftCard>
  );
}
