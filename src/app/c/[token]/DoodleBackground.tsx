// 화면 전체에 연하게 깔리는 손그림 느낌의 배경 장식 (하트·별·아이스크림·반짝임).
// 내용을 가리지 않도록 아주 옅은 색과 낮은 불투명도로, 절대 위치로만 흩뿌려둔다.

const DOODLES = [
  { emoji: "🍦", top: "4%", left: "-6%", size: "3.5rem", rotate: "-15deg" },
  { emoji: "💕", top: "10%", right: "-4%", size: "2rem", rotate: "10deg" },
  { emoji: "⭐", top: "28%", left: "82%", size: "1.5rem", rotate: "-8deg" },
  { emoji: "✨", top: "40%", left: "2%", size: "1.75rem", rotate: "12deg" },
  { emoji: "🍓", top: "55%", right: "-5%", size: "2.5rem", rotate: "-10deg" },
  { emoji: "🌸", top: "68%", left: "-4%", size: "2.25rem", rotate: "6deg" },
  { emoji: "🎀", top: "80%", left: "78%", size: "1.75rem", rotate: "-6deg" },
  { emoji: "☁️", top: "92%", left: "5%", size: "2.5rem", rotate: "0deg" },
] as const;

export default function DoodleBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      {DOODLES.map((d, i) => (
        <span
          key={i}
          className="absolute select-none"
          style={{
            top: d.top,
            left: "left" in d ? d.left : undefined,
            right: "right" in d ? d.right : undefined,
            fontSize: d.size,
            transform: `rotate(${d.rotate})`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  );
}
