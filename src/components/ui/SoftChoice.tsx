import type { ReactNode } from "react";

// 선택형 질문(마찰 지도 항목, 공개 수준, 예/아니오 등)에서 쓰는 "누를 수 있는 작은 3D 타일".
// 선택 전에는 밝게 떠 있고, 선택하면 포인트 컬러 + 눌린(살짝 inset) 느낌으로 바뀌면서
// 체크 아이콘이 나타난다. 평평한 checkbox 목록처럼 보이지 않게 하는 것이 목적.

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SoftChoice({
  children,
  icon,
  iconBgClass,
  selected = false,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  icon?: ReactNode;
  iconBgClass?: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`group flex w-full items-center gap-4 rounded-[var(--radius-md)] px-5 py-4 text-left transition-all duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 ${className}`}
      style={{
        background: selected
          ? "linear-gradient(155deg, var(--pink-strong) 0%, var(--pink) 100%)"
          : "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-2) 100%)",
        boxShadow: selected ? "var(--shadow-inset), 0 0 0 2px rgba(255,143,171,0.3)" : "var(--shadow-sm)",
        color: selected ? "#fff" : "var(--text-brown)",
      }}
    >
      {icon && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${
            selected ? "bg-white/25" : (iconBgClass ?? "bg-[var(--soft-pink)]")
          }`}
        >
          {icon}
        </span>
      )}
      <span className="font-button text-section flex-1 font-semibold">{children}</span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
          selected ? "scale-100 bg-white/90 text-[var(--pink-strong)] opacity-100" : "scale-75 opacity-0"
        }`}
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
