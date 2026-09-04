// 선택지 왼쪽에 붙는 손그림(hand-drawn) 느낌의 작은 아이콘. 완벽한 기하학적 라인이 아니라
// 볼펜으로 슥슥 그린 듯한 자연스러운 선(살짝 비대칭, round cap/join, 얇은 두께)으로 그린다.
// 레오 캐릭터보다 절대 눈에 띄면 안 되는 "작은 감성 포인트"라, 색은 옅은 파스텔 + 무광
// 브라운 선(--doodle-*, globals.css)만 쓰고 채우기는 최소화한다.
// 카드 안 아이콘 배지 배경(파스텔 원)은 SoftChoice의 iconBgClass로 따로 지정한다.

export type DoodleIconType =
  | "relationship"
  | "shift"
  | "workload"
  | "selfDoubt"
  | "patient"
  | "rest"
  | "education"
  | "support"
  | "etc"
  | "anonymous"
  | "department"
  | "name"
  | "salary"
  | "growth"
  | "unsure";

const OUTLINE = "var(--doodle-outline)";
const OUTLINE_SOFT = "var(--doodle-outline-soft)";

function Base({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" className="h-7 w-7 sm:h-8 sm:w-8" fill="none">
      {children}
    </svg>
  );
}

// 대인관계 — 서로 마주보는 두 말풍선 + 그 사이 아주 작은 하트.
function Relationship() {
  return (
    <Base>
      <path
        d="M6 10c0-2 2-3.5 5-3.5h4c3 0 5 1.6 5 3.7 0 2-2 3.6-5 3.6h-1l-3 3 .3-3.2c-3.3-.4-5.3-1.9-5.3-3.6Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-pink-soft)"
      />
      <path
        d="M20 20.5c0-1.8 1.8-3.2 4.5-3.2h3.6c2.7 0 4.5 1.5 4.5 3.4 0 1.8-1.8 3.3-4.5 3.3h-.8l-2.6 2.7.2-2.9c-3-.4-4.9-1.8-4.9-3.3Z"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-blue-soft)"
      />
      <path
        d="M19.3 14.2c.5-.6 1.5-.5 1.7.3.2-.8 1.2-.9 1.7-.3.5.6.2 1.5-1.7 2.7-1.9-1.2-2.2-2.1-1.7-2.7Z"
        fill="var(--doodle-pink)"
      />
    </Base>
  );
}

// 교대근무 — 해와 달이 나란히.
function Shift() {
  return (
    <Base>
      <circle cx="14" cy="16" r="6.2" stroke={OUTLINE} strokeWidth="1.9" fill="var(--doodle-yellow-soft)" />
      <path
        d="M14 6.8v2.2M22 16h2.2M6 16H3.8M8.6 9.6l1.5 1.6M19.5 9.6 18 11.2M8.6 22.4l1.5-1.6M19.5 22.4 18 20.8"
        stroke={OUTLINE}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M30.5 12.5c3.2 0 5.7 2.6 5.7 5.9 0 3.4-2.5 6-5.7 6-2 0-3.8-1-4.9-2.6 1 .3 2 .2 2.9-.3 1.9-1.1 2.7-3.4 2-5.4-.6-1.7-2-2.9-3.7-3.2.6-.3 1.2-.4 1.7-.4Z"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-blue-soft)"
      />
    </Base>
  );
}

// 업무강도 — 손그림 번개 한 개.
function Workload() {
  return (
    <Base>
      <path
        d="M22 5.5 12.5 20.8h6.3L16 34.5l13-16.6h-6.8L22 5.5Z"
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-yellow-soft)"
      />
    </Base>
  );
}

// 본인이 부족한거 같다는 감정 — 작은 하트에 반창고를 붙여, 속상하지만 괜찮다는 느낌으로.
function SelfDoubt() {
  return (
    <Base>
      <path
        d="M20 32c-6.8-4.6-11-8.7-11-13.9 0-3.5 2.6-6 5.9-6 2 0 3.9 1.1 5.1 2.9 1.2-1.8 3.1-2.9 5.1-2.9 3.3 0 5.9 2.5 5.9 6 0 5.2-4.2 9.3-11 13.9Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-pink-soft)"
      />
      <path
        d="M11.5 20.5h17"
        stroke="var(--doodle-cream)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 20.5h17M14 17.7l-2 2.8 2 2.8M25.5 17.7l2 2.8-2 2.8"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Base>
  );
}

// 환자 응대 — 작은 얼굴 + 말풍선 + 하트.
function Patient() {
  return (
    <Base>
      <path
        d="M7 9.5c0-2.3 2.2-4 5.6-4h4.8c3.4 0 5.6 1.9 5.6 4.3 0 2.3-2.2 4.2-5.6 4.2h-1l-3.4 3.4.3-3.6c-3.7-.5-5.9-2.2-5.9-4.3Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-blue-soft)"
      />
      <circle cx="12.4" cy="9.3" r="1" fill={OUTLINE} />
      <circle cx="17.2" cy="9.3" r="1" fill={OUTLINE} />
      <path d="M12.6 11.4c1 .8 3.2.8 4.2 0" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M27 24.5c-4.4-3-7.1-5.7-7.1-9 0-2.3 1.7-3.9 3.8-3.9 1.3 0 2.5.7 3.3 1.9.8-1.2 2-1.9 3.3-1.9 2.1 0 3.8 1.6 3.8 3.9 0 3.3-2.7 6-7.1 9Z"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-pink-soft)"
      />
    </Base>
  );
}

// 휴식 부족 — 베개 + 위에 떠 있는 작은 Z.
function Rest() {
  return (
    <Base>
      <path
        d="M6 20c0-4 3.5-6.8 8.5-6.8h11c5 0 8.5 2.8 8.5 6.8s-3.5 6.8-8.5 6.8h-11C9.5 26.8 6 24 6 20Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-lavender)"
      />
      <path d="M17 20c1.6-1.6 4.4-1.6 6 0s4.4 1.6 6 0" stroke={OUTLINE_SOFT} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M25.5 5.5h7l-7 7h7" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

// 교육 부족 — 펼쳐진 책 + 연필.
function Education() {
  return (
    <Base>
      <path
        d="M6 9.5c3-1.4 6.6-1.4 9 .4v16.6c-2.4-1.8-6-1.8-9-.4V9.5Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-green)"
      />
      <path
        d="M24 9.5c-3-1.4-6.6-1.4-9 .4v16.6c2.4-1.8 6-1.8 9-.4V9.5Z"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-green)"
        fillOpacity="0.6"
      />
      <path d="M8.5 13.5c1.7-.7 3.6-.7 5 .1M8.5 18c1.7-.7 3.6-.7 5 .1" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M28 6.5 34 12.6 24.4 22.2l-4 1.3 1.3-4L28 6.5Z"
        stroke={OUTLINE}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-yellow-soft)"
      />
    </Base>
  );
}

// 지원 부족 — 손을 내미는 작은 구명튜브.
function Support() {
  return (
    <Base>
      <circle cx="20" cy="20" r="13" stroke={OUTLINE} strokeWidth="1.9" fill="var(--doodle-blue-soft)" />
      <circle cx="20" cy="20" r="5.6" stroke={OUTLINE} strokeWidth="1.8" fill="var(--doodle-cream)" />
      <path
        d="M20 7v7.4M20 25.6V33M7 20h7.4M25.6 20H33"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Base>
  );
}

// 기타 — 메모지 + 연필.
function Etc() {
  return (
    <Base>
      <path
        d="M7 6.5h16v22c0 1.7-1.4 3-3.1 3H10.1c-1.7 0-3.1-1.3-3.1-3v-22Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-cream)"
      />
      <path d="M10.5 12h9M10.5 16.5h9M10.5 21h6" stroke={OUTLINE_SOFT} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M28.5 9 34 14.5 23.8 24.7l-5 1.5 1.5-5L30.5 11l-2-2Z"
        stroke={OUTLINE}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-pink-soft)"
      />
    </Base>
  );
}

// 완전 익명 — 손그림 자물쇠(잠김).
function Anonymous() {
  return (
    <Base>
      <path
        d="M12 17.5v-4.3c0-2.8 2.3-5 5-5s5 2.2 5 5v4.3"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="7.5" y="17" width="17" height="12.5" rx="3" stroke={OUTLINE} strokeWidth="1.9" fill="var(--doodle-pink-soft)" />
      <circle cx="16" cy="22.7" r="1.4" fill={OUTLINE} />
      <path d="M16 24.1v2.6" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
    </Base>
  );
}

// 부서만 공개 — 손그림 건물.
function Department() {
  return (
    <Base>
      <path
        d="M9 30V9.5c0-1 .8-1.8 1.8-1.8h9.4c1 0 1.8.8 1.8 1.8V30"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-yellow-soft)"
      />
      <path d="M13 12h1.4M17.6 12H19M13 16.5h1.4M17.6 16.5H19M13 21h1.4M17.6 21H19" stroke={OUTLINE_SOFT} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 30h13.5" stroke={OUTLINE} strokeWidth="1.9" strokeLinecap="round" />
    </Base>
  );
}

// 이름까지 공개 — 손그림 열린 자물쇠.
function Name() {
  return (
    <Base>
      <path
        d="M12 17.5v-4.3c0-2.5 1.9-4.6 4.3-4.9 2.2-.3 4.3 1 5 3"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="7.5" y="17" width="17" height="12.5" rx="3" stroke={OUTLINE} strokeWidth="1.9" fill="var(--doodle-lavender)" />
      <circle cx="16" cy="22.7" r="1.4" fill={OUTLINE} />
      <path d="M16 24.1v2.6" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
    </Base>
  );
}

// 급여·보상 — 겹쳐 쌓인 동전 두 닢.
function Salary() {
  return (
    <Base>
      <circle cx="14" cy="24" r="9" stroke={OUTLINE_SOFT} strokeWidth="1.9" fill="var(--doodle-yellow-soft)" />
      <circle cx="22" cy="15" r="9" stroke={OUTLINE} strokeWidth="1.9" fill="var(--doodle-yellow-soft)" />
      <path d="M22 11.5v7M18.5 15h7" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
    </Base>
  );
}

// 조금 더 긴 적응기간 — 땅 위로 올라온 새싹.
function Growth() {
  return (
    <Base>
      <path d="M20 30V17" stroke={OUTLINE} strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M20 18c-1-4-5-5-9-4 1 4 5 6 9 4Z"
        stroke={OUTLINE}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-green)"
      />
      <path
        d="M20 20.5c1-4 5-5 9-4-1 4-5 6-9 4Z"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-green)"
        fillOpacity="0.7"
      />
      <path d="M13.5 30.5h13" stroke={OUTLINE} strokeWidth="1.9" strokeLinecap="round" />
    </Base>
  );
}

// 당장은 잘 모르겠어요 — 물음표가 떠 있는 손그림 말풍선.
function Unsure() {
  return (
    <Base>
      <path
        d="M8 14c0-4.4 4.4-8 10-8s10 3.6 10 8c0 4-3.6 7.3-8.3 7.9l-3.7 3.6.4-3.8C11.8 20.8 8 18 8 14Z"
        stroke={OUTLINE}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--doodle-lavender)"
      />
      <path
        d="M15.5 12.3c.3-1.7 1.9-2.8 3.6-2.5 1.7.3 2.8 1.9 2.4 3.5-.3 1.3-1.4 1.8-2.2 2.4-.6.5-1 .9-1 1.7"
        stroke={OUTLINE_SOFT}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="19.3" r="1" fill={OUTLINE} />
    </Base>
  );
}

const ICONS: Record<DoodleIconType, () => React.ReactElement> = {
  relationship: Relationship,
  shift: Shift,
  workload: Workload,
  selfDoubt: SelfDoubt,
  patient: Patient,
  rest: Rest,
  education: Education,
  support: Support,
  etc: Etc,
  anonymous: Anonymous,
  department: Department,
  name: Name,
  salary: Salary,
  growth: Growth,
  unsure: Unsure,
};

export function DoodleIcon({ type }: { type: DoodleIconType }) {
  const Icon = ICONS[type];
  return <Icon />;
}

// 아이콘 배지(원형 배경) 색 — SoftChoice의 iconBgClass로 그대로 넘겨 쓴다.
export const DOODLE_ICON_BG: Record<DoodleIconType, string> = {
  relationship: "bg-[var(--doodle-pink-soft)]",
  shift: "bg-[var(--doodle-blue-soft)]",
  workload: "bg-[var(--doodle-yellow-soft)]",
  selfDoubt: "bg-[var(--doodle-pink-soft)]",
  patient: "bg-[var(--doodle-blue-soft)]",
  rest: "bg-[var(--doodle-lavender)]",
  education: "bg-[var(--doodle-green)]",
  support: "bg-[var(--doodle-blue-soft)]",
  etc: "bg-[var(--doodle-cream)]",
  anonymous: "bg-[var(--doodle-pink-soft)]",
  department: "bg-[var(--doodle-yellow-soft)]",
  name: "bg-[var(--doodle-lavender)]",
  salary: "bg-[var(--doodle-yellow-soft)]",
  growth: "bg-[var(--doodle-green)]",
  unsure: "bg-[var(--doodle-lavender)]",
};
