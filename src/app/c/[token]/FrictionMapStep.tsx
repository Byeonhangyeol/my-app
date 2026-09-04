"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAlreadySavedError } from "@/lib/alreadySaved";
import type { BaseDisclosure } from "@/types/db";
import EmergencyConsentStep from "./EmergencyConsentStep";
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

// 마찰 지도: 지금 가장 힘든 점(마찰 지점)을 파악하는 질문.
// 어떤 선택지를 고르든 저장 전에 위로 문구를 하나(선택지별 3개 중 무작위) 먼저 보여준다.
// "교대근무"·"환자 응대"·"본인이 부족한거 같다는 감정"은 그 문구를 본 뒤 바로 답이 되고,
// 나머지 선택지는 저마다 다른 후속 질문을 보여준 뒤 그 서술을 받는다 — 이 자유 서술만
// AI가 위급 신호(자·타해 등)로 판단하고, 위급 신호면 간호국 간호행정에게 알려도 될지
// 동의를 구한다 (PRD.md 위급 처리, PLAN.md 13번 작업).
// 대화 시작 전에 고른 기본 공개 수준(baseDisclosure)을 그대로 써서 저장한다 — 답변마다
// 공개 의향을 다시 묻지 않고, 대화 맨 끝(FinalDisclosureStep)에서 한 번만 확인한다
// (사용자 요청: 예전엔 이 질문에서도 매번 물어봤는데, 번거롭다는 피드백에 따라 변경).
// 레오(입체레오 25번, 곤란한 듯 식은땀 흘리는 포즈) — "요즘 가장 힘든 점"에 공감하는 표정.

const OTHER = "기타";
const SELF_DOUBT = "본인이 부족한거 같다는 감정";

// 고르면 바로 답이 되는 게 아니라, 직접 이유를 적는 자유 서술 선택지 — 선택지마다 다른
// 질문을 띄운다. 이 서술만 AI 위급 신호 판단을 거친다.
const FREEFORM_OPTIONS: Record<string, { prompt: string }> = {
  대인관계: { prompt: "누구와의 관계가 제일 힘드신가요?" },
  업무강도: { prompt: "느끼시는 업무 강도가 어떠세요?" },
  "휴식 부족": { prompt: "어떤 휴식이 필요하세요?" },
  "교육 부족": { prompt: "어떤 점에서 부족하다고 느꼈고, 개선이 필요할까요?" },
  "지원 부족": { prompt: "어떤 지원이 부족하다고 생각하나요?" },
  [OTHER]: { prompt: "어떤 점이 힘든지 적어주세요" },
};

// 화면에 보여줄 선택지 순서.
const OPTION_ORDER = [
  "대인관계",
  "교대근무",
  "업무강도",
  SELF_DOUBT,
  "환자 응대",
  "휴식 부족",
  "교육 부족",
  "지원 부족",
  OTHER,
];

// 선택지를 고르면 저장 전에 위로가 되는 말을 먼저 보여준다 — 선택지마다 3개 중 1개를
// 무작위로 골라 보여주고, "다음"을 누르면 원래 이어지던 흐름(자유 서술 또는 바로 저장)을
// 그대로 진행한다.
const ENCOURAGEMENT_MESSAGES: Record<string, string[]> = {
  대인관계: [
    "사람 때문에 지치는 날도 있어요. 모든 관계를 잘 해내려고 애쓰지 않아도 괜찮아요.",
    "누군가와 맞지 않는다고 해서 내가 부족한 사람인 건 아니에요.",
    "오늘 조금 마음이 상했다면, 그만큼 관계를 소중하게 생각했다는 뜻일지도 몰라요.",
  ],
  교대근무: [
    "낮과 밤을 오가는 일은 생각보다 훨씬 큰 에너지가 필요해요. 힘든 게 당연해요.",
    "몸이 아직 이 리듬에 적응하고 있는 중이에요. 조금 천천히 가도 괜찮아요.",
    "남들은 잘 버티는 것 같아도, 교대근무는 누구에게나 쉽지 않아요. 오늘도 충분히 애썼어요.",
  ],
  업무강도: [
    "벅차다고 느끼는 건 약해서가 아니라, 지금 감당하고 있는 일이 많다는 뜻이에요.",
    "오늘 모든 걸 완벽하게 해내지 않아도 괜찮아요. 하나씩 해내고 있는 것만으로 충분해요.",
    "많이 힘든 날엔 '잘해야지'보다 '오늘도 잘 버텼다'고 말해줘도 괜찮아요.",
  ],
  [SELF_DOUBT]: [
    "처음부터 잘하는 사람은 없어요. 지금의 서툼은 부족함이 아니라 익숙해지는 과정이에요.",
    "모르는 게 많은 건 너무 당연해요. 아니면 신인 거죠…!",
    "지금 부족하게 느껴지는 건, 그만큼 더 잘하고 싶은 마음이 크다는 뜻일지도 몰라요.",
  ],
  "환자 응대": [
    "모든 순간에 완벽한 말을 할 수는 없어요. 경험이 쌓일수록 조금씩 나만의 감각이 생겨날 거예요.",
    "어려운 환자를 만났다고 해서 내가 응대를 못한 건 아니에요. 쉽지 않은 상황이었던 거예요.",
    "어떤 말을 해야 할지 막막했던 순간도 괜찮아요. 다음에는 오늘보다 조금 더 편해질 거예요.",
  ],
  "휴식 부족": [
    "쉬고 싶은 마음은 게으름이 아니라, 지금까지 많이 애썼다는 신호예요.",
    "계속 달리기만 하면 누구라도 지쳐요. 잠깐 멈추는 것도 잘 버티기 위한 방법이에요.",
    "오늘은 아무것도 안 하고 싶은 마음도 괜찮아요. 몸과 마음이 쉬고 싶다고 말하고 있는 거예요.",
  ],
  "교육 부족": [
    "배우지 못한 걸 처음부터 알고 있을 수는 없어요. 모르는 건 잘못이 아니에요.",
    "설명을 충분히 듣지 못했다면 막막한 게 당연해요. 혼자 부족하다고 생각하지 않았으면 좋겠어요.",
    "아직 배우는 중이라는 걸 잊지 마세요. 지금은 완벽해지는 시간이 아니라 익숙해지는 시간이에요.",
  ],
  "지원 부족": [
    "혼자 감당하기 버거운 일이 있다는 건 약해서가 아니에요. 누구에게나 함께해 줄 사람이 필요해요.",
    "'누가 조금만 도와줬으면 좋겠다'는 마음은 너무 자연스러운 마음이에요.",
    "모든 걸 혼자 해내지 않아도 괜찮아요. 도움을 필요로 하는 순간도 과정의 일부예요.",
  ],
  [OTHER]: [
    "어떤 마음이든 괜찮아요. 여기서는 잘 정리해서 말하지 않아도 돼요.",
    "말로 설명하기 어려운 마음도 있어요. 떠오르는 그대로 편하게 남겨주세요.",
    "작은 불편도 괜찮고, 큰 고민도 괜찮아요. 지금 느끼는 마음부터 들려주세요.",
  ],
};

// 선택지마다 왼쪽에 붙는 손그림 아이콘 — 텍스트는 그대로 두고 UI 레이어에서만 매핑한다.
const FRICTION_ICON_MAP: Record<string, DoodleIconType> = {
  대인관계: "relationship",
  교대근무: "shift",
  업무강도: "workload",
  [SELF_DOUBT]: "selfDoubt",
  "환자 응대": "patient",
  "휴식 부족": "rest",
  "교육 부족": "education",
  "지원 부족": "support",
  [OTHER]: "etc",
};

// 컴포넌트 함수 밖에 둬서, 이벤트 핸들러 안에서 Math.random()을 쓰더라도
// react-hooks/purity 린트가 "렌더 중 비순수 호출"로 오인하지 않게 한다.
function pickRandomEncouragement(option: string): string {
  const messages = ENCOURAGEMENT_MESSAGES[option];
  return messages[Math.floor(Math.random() * messages.length)];
}

type Phase = "picking" | "encouragement" | "elaborating_other" | "checking" | "emergency_consent";

export default function FrictionMapStep({
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
  const [otherText, setOtherText] = useState("");
  // 지금 자유 서술 중인 선택지 — 후속 질문 문구와 답변 접두사를 정하는 데 쓴다.
  // 일반 선택지를 골랐을 때는 null로 남아 있는다.
  const [currentFreeform, setCurrentFreeform] = useState<string | null>(null);
  // 위로 문구 화면에 쓸 정보 — 방금 고른 선택지와, 그 선택지의 3개 문구 중 무작위로
  // 고른 1개. "다음"을 누르면 이 pendingOption을 기준으로 원래 흐름을 이어간다.
  const [pendingOption, setPendingOption] = useState<string | null>(null);
  const [encouragementText, setEncouragementText] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<string | null>(null);
  const [emergencyReasoning, setEmergencyReasoning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // decision은 emergency_alerts에 함께 남길 위급 신호 동의 여부다. handleEmergencyDecision이
  // state를 갱신한 직후 같은 이벤트 안에서 곧바로 save를 호출하기 때문에(React state는
  // 다음 렌더에야 반영됨), state를 다시 읽지 않고 인자로 직접 넘겨받아 오래된 값을 쓰는
  // 실수를 막는다.
  async function save(text: string, decision: { consented: boolean; name?: string } | null) {
    if (!supabase) return;
    setSubmitting(true);
    setError(null);

    // anon(신규간호사)은 responses 테이블에 SELECT 권한이 없어서, insert 뒤 .select()로
    // 삽입된 행을 돌려받으려 하면(RETURNING) RLS가 막아버린다. 그래서 id를 미리 만들어
    // 같이 저장해두고, 위급 알림에도 그 값을 그대로 쓴다 — insert 결과를 다시 조회할 필요가 없다.
    const responseId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("responses").insert({
      id: responseId,
      cohort_id: cohortId,
      device_id: deviceId,
      step: "friction_map",
      answer_text: text,
      disclosure_level: baseDisclosure.level,
      disclosed_name: baseDisclosure.name ?? null,
      disclosed_department: baseDisclosure.department ?? null,
    });

    // 오류가 나서 새로고침한 뒤 같은 질문을 다시 답한 경우, 이미 저장돼 있어서 나는 유니크
    // 제약 위반(23505)은 진짜 실패가 아니다. 다만 이때는 방금 만든 responseId가 실제 저장된
    // 행의 id와 다르므로(그 행의 진짜 id는 anon이 조회할 수 없다), 위급 알림을 새로 연결하지
    // 않고 건너뛴다 — 아주 드문 이중 오류 상황이라, 신규간호사를 막지 않는 쪽을 택한다.
    const alreadySaved = insertError ? isAlreadySavedError(insertError) : false;
    if (insertError && !alreadySaved) {
      setSubmitting(false);
      setError("저장에 실패했어요. 다시 시도해주세요.");
      return;
    }

    if (decision && !alreadySaved) {
      await supabase.from("emergency_alerts").insert({
        response_id: responseId,
        cohort_id: cohortId,
        device_id: deviceId,
        consented: decision.consented,
        disclosed_name: decision.consented ? decision.name ?? null : null,
        reasoning: emergencyReasoning,
      });
    }

    setSubmitting(false);
    onComplete();
  }

  // 어떤 선택지를 고르든, 저장/서술 전에 먼저 위로 문구를 하나 무작위로 보여준다.
  function handlePickOption(picked: string) {
    setPendingOption(picked);
    setEncouragementText(pickRandomEncouragement(picked));
    setPhase("encouragement");
  }

  // 위로 문구 화면에서 "다음"을 누르면, 원래 그 선택지가 이어가던 흐름을 그대로 진행한다.
  function handleEncouragementNext() {
    const picked = pendingOption;
    if (!picked) return;
    if (picked in FREEFORM_OPTIONS) {
      setCurrentFreeform(picked);
      setOtherText("");
      setPhase("elaborating_other");
      return;
    }
    save(picked, null);
  }

  async function handleOtherSubmit() {
    const trimmed = otherText.trim();
    if (!trimmed) {
      setError("이유를 적어주세요.");
      return;
    }
    setError(null);
    const fullText = `${currentFreeform} — ${trimmed}`;
    setAnswerText(fullText);
    setPhase("checking");
    try {
      const res = await fetch("/api/emergency-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (data.isEmergency) {
        setEmergencyReasoning(typeof data.reasoning === "string" ? data.reasoning : null);
        setPhase("emergency_consent");
        return;
      }
    } catch {
      // 판단 요청이 실패해도 답변 자체는 계속 진행한다.
    }
    save(fullText, null);
  }

  function handleEmergencyDecision(consented: boolean, name?: string) {
    if (answerText) save(answerText, { consented, name });
  }

  // emergency_consent에서 뒤로가면 항상 자유 서술 중이었으므로(위급 판단은 자유 서술에만
  // 적용됨) 그 서술 화면으로 돌아간다.
  function handleBackFromEmergency() {
    setEmergencyReasoning(null);
    setPhase("elaborating_other");
  }

  if (phase === "emergency_consent") {
    return (
      <EmergencyConsentStep
        submitting={submitting}
        onDecide={handleEmergencyDecision}
        onBack={handleBackFromEmergency}
      />
    );
  }

  if (phase === "checking") {
    return <p className="font-body text-hint text-[var(--text-gray)]">확인하는 중...</p>;
  }

  if (phase === "encouragement" && encouragementText) {
    return (
      <SoftCard level={3} className="page-enter">
        <div className="flex justify-center">
          <LeoCharacter n={25} size="sm" />
        </div>
        <p
          className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
          style={{ lineHeight: "var(--leading-title)" }}
        >
          {encouragementText}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <SoftIconButton
            onClick={() => {
              setPendingOption(null);
              setEncouragementText(null);
              setPhase("picking");
            }}
            aria-label="뒤로"
          >
            <BackArrowIcon />
          </SoftIconButton>
          <SoftButton onClick={handleEncouragementNext}>다음</SoftButton>
        </div>
      </SoftCard>
    );
  }

  if (phase === "elaborating_other" && currentFreeform) {
    return (
      <SoftCard level={3} className="page-enter">
        <p className="font-title text-title font-bold text-[var(--text-brown)]" style={{ lineHeight: "var(--leading-title)" }}>
          {FREEFORM_OPTIONS[currentFreeform].prompt}
        </p>
        <SoftTextarea
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          rows={3}
          className="mt-3"
          placeholder="여기에 적어주세요"
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <SoftIconButton
            onClick={() => {
              setOtherText("");
              setPhase("encouragement");
            }}
            aria-label="뒤로"
          >
            <BackArrowIcon />
          </SoftIconButton>
          <SoftButton onClick={handleOtherSubmit}>다음</SoftButton>
        </div>
      </SoftCard>
    );
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={25} size="sm" />
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
          요즘 가장 힘든 점이 뭐예요?
        </p>
        <span className="absolute bottom-0 left-6 opacity-55 sm:left-10">
          <DoodleCurve />
        </span>
      </div>
      <p className="font-body text-hint mt-1 text-center text-[var(--text-gray)]">
        이 답변을 보고 관리하는 사람은 간호국 전체가 아니라 행정간호사 저 1명이에요. 걱정 마세요.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        {OPTION_ORDER.map((opt) => {
          const iconType = FRICTION_ICON_MAP[opt];
          const icon = <DoodleIcon type={iconType} />;
          const iconBgClass = DOODLE_ICON_BG[iconType];
          return opt === OTHER ? (
            <SoftChoice key={opt} icon={icon} iconBgClass={iconBgClass} onClick={() => handlePickOption(opt)}>
              {opt}{" "}
              <span className="font-body text-hint font-normal text-[var(--text-gray)]">
                (자유롭게 의견을 전해 주세요!!)
              </span>
            </SoftChoice>
          ) : (
            <SoftChoice key={opt} icon={icon} iconBgClass={iconBgClass} onClick={() => handlePickOption(opt)}>
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
