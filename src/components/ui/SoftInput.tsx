import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// 텍스트 입력창 — 버튼과 반대로 안쪽으로 들어간(inset) 느낌을 준다. 포커스 시에만
// 포인트 컬러 테두리가 살짝 도드라진다.

const BASE_STYLE: React.CSSProperties = {
  background: "var(--surface-bg-2)",
  boxShadow: "var(--shadow-inset)",
};

export function SoftInput({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`font-body text-body w-full rounded-[var(--radius-md)] border border-transparent px-4 py-3 text-[var(--text-brown)] transition-shadow duration-200 placeholder:text-[var(--text-gray)] focus:border-[var(--pink)] focus:outline-none ${className}`}
      style={BASE_STYLE}
      {...rest}
    />
  );
}

export function SoftTextarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`font-body text-body w-full rounded-[var(--radius-md)] border border-transparent px-4 py-3 text-[var(--text-brown)] transition-shadow duration-200 placeholder:text-[var(--text-gray)] focus:border-[var(--pink)] focus:outline-none ${className}`}
      style={BASE_STYLE}
      {...rest}
    />
  );
}
