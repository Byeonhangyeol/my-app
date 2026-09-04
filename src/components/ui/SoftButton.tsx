import type { ButtonHTMLAttributes, ReactNode } from "react";

// 앱 전체가 공유하는 버튼. 전부 pill로 만들지 않고 shape로 용도를 구분한다.
// variant: primary(포인트 컬러, 살짝 볼록) / secondary(화이트 뉴모픽) / selected(포인트 컬러 + 강조)
// shape: pill(둥근 알약, 주요 CTA) / rect(둥근 사각형, 일반 액션) / circle(아이콘 전용)

type Variant = "primary" | "secondary" | "selected";
type Shape = "pill" | "rect" | "circle";

const SHAPE_CLASS: Record<Shape, string> = {
  pill: "rounded-full px-7 py-3.5 sm:px-9 sm:py-4",
  rect: "rounded-[var(--radius-md)] px-5 py-3",
  circle: "h-11 w-11 rounded-full p-0",
};

function variantStyle(variant: Variant): React.CSSProperties {
  if (variant === "primary") {
    return {
      background: "linear-gradient(155deg, #ffaec4 0%, var(--pink) 55%, var(--pink-strong) 100%)",
      boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.5)",
      color: "#fff",
    };
  }
  if (variant === "selected") {
    return {
      background: "linear-gradient(155deg, var(--pink-strong) 0%, var(--pink) 100%)",
      boxShadow: "var(--shadow-inset), 0 0 0 2px rgba(255,143,171,0.35)",
      color: "#fff",
    };
  }
  return {
    background: "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-2) 100%)",
    boxShadow: "var(--shadow-sm)",
    color: "var(--text-brown)",
  };
}

export function SoftButton({
  children,
  variant = "primary",
  shape = "pill",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  shape?: Shape;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`font-button text-button inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${SHAPE_CLASS[shape]} ${className}`}
      style={variantStyle(variant)}
      {...rest}
    >
      {children}
    </button>
  );
}
