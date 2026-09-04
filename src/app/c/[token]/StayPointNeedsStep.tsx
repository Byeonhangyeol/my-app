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

// Stay Point 트랙의 두 번째 질문: 후배 간호사가 선생님처럼 버티려면 무엇이 필요할지 확인한다.
// 첫 번째 Stay Point 질문(StayPointStep)과 마찬가지로 공개 수준을 다시 묻지 않고, 대화
// 시작 전에 고른 기본 공개 수준(baseDisclosure)을 그대로 써서 저장한다.
// "기타"만 자유 의견 안내 문구를 달고, 나머지 선택지도 모두 "어떤 면이 개선되어야
// 하나요?"라는 같은 후속 질문으로 서술을 받는다.
// 선택지 아이콘·제목 주변 손그림 장식은 FrictionMapStep과 같은 화면구성으로 맞췄다(사용자 요청).
// 레오(입체레오 4번, 하트 풍선 들고 신나게 점프) — 첫 질문과 같은 캐릭터로 톤을 맞춤.

const OTHER = "기타";
const OPTIONS = [
  "업무량 조정",
  "근무표·휴식 보장",
  "교육 지원",
  "좋은 팀 분위기",
  "급여·보상 개선",
  "관리자 지원",
  "업무환경 개선",
  OTHER,
];

// 선택지마다 왼쪽에 붙는 손그림 아이콘 — FrictionMapStep의 FRICTION_ICON_MAP과 같은 방식.
const NEEDS_ICON_MAP: Record<string, DoodleIconType> = {
  "업무량 조정": "workload",
  "근무표·휴식 보장": "rest",
  "교육 지원": "education",
  "좋은 팀 분위기": "relationship",
  "급여·보상 개선": "salary",
  "관리자 지원": "support",
  "업무환경 개선": "department",
  [OTHER]: "etc",
};

function promptFor(opt: string): string {
  return opt === OTHER ? "자유롭게 의견을 남겨주세요" : "어떤 면이 개선되어야 하나요?";
}

type Phase = "picking" | "elaborating";

export default function StayPointNeedsStep({
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
  const [picked, setPicked] = useState<string | null>(null);
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
      step: "stay_point_needs",
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
    setPicked(opt);
    setDraft("");
    setError(null);
    setPhase("elaborating");
  }

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("답변을 입력해주세요.");
      return;
    }
    save(`${picked} — ${trimmed}`);
  }

  if (phase === "elaborating" && picked) {
    return (
      <SoftCard level={3} className="page-enter">
        <p
          className="font-title text-title font-bold text-[var(--text-brown)]"
          style={{ lineHeight: "var(--leading-title)" }}
        >
          {promptFor(picked)}
        </p>
        <SoftTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="mt-3"
          placeholder="여기에 적어주세요"
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <SoftIconButton
            onClick={() => {
              setPicked(null);
              setPhase("picking");
            }}
            aria-label="뒤로"
          >
            <BackArrowIcon />
          </SoftIconButton>
          <SoftButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? "저장하는 중..." : "다음"}
          </SoftButton>
        </div>
      </SoftCard>
    );
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={4} size="sm" />
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
          돌이켜 봤을 때, 후배들도 선생님처럼 버텨낼 수 있으려면, 무엇이 가장 개선되야 할까요?
        </p>
        <span className="absolute bottom-0 left-6 opacity-55 sm:left-10">
          <DoodleCurve />
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const iconType = NEEDS_ICON_MAP[opt];
          const icon = <DoodleIcon type={iconType} />;
          const iconBgClass = DOODLE_ICON_BG[iconType];
          return opt === OTHER ? (
            <SoftChoice key={opt} icon={icon} iconBgClass={iconBgClass} onClick={() => handlePick(opt)}>
              {opt}{" "}
              <span className="font-body text-hint font-normal text-[var(--text-gray)]">
                (의견을 자유롭게 주세요!)
              </span>
            </SoftChoice>
          ) : (
            <SoftChoice key={opt} icon={icon} iconBgClass={iconBgClass} onClick={() => handlePick(opt)}>
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
