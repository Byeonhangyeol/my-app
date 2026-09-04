import type { ButtonHTMLAttributes, ReactNode } from "react";

// 뒤로가기 화살표처럼 아이콘 하나만 담는 작은 원형 버튼. 텍스트 링크보다 터치하기 쉽고
// (최소 44px), 눌리면 안쪽으로 들어가는 뉴모픽 인셋 느낌을 준다.

export function SoftIconButton({
  children,
  className = "",
  "aria-label": ariaLabel,
  ...rest
}: {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-body-color)] transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        background: "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-2) 100%)",
        boxShadow: "var(--shadow-sm)",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function BackArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
