"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAlreadySavedError } from "@/lib/alreadySaved";
import type { BaseDisclosure } from "@/types/db";
import {
  LeoCharacter,
  SoftCard,
  SoftChoice,
  SoftTextarea,
  SoftButton,
  SoftIconButton,
  BackArrowIcon,
  DoodleIcon,
  DOODLE_ICON_BG,
  DoodleHeart,
  DoodleStar,
  DoodleCurve,
  type DoodleIconType,
} from "@/components/ui";

// Stay Menu: 무엇을 개선하면 최소 한 달은 더 버틸 수 있을지 확인하는 질문.
// 3/6/9개월 대상 트랙의 마지막 질문이다 (Stay Point는 별도 트랙 — StayPointStep.tsx 참고).
// 객관식 선택지 중 하나를 고르면 그 선택지 자체가 바로 답이 되고, "기타 직접 입력"만
// 자유 서술 화면으로 이어진다(StayPointNeedsStep의 "기타"와 같은 패턴).
// 대화 시작 전에 고른 기본 공개 수준(baseDisclosure)을 그대로 써서 저장한다 — 답변마다
// 공개 의향을 다시 묻지 않고, 대화 맨 끝(FinalDisclosureStep)에서 한 번만 확인한다
// (사용자 요청: 예전엔 이 질문에서도 매번 물어봤는데, 번거롭다는 피드백에 따라 변경).
// 선택지 아이콘·배경 낙서는 FrictionMapStep과 같은 손그림 장식을 그대로 가져와 톤을
// 맞췄다(사용자 요청 — "요즘 가장 힘든 점이 뭐예요?" 화면과 비슷한 꾸밈이 있었으면 좋겠다).
// 레오(입체레오 18번, 공사 안전모+바리케이드) — "무엇을 개선하면"이라는 질문을 직관적으로 표현.

const OTHER = "기타 직접 입력";
const OPTIONS = [
  "조금 더 긴 적응기간",
  "업무량·담당업무 조정",
  "충분한 휴식·쉬는 시간",
  "편하게 질문할 수 있는 사람",
  "업무에 맞는 추가 교육",
  "잘하고 있다는 인정·격려",
  "근무표·교대근무 조정",
  "급여·보상 개선",
  "당장은 잘 모르겠어요",
  OTHER,
];

// 선택지마다 왼쪽에 붙는 손그림 아이콘 — 텍스트는 그대로 두고 UI 레이어에서만 매핑한다.
const OPTION_ICON_MAP: Record<string, DoodleIconType> = {
  "조금 더 긴 적응기간": "growth",
  "업무량·담당업무 조정": "workload",
  "충분한 휴식·쉬는 시간": "rest",
  "편하게 질문할 수 있는 사람": "relationship",
  "업무에 맞는 추가 교육": "education",
  "잘하고 있다는 인정·격려": "selfDoubt",
  "근무표·교대근무 조정": "shift",
  "급여·보상 개선": "salary",
  "당장은 잘 모르겠어요": "unsure",
  [OTHER]: "etc",
};

type Phase = "picking" | "elaborating";

export default function StayMenuStep({
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
  const [phase, setPhase] = useState<Phase>("picking");
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
      step: "stay_menu",
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

  function handlePick(opt: string) {
    if (opt === OTHER) {
      setDraft("");
      setError(null);
      setPhase("elaborating");
      return;
    }
    save(opt);
  }

  function handleOtherSubmit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("답변을 입력해주세요.");
      return;
    }
    setError(null);
    save(trimmed);
  }

  if (phase === "elaborating") {
    return (
      <SoftCard level={3} className="page-enter">
        <p className="font-title text-title font-bold text-[var(--text-brown)]" style={{ lineHeight: "var(--leading-title)" }}>
          자유롭게 적어주세요
        </p>
        <SoftTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="mt-3"
          placeholder="여기에 답변을 적어주세요"
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <SoftIconButton onClick={() => setPhase("picking")} aria-label="뒤로">
            <BackArrowIcon />
          </SoftIconButton>
          <SoftButton onClick={handleOtherSubmit} disabled={submitting}>
            {submitting ? "저장하는 중..." : "다음"}
          </SoftButton>
        </div>
      </SoftCard>
    );
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={18} size="sm" />
      </div>
      <div className="relative">
        <span className="absolute -top-1 left-1 opacity-60 sm:left-4">
          <DoodleHeart />
        </span>
        <span className="absolute -top-1 right-1 opacity-60 sm:right-4">
          <DoodleStar />
        </span>
        <p
          className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
          style={{ lineHeight: "var(--leading-title)" }}
        >
          무엇이 조금만 나아지면, 한 달은 더 버틸 수 있을까요?
        </p>
        <span className="absolute bottom-0 left-6 opacity-55 sm:left-10">
          <DoodleCurve />
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const iconType = OPTION_ICON_MAP[opt];
          return (
            <SoftChoice
              key={opt}
              icon={<DoodleIcon type={iconType} />}
              iconBgClass={DOODLE_ICON_BG[iconType]}
              onClick={() => handlePick(opt)}
            >
              {opt}
            </SoftChoice>
          );
        })}
      </div>
      {onBack && (
        <SoftIconButton onClick={onBack} aria-label="뒤로" className="mx-auto mt-3">
          <BackArrowIcon />
        </SoftIconButton>
      )}
    </SoftCard>
  );
}
