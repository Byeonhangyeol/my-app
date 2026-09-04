"use client";

import { useState } from "react";
import type { DisclosureLevel } from "@/types/db";
import { LeoCharacter, SoftCard, SoftInput, SoftSelect, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/departments";

// 처음에 고른 공개 수준이 완전 익명/부서만 공개일 때, 사직의사·가장 힘든 점·무엇이 버티게
// 하는지 같은 핵심 답변마다 "이번 답변만큼은 부서·이름까지 공개해서 전달할 의향이 있는지"
// 가볍게 한 번 더 물어보는 컴포넌트. 이미 처음부터 이름까지 공개를 골랐다면 이 단계 자체를
// 건너뛴다 (page.tsx의 baseDisclosure.level === "name" 분기 참고).
// (사용자 요청: 질문마다 매번 3단계를 다시 고르게 하지 않고, 처음 한 번 고른 뒤 필요할 때만
// 공개 의향을 확인하는 방식으로 변경)
// 레오(입체레오 13번, 두 손으로 볼을 감싼 편안한 포즈) — "조용히, 소중히 전달할게요" 안심시키는 느낌.

export default function DisclosureEscalateStep({
  base,
  submitting,
  onResolve,
  onBack,
}: {
  base: { level: DisclosureLevel; name?: string; department?: string };
  submitting: boolean;
  onResolve: (level: DisclosureLevel, extra: { name?: string; department?: string }) => void;
  onBack?: () => void;
}) {
  const [asking, setAsking] = useState(true);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(base.department ?? "");
  const [error, setError] = useState<string | null>(null);
  const isAnonymous = base.level === "anonymous";

  function handleConfirmName() {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    onResolve("name", { name: name.trim(), department: department.trim() || undefined });
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
        {isAnonymous
          ? "이 의견, 직접 전해드릴까요?"
          : "부서까지만 공개해주셨는데, 혹시 이름까지 함께 전달하고 싶으신가요?"}
      </p>
      <p
        className="font-body text-body mt-3 text-center text-[var(--text-body-color)]"
        style={{ lineHeight: "var(--leading-body)" }}
      >
        {isAnonymous
          ? "원하신다면 동의를 받아 간호국 또는 담당 파트장·팀장에게 전달해요. 모든 걸 바로 해결해드리긴 어렵지만, 가능한 부분은 개선으로 이어지도록 함께 방법을 찾아볼게요. 동의 없이는 신분이 공개되지 않아요."
          : "행정간호사인 제가 선생님의 의견을 조용히, 소중히 전달해 드릴게요."}
      </p>

      {asking ? (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex justify-center gap-2">
            <SoftButton onClick={() => setAsking(false)} disabled={submitting}>
              {isAnonymous ? "네, 전달하고 싶어요" : "네, 공개할게요"}
            </SoftButton>
            <SoftButton variant="secondary" onClick={() => onResolve(base.level, { name: base.name, department: base.department })} disabled={submitting}>
              {isAnonymous ? "아니요, 익명으로만 남길게요" : "아니요, 지금처럼 할게요"}
            </SoftButton>
          </div>
          {onBack && (
            <SoftIconButton onClick={onBack} aria-label="뒤로" className="mx-auto mt-1">
              <BackArrowIcon />
            </SoftIconButton>
          )}
        </div>
      ) : (
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
            <SoftIconButton onClick={() => setAsking(true)} disabled={submitting} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
            <SoftButton onClick={handleConfirmName} disabled={submitting}>
              {submitting ? "저장하는 중..." : "확인"}
            </SoftButton>
          </div>
        </div>
      )}
    </SoftCard>
  );
}
