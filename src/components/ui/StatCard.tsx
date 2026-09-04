import type { ReactNode } from "react";
import { SoftCard } from "./SoftCard";

// 퍼센트·인원 수 같은 핵심 숫자를 본문보다 훨씬 크게 보여주는 카드.
// label은 sentence case 짧은 문구, value는 큰 숫자, children에 도넛/막대 등 보조 시각화를
// 이어 붙일 수 있다.

export function StatCard({
  label,
  value,
  hint,
  level = 3,
  children,
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  level?: 2 | 3 | 4;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <SoftCard level={level} className={className}>
      <p className="text-hint font-body text-[var(--text-gray)]">{label}</p>
      <p className="number-pop mt-1 font-hero text-[clamp(2.25rem,5vw,3.25rem)] leading-none font-bold text-[var(--pink-strong)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-hint font-body text-[var(--text-gray)]">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </SoftCard>
  );
}
