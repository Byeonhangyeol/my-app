"use client";

import { useState } from "react";
import type { DisclosureLevel } from "@/types/db";
import {
  LeoCharacter,
  SoftCard,
  SoftChoice,
  SoftInput,
  SoftSelect,
  SoftButton,
  SoftIconButton,
  BackArrowIcon,
  DoodleIcon,
  DOODLE_ICON_BG,
} from "@/components/ui";
import { DEPARTMENTS } from "@/lib/departments";

// 마찰 지도·Stay Menu·Stay Point 답변 직후마다 공개 수준을 물어보는 공용 컴포넌트.
// 완전 익명 / 부서만 공개 / 이름까지 공개 중 선택한다 — 로그인이 없어 명단과 자동으로
// 매칭하지 않으므로, 부서·이름은 본인이 직접 입력한다.
// (PRD.md 개인 식별 모델·공개등급, PLAN.md 12번 작업)
// 레오(입체레오 2번, 두 손으로 볼을 감싼 수줍은 포즈) — 조심스럽게 물어보는 느낌.

// 문장 안의 특정 단어 하나만 다른 색으로 강조해 보여준다 (문구 자체는 그대로, 표시만 다르게).
function HighlightText({ text, keyword, className }: { text: string; keyword: string; className: string }) {
  const idx = text.indexOf(keyword);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className={className}>{keyword}</span>
      {text.slice(idx + keyword.length)}
    </>
  );
}

// title prop은 "질문? 설명."처럼 한 문장에 이어 붙어 오므로, 화면에서만 제목/설명 두 줄로
// 나눠 보여준다 — prop 구조나 호출부는 그대로 두고 보여주는 방식만 바꾸는 것.
function splitTitle(full: string): { headline: string; description: string } {
  const match = full.match(/^(.*?[?.!])\s*([\s\S]*)$/);
  if (!match) return { headline: full, description: "" };
  return { headline: match[1], description: match[2] };
}

export default function DisclosureStep({
  submitting,
  onConfirm,
  onBack,
  title = "이 답변을 간호국에 어떻게 전달할까요?",
}: {
  submitting: boolean;
  onConfirm: (
    level: DisclosureLevel,
    extra: { name?: string; department?: string }
  ) => void;
  onBack?: () => void;
  title?: string;
}) {
  const [level, setLevel] = useState<DisclosureLevel | null>(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { headline, description } = splitTitle(title);

  function handlePick(picked: DisclosureLevel) {
    setError(null);
    if (picked === "anonymous") {
      onConfirm("anonymous", {});
      return;
    }
    setLevel(picked);
  }

  function handleSubmitDetail() {
    if (level === "department") {
      if (!department.trim()) {
        setError("부서를 입력해주세요.");
        return;
      }
      onConfirm("department", { department: department.trim() });
      return;
    }
    if (level === "name") {
      if (!name.trim()) {
        setError("이름을 입력해주세요.");
        return;
      }
      onConfirm("name", {
        name: name.trim(),
        department: department.trim() || undefined,
      });
    }
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={2} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        <HighlightText text={headline} keyword="전달" className="text-accent" />
      </p>
      {description && (
        <p
          className="font-body text-body mt-3 text-center text-[var(--text-body-color)]"
          style={{ lineHeight: "var(--leading-body)" }}
        >
          <HighlightText text={description} keyword="이름까지 공개" className="text-accent" />
        </p>
      )}

      {level === null && (
        <div className="mt-8 flex flex-col gap-3">
          <SoftChoice
            icon={<DoodleIcon type="anonymous" />}
            iconBgClass={DOODLE_ICON_BG.anonymous}
            onClick={() => handlePick("anonymous")}
            disabled={submitting}
          >
            완전 익명
          </SoftChoice>
          <SoftChoice
            icon={<DoodleIcon type="department" />}
            iconBgClass={DOODLE_ICON_BG.department}
            onClick={() => handlePick("department")}
            disabled={submitting}
          >
            부서만 공개
          </SoftChoice>
          <SoftChoice
            icon={<DoodleIcon type="name" />}
            iconBgClass={DOODLE_ICON_BG.name}
            onClick={() => handlePick("name")}
            disabled={submitting}
          >
            이름까지 공개
          </SoftChoice>
          {onBack && (
            <SoftIconButton onClick={onBack} disabled={submitting} aria-label="뒤로" className="mt-1 self-start">
              <BackArrowIcon />
            </SoftIconButton>
          )}
        </div>
      )}

      {level === "department" && (
        <div className="mt-8 flex flex-col gap-3">
          <SoftSelect value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">부서를 선택해주세요</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SoftSelect>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <SoftIconButton onClick={() => setLevel(null)} disabled={submitting} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
            <SoftButton onClick={handleSubmitDetail} disabled={submitting}>
              {submitting ? "저장하는 중..." : "확인"}
            </SoftButton>
          </div>
        </div>
      )}

      {level === "name" && (
        <div className="mt-8 flex flex-col gap-3">
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
            <SoftIconButton onClick={() => setLevel(null)} disabled={submitting} aria-label="뒤로">
              <BackArrowIcon />
            </SoftIconButton>
            <SoftButton onClick={handleSubmitDetail} disabled={submitting}>
              {submitting ? "저장하는 중..." : "확인"}
            </SoftButton>
          </div>
        </div>
      )}
    </SoftCard>
  );
}
