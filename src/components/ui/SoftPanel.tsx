import type { ReactNode } from "react";

// SoftCard보다 한 단계 낮은(depth level 1) 컨테이너. 화면 전체를 감싸는 큰 배경 패널이나,
// 카드로 완전히 가두고 싶지 않은 콘텐츠 묶음에 쓴다 — 그림자는 아주 옅게만.

export function SoftPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] ${className}`}
      style={{
        background: "linear-gradient(160deg, var(--surface-bg-3) 0%, var(--surface-bg-1) 100%)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}
