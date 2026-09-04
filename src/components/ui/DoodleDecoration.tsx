// 페이지 제목 주변에 아주 작게 곁들이는 손그림 장식(하트/별/곡선). 화면마다 정해진 위치에만
// 쓰고(랜덤 배치 금지), 제목보다 훨씬 작고 옅게(opacity 0.45~0.7) 둔다 — "장식"이지 콘텐츠가
// 아니므로 절대 눈에 띄면 안 된다. 쓰는 곳에서 `absolute` 위치(top/left 등)를 직접 지정한다.

const OUTLINE = "var(--doodle-outline-soft)";

export function DoodleHeart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${className}`} fill="none">
      <path
        d="M12 20c-4.4-3-7-5.7-7-9 0-2.3 1.8-4 4-4 1.3 0 2.6.7 3 1.9.4-1.2 1.7-1.9 3-1.9 2.2 0 4 1.7 4 4 0 3.3-2.6 6-7 9Z"
        stroke={OUTLINE}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-pink-soft)"
      />
    </svg>
  );
}

export function DoodleStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${className}`} fill="none">
      <path
        d="M12 3.5c.5 2.8 1 4.3 2.2 5.5s2.7 1.7 5.5 2.2c-2.8.5-4.3 1-5.5 2.2s-1.7 2.7-2.2 5.5c-.5-2.8-1-4.3-2.2-5.5S7.1 11.7 4.3 11.2c2.8-.5 4.3-1 5.5-2.2S11.5 6.3 12 3.5Z"
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-yellow-soft)"
      />
    </svg>
  );
}

export function DoodleBubble({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${className}`} fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={OUTLINE} strokeWidth="1.4" fill="var(--doodle-blue-soft)" fillOpacity="0.5" />
      <path d="M8.5 7.8c-1.4 1-2.2 2.4-2.3 4" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleCurve({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 14" className={`h-2.5 w-6 sm:h-3 sm:w-7 ${className}`} fill="none">
      <path d="M2 3c5 8 16 10 26 3" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
