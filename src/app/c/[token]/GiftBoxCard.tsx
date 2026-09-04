"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// 1년 근속(Stay Point) 축하 메시지 상자 카드 — 감사 문구(gratitude_messages, 행정간호사가
// /admin/publish에서 추가·수정·삭제)를 무작위로 하나 꺼내 보여준다. 팝업이 아니라 실제로
// 상자를 열어 편지를 꺼내는 느낌을 주려고, 뚜껑이 날아가듯 열리는 애니메이션(gift-lid-open) ·
// 반짝이가 사방으로 튀는 애니메이션(gift-confetti-piece) · 편지가 상자 안에서 올라오는
// 애니메이션(gift-letter-rise)을 함께 재생한다(globals.css에 정의). 한 번 열면 끝이라
// 다시 열어보는 기능은 없다(사용자 요청) — "선물" 대신 "메시지"라는 표현을 쓴다.
// 레오(입체레오 4번, 하트 풍선 들고 신나게 점프) — 1년을 채운 것을 함께 기뻐하는 톤.

type GiftMessage = { id: string; text: string };

const CONFETTI_COLORS = ["var(--pink)", "var(--lavender)", "var(--apricot)", "var(--sky)", "var(--doodle-yellow)"];

function buildConfettiPieces(seed: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2 + seed;
    const distance = 2.6 + (i % 3) * 0.55;
    return {
      key: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: `${(Math.cos(angle) * distance).toFixed(2)}rem`,
      y: `${(Math.sin(angle) * distance - 1.2).toFixed(2)}rem`,
      rotate: `${Math.round(angle * (180 / Math.PI) + 90)}deg`,
      delay: `${(i % 5) * 55}ms`,
    };
  });
}

export default function GiftBoxCard({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const [messages, setMessages] = useState<GiftMessage[] | null>(null);
  const [current, setCurrent] = useState<GiftMessage | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.from("gratitude_messages").select("id, message_text");
      const list = (data ?? []).map((row) => ({ id: row.id as string, text: row.message_text as string }));
      setMessages(list);
    }
    load();
  }, []);

  function openBox() {
    if (!messages || messages.length === 0 || isOpen) return;
    const picked = messages[Math.floor(Math.random() * messages.length)];
    setCurrent(picked);
    setConfettiSeed(Math.random() * Math.PI * 2);
    setIsOpen(true);
  }

  const confettiPieces = useMemo(() => buildConfettiPieces(confettiSeed), [confettiSeed]);

  return (
    <SoftCard level={3} className="page-enter flex flex-col items-center">
      <div className="flex justify-center">
        <LeoCharacter n={4} size="sm" />
      </div>

      {/* 클릭 범위를 뚜껑 한 줄이 아니라 상자 전체로 넓힌다(사용자 요청: 누르는 곳이 잘 안눌림) —
          바깥 요소 자체를 버튼으로 만들고, 안쪽 뚜껑은 시각 효과만 남긴 span으로 바꿨다. */}
      <button
        type="button"
        onClick={openBox}
        disabled={!messages || isOpen}
        aria-label={isOpen ? "메시지 상자" : "메시지 상자 열기"}
        className="group relative mt-4 flex h-44 w-44 items-center justify-center disabled:cursor-default sm:h-52 sm:w-52"
      >
        {/* 상자 본체 */}
        <span
          aria-hidden
          className="absolute inset-x-3 bottom-1 top-14 rounded-[1.25rem]"
          style={{
            background: "linear-gradient(155deg, #ffb4c6 0%, var(--pink) 55%, var(--pink-strong) 100%)",
            boxShadow: "var(--shadow-lg)",
          }}
        />
        {/* 세로 리본 */}
        <span
          aria-hidden
          className="absolute top-14 bottom-1 left-1/2 w-6 -translate-x-1/2"
          style={{ background: "linear-gradient(180deg,#fffaf0,#ffe4a8)" }}
        />

        {/* 뚜껑 — 열리면 날아가듯 회전하며 사라진다 */}
        <span
          aria-hidden
          className={`absolute inset-x-0 top-8 h-11 rounded-[1rem] transition-transform duration-200 ease-out ${
            isOpen ? "gift-lid-open pointer-events-none" : "group-hover:-translate-y-1 group-active:scale-95"
          }`}
          style={{
            background: "linear-gradient(155deg, #fff1c9 0%, var(--doodle-yellow) 100%)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* 가로 리본(뚜껑 위) */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2"
            style={{ background: "linear-gradient(180deg,#fffaf0,#ffe4a8)" }}
          />
          {/* 리본 매듭 */}
          <span className="absolute left-1/2 -top-3 flex -translate-x-1/2 items-center gap-0.5" aria-hidden>
            <span className="h-4 w-5 rounded-full" style={{ background: "#ffe4a8", transform: "rotate(-20deg)" }} />
            <span className="h-3 w-3 rounded-full" style={{ background: "#ffd070" }} />
            <span className="h-4 w-5 rounded-full" style={{ background: "#ffe4a8", transform: "rotate(20deg)" }} />
          </span>
        </span>

        {/* 반짝이 — 열릴 때만 마운트돼서 애니메이션이 처음부터 재생된다 */}
        {isOpen && (
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-10">
            {confettiPieces.map((p) => (
              <span
                key={p.key}
                className="gift-confetti-piece absolute h-2 w-2 rounded-full"
                style={
                  {
                    background: p.color,
                    animationDelay: p.delay,
                    "--confetti-x": p.x,
                    "--confetti-y": p.y,
                    "--confetti-rotate": p.rotate,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        )}
      </button>

      {!isOpen ? (
        <p className="font-hero text-hint mt-3 text-center text-[var(--text-brown)]">
          {messages === null ? "메시지를 준비하는 중..." : "메시지를 눌러보세요"}
        </p>
      ) : (
        current && (
          <div className="-mt-5 flex w-full flex-col items-center">
            <div
              className="gift-letter-rise w-full rounded-[var(--radius-md)] px-5 py-6 text-center sm:px-7"
              style={{
                background: "linear-gradient(150deg, #fffaf0 0%, var(--surface-bg-3) 100%)",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            >
              <p className="font-hero text-hint font-semibold text-[var(--text-gray)]">TO. 우리의 1년차 간호사</p>
              <p
                className="font-title text-section mt-3 font-bold text-[var(--text-brown)]"
                style={{ lineHeight: "var(--leading-body)" }}
              >
                {current.text}
              </p>
              <p className="font-hero text-hint mt-3 text-[var(--text-brown)]">함께해 주셔서 감사합니다 ♥</p>
            </div>
          </div>
        )
      )}

      <div className="mt-6 flex w-full items-center justify-between">
        {onBack ? (
          <SoftIconButton onClick={onBack} aria-label="뒤로">
            <BackArrowIcon />
          </SoftIconButton>
        ) : (
          <span />
        )}
        <SoftButton onClick={onNext}>다음</SoftButton>
      </div>
    </SoftCard>
  );
}
