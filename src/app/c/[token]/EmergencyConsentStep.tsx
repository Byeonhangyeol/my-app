"use client";

import { useState } from "react";
import { LeoCharacter, SoftInput, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// 위급 신호가 감지됐을 때 "행정간호사에게 알려도 될지" 동의를 구하는 화면.
// 동의하면 이름을 받아 신원과 함께 전달하고, 거절·무응답이면 익명으로만 전달한다 — 임의로
// 신원을 밝히지 않는다. (PRD.md 위급 처리, PLAN.md 13번 작업)
// 레오(입체레오 19번, 다가와 살펴보는 포즈) — 걱정스럽게 귀 기울여 듣는 느낌.
// 카드는 다른 화면과 달리 따뜻한 amber 톤을 유지해 "조금 더 특별히 신경 쓰는 순간"임을 표시한다.

export default function EmergencyConsentStep({
  submitting,
  onDecide,
  onBack,
}: {
  submitting: boolean;
  onDecide: (consented: boolean, name?: string) => void;
  onBack?: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmitName() {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    onDecide(true, name.trim());
  }

  return (
    <div
      className="page-enter rounded-[var(--radius-lg)] px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12"
      style={{
        background: "linear-gradient(150deg, #fffaf0 0%, #fdf3dc 100%)",
        boxShadow: "var(--shadow-lg)",
        border: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex justify-center">
        <LeoCharacter n={19} size="sm" />
      </div>
      <p className="font-body text-body mt-3 text-center text-amber-900">
        지금 하신 말씀이 마음에 걸려요. 간호국 간호행정에게 알려서 더 빠르게 도움을 받을 수 있게
        해도 될까요?
      </p>

      {!agreed ? (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex justify-center gap-2">
            <SoftButton onClick={() => setAgreed(true)} disabled={submitting}>
              네, 도움을 받고 싶어요
            </SoftButton>
            <SoftButton variant="secondary" onClick={() => onDecide(false)} disabled={submitting}>
              아니요, 괜찮아요
            </SoftButton>
          </div>
          {onBack && (
            <SoftIconButton onClick={onBack} disabled={submitting} aria-label="뒤로" className="mx-auto mt-1">
              <BackArrowIcon />
            </SoftIconButton>
          )}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <SoftInput value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력해주세요" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <SoftIconButton onClick={() => setAgreed(false)} disabled={submitting} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
            <SoftButton onClick={handleSubmitName} disabled={submitting}>
              {submitting ? "전달하는 중..." : "확인"}
            </SoftButton>
          </div>
        </div>
      )}
    </div>
  );
}
