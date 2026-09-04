"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BaseDisclosure } from "@/types/db";
import { LeoCharacter, SoftCard, SoftInput, SoftSelect, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/departments";

// 대화 끝 무렵, 딱 한 번만 도움이 필요한지 확인한다 — 예전에는 사직의사·가장 힘든 점·
// Stay Menu 답변마다 각각 "공개할래요?"를 물었지만, 매번 물어보면 번거롭다는 피드백에 따라
// 대화 끝에서 한 번만 확인하는 방식으로 바꿨다(사용자 요청).
// 1단계) "도움을 받아보고 싶으신가요?" — 여기서 "네"를 고르고, 아직 이름까지 공개를
// 고르지 않은 사람만 2단계로 넘어간다(이미 이름까지 공개했다면 신원은 이미 있으므로 바로
// 3단계로 넘어간다).
// 2단계) "선생님을 확인해도 괜찮을까요?" — 익명으로는 실제 지원을 연결해줄 수 없으므로
// (사용자 요청), 여기서 동의해야만(이름을 받아) 3단계로 넘어간다. 동의하지 않으면("생각해보니
// 아직은 안될 것 같아요") 아무것도 남기지 않고 그냥 넘어간다.
// 3단계) "어떤 방식으로 도움을 받고 싶으세요?" — 신원을 밝힌 다음, 실제 대화를 원하는지
// 아니면 마음만 전달되길 원하는지 물어본다(사용자 요청) — 이 서비스는 실시간 1:1 상담
// 기능이 없으므로(PRD 6번 비범위) 여기서 "대화"를 고르더라도 앱 안에서 바로 이어지는 게
// 아니라, 행정간호사가 위급 신호 알림에서 이 선택을 보고 별도로(전화·대면 등) 연락하는
// 방식이다. 선택 결과는 emergency_alerts에 기록해서 행정간호사가 "위급 신호 알림"
// 목록에서 확인할 수 있게 한다 — response_id 없이(대화 끝의 자발적 요청이라 특정 답변에
// 묶이지 않음) 남긴다. 이 대화의 답변 공개 수준도 함께 올린다(escalate_disclosure).
// 레오(입체레오 13번, 두 손으로 볼을 감싼 편안한 포즈) — "조용히, 소중히 전달할게요" 안심시키는 느낌.

const HELP_REASONING = "대화를 마치며 도움을 받고 싶다고 직접 요청했어요.";

type ContactMode = "talk" | "relay_only";

const CONTACT_MODE_NOTE: Record<ContactMode, string> = {
  talk: "실제로 이야기를 나눠보고 싶어 해요.",
  relay_only: "마음만 전달해달라고 했어요 (아직 직접 대화는 원하지 않음).",
};

type Phase = "asking_help" | "asking_reveal" | "entering_name" | "asking_mode";

export default function FinalDisclosureStep({
  base,
  cohortId,
  deviceId,
  onNext,
  onBack,
}: {
  base: BaseDisclosure;
  cohortId: string;
  deviceId: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("asking_help");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(base.department ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [pendingMode, setPendingMode] = useState<ContactMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function logHelpRequest(revealedName: string | null, contactMode: ContactMode) {
    if (!supabase) return { error: null };
    const { error: insertError } = await supabase.from("emergency_alerts").insert({
      cohort_id: cohortId,
      device_id: deviceId,
      consented: true,
      disclosed_name: revealedName,
      reasoning: `${HELP_REASONING} ${CONTACT_MODE_NOTE[contactMode]}`,
    });
    return { error: insertError };
  }

  function handleWantsHelp() {
    if (base.level !== "name") {
      setPhase("asking_reveal");
      return;
    }
    // 이미 이름까지 공개를 골랐다면 신원이 이미 있으므로 바로 3단계(방식 선택)로 넘어간다.
    setPhase("asking_mode");
  }

  function handleConfirmName() {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setError(null);
    setPhase("asking_mode");
  }

  async function handleChooseMode(mode: ContactMode) {
    if (!supabase) return;
    setSubmitting(true);
    setPendingMode(mode);
    setError(null);
    const revealedName = base.level === "name" ? (base.name ?? null) : name.trim();
    const escalateRes =
      base.level === "name"
        ? null
        : await supabase.rpc("escalate_disclosure", {
            p_device_id: deviceId,
            p_cohort_id: cohortId,
            p_name: revealedName,
            p_department: department.trim() || null,
          });
    const { error: alertError } = await logHelpRequest(revealedName, mode);
    setSubmitting(false);
    setPendingMode(null);
    if (escalateRes?.error || alertError) {
      setError("전달에 실패했어요. 다시 시도해주세요.");
      return;
    }
    onNext();
  }

  if (phase === "entering_name") {
    return (
      <SoftCard level={3} className="page-enter">
        <div className="flex justify-center">
          <LeoCharacter n={13} size="sm" />
        </div>
        <p
          className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
          style={{ lineHeight: "var(--leading-title)" }}
        >
          도움을 연결하려면 선생님을 확인해도 괜찮을까요?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <SoftInput value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력해주세요" />
          <SoftSelect value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">부서 (선택)</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SoftSelect>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <SoftIconButton onClick={() => setPhase("asking_reveal")} disabled={submitting} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
            <SoftButton onClick={handleConfirmName} disabled={submitting}>
              {submitting ? "전달하는 중..." : "확인"}
            </SoftButton>
          </div>
        </div>
      </SoftCard>
    );
  }

  if (phase === "asking_mode") {
    return (
      <SoftCard level={3} className="page-enter">
        <div className="flex justify-center">
          <LeoCharacter n={13} size="sm" />
        </div>
        <p
          className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
          style={{ lineHeight: "var(--leading-title)" }}
        >
          어떤 방식으로 도움을 받고 싶으세요?
        </p>
        <p className="font-body text-hint mt-2 text-center text-[var(--text-gray)]">
          &quot;대화&quot;를 골라도 이 화면에서 바로 이어지진 않아요. 행정간호사가 확인하고
          따로 연락을 드려요.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <SoftButton onClick={() => handleChooseMode("talk")} disabled={submitting} className="w-full max-w-xs">
            {pendingMode === "talk" ? "전달하는 중..." : "실제로 이야기를 나눠보고 싶어요"}
          </SoftButton>
          <SoftButton variant="secondary" onClick={() => handleChooseMode("relay_only")} disabled={submitting} className="w-full max-w-xs">
            {pendingMode === "relay_only" ? "전달하는 중..." : "간호국에 제 마음만 전달해주세요"}
          </SoftButton>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <SoftIconButton
            onClick={() => setPhase(base.level === "name" ? "asking_help" : "entering_name")}
            disabled={submitting}
            aria-label="뒤로"
            className="mx-auto mt-1"
          >
            <BackArrowIcon />
          </SoftIconButton>
        </div>
      </SoftCard>
    );
  }

  if (phase === "asking_reveal") {
    return (
      <SoftCard level={3} className="page-enter">
        <div className="flex justify-center">
          <LeoCharacter n={13} size="sm" />
        </div>
        <p
          className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
          style={{ lineHeight: "var(--leading-title)" }}
        >
          도움을 연결하려면 선생님을 확인해도 괜찮을까요?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex justify-center gap-2">
            <SoftButton onClick={() => setPhase("entering_name")} disabled={submitting}>
              네, 정보를 남길게요
            </SoftButton>
            <SoftButton variant="secondary" onClick={onNext} disabled={submitting}>
              생각해보니 아직은 안될 것 같아요
            </SoftButton>
          </div>
          <SoftIconButton onClick={() => setPhase("asking_help")} disabled={submitting} aria-label="뒤로" className="mx-auto mt-1">
            <BackArrowIcon />
          </SoftIconButton>
        </div>
      </SoftCard>
    );
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={13} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        지금의 마음을 그냥 남겨두지 않고,
        <br />
        도움을 받아보고 싶으신가요?
      </p>
      <p
        className="font-body text-body mt-3 text-center text-[var(--text-body-color)]"
        style={{ lineHeight: "var(--leading-body)" }}
      >
        사직을 고민하고 계시거나, 너무 힘든 시간을 겪고 계신다면
        <br />
        <br />
        원하실 경우 간호국 행정간호사가 내용을 확인하고
        <br />
        가능한 지원이나 조정 방법이 있는지 함께 찾아볼게요.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex justify-center gap-2">
          <SoftButton onClick={handleWantsHelp} disabled={submitting}>
            {submitting ? "전달하는 중..." : "도움을 받아보고 싶어요"}
          </SoftButton>
          <SoftButton variant="secondary" onClick={onNext} disabled={submitting}>
            지금은 괜찮아요
          </SoftButton>
        </div>
        {onBack && (
          <SoftIconButton onClick={onBack} aria-label="뒤로" className="mx-auto mt-1">
            <BackArrowIcon />
          </SoftIconButton>
        )}
      </div>
    </SoftCard>
  );
}
