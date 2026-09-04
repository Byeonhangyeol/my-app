import type { ReactNode } from "react";

// 앱 전체가 공유하는 "떠 있는 판넬" 카드. border+background+box-shadow를 화면마다 새로
// 짓지 않고, 이 컴포넌트 하나가 depth level(2~4)에 따라 톤과 그림자 강도만 바꿔 재사용된다.
//
// level 2 = 일반 카드/통계 카드 (--shadow-md)
// level 3 = 주요 CTA·핵심 결과를 담는 카드 (--shadow-lg, 살짝 더 밝은 그라데이션)
// level 4 = 지금 선택된 항목/가장 중요한 결과 (--shadow-xl + 포인트 컬러 테두리 글로우)

const LEVEL_STYLE: Record<2 | 3 | 4, { boxShadow: string; background: string }> = {
  2: {
    boxShadow: "var(--shadow-md)",
    background: "linear-gradient(150deg, var(--surface-white) 0%, var(--surface-bg-2) 100%)",
  },
  3: {
    boxShadow: "var(--shadow-lg)",
    background: "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-3) 100%)",
  },
  4: {
    boxShadow: "var(--shadow-xl), 0 0 0 1.5px var(--soft-pink)",
    background: "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-3) 100%)",
  },
};

export function SoftCard({
  children,
  level = 2,
  className = "",
  style,
  as: As = "div",
}: {
  children: ReactNode;
  level?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "li";
}) {
  const levelStyle = LEVEL_STYLE[level];
  return (
    <As
      className={`rounded-[var(--radius-lg)] px-6 py-7 sm:px-8 sm:py-8 ${className}`}
      style={{
        background: levelStyle.background,
        boxShadow: levelStyle.boxShadow,
        border: "1px solid rgba(255,255,255,0.7)",
        ...style,
      }}
    >
      {children}
    </As>
  );
}
