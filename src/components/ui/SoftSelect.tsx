import type { SelectHTMLAttributes } from "react";

// SoftInput과 똑같은 인셋(눌린) 느낌을 쓰는 드롭다운 — 부서 선택처럼 정해진 목록 중
// 하나만 고르게 할 때 자유 텍스트 입력 대신 쓴다.

const BASE_STYLE: React.CSSProperties = {
  background: "var(--surface-bg-2)",
  boxShadow: "var(--shadow-inset)",
};

export function SoftSelect({
  className = "",
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`font-body text-body w-full rounded-[var(--radius-md)] border border-transparent px-4 py-3 text-[var(--text-brown)] transition-shadow duration-200 focus:border-[var(--pink)] focus:outline-none ${className}`}
      style={BASE_STYLE}
      {...rest}
    />
  );
}
