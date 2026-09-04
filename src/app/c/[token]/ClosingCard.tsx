"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminAction } from "@/types/db";
import { LeoCharacter, SoftCard, SoftButton, DoodleStar, DoodleBubble, DoodleHeart } from "@/components/ui";

// "여러분의 이야기를 토대로..." 제목/버튼 영역 — 제목 아래 눈에 띄는 색·크기의 "어떡해요?"
// 버튼을 두어(누르면 문제점/개선점 내용이 펼쳐짐) 명확히 누를 수 있는 CTA로 만들었다.
// 예전에 있던 "1년을 견뎌낸 선배 한마디"(무작위 인용) 대신, 맨 아래 마무리 문구를
// isStayPoint로 분기한다 — Stay Point(1년 경과) 트랙은 "여러분도 이제 남의 힘이 됐다"는
// 순환 구조 문구를, 3/6/9개월 트랙은 원래 있던 감사 문구를 보여준다.

// 대화 맨 마지막에 보여주는 카드 — 행정 개선 조치, 참여해준 것 자체에 대한 감사 메시지를
// 한 번에 보여준다. 끝맺음도 시작 화면(IntroStep)과 같은 톤으로 마무리한다.
// (DESIGN.md "공유 통계 카드", PLAN.md 17·18번 작업)
// 레오(입체레오 9번, 고깔모자+색종이 컨페티) — 끝까지 함께해준 것에 대한 축하.

export default function ClosingCard({
  isStayPoint,
  onBack,
  onRestart,
}: {
  isStayPoint: boolean;
  onBack?: () => void;
  onRestart?: () => void;
}) {
  const [actions, setActions] = useState<AdminAction[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase
        .from("admin_actions")
        .select("id, problem_text, improvement_text, created_at")
        .eq("is_exposed", true)
        .order("created_at", { ascending: false });
      setActions(
        (data ?? []).map((row) => ({
          id: row.id,
          problemText: row.problem_text,
          improvementText: row.improvement_text,
          isExposed: true, // 위 쿼리에서 is_exposed = true인 것만 불러왔다
          createdAt: row.created_at,
        })),
      );
    }
    load();
  }, []);

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center sm:py-20 md:py-28">
        <LeoCharacter n={9} size="lg" />
        <h1 className="font-hero text-hero mt-2 font-bold text-pink-500">끝!</h1>
        <p className="font-body text-hint text-[var(--text-gray)]">오늘 이야기 들려줘서 고마워요</p>
        {onRestart && (
          <button type="button" onClick={onRestart} className="mt-4 font-body text-hint text-[var(--text-gray)] underline">
            처음으로
          </button>
        )}
      </div>
    );
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={9} size="sm" />
      </div>
      <div className="mt-3 flex flex-col gap-6">
        <div>
          <p
            className="font-hero text-title text-center font-bold text-[var(--text-brown)]"
            style={{ lineHeight: "var(--leading-title)" }}
          >
            여러분의 소중한 이야기를 듣고 간호행정팀은 이렇게 해보았습니다!!
          </p>
          <div className="flex justify-center">
            <SoftButton variant="primary" shape="rect" className="mt-3" onClick={() => setActionsOpen((prev) => !prev)}>
              <span style={{ fontFamily: "var(--font-hero)" }}>{actionsOpen ? "닫기" : "뭘 했는지 확인"}</span>
            </SoftButton>
          </div>
          {actionsOpen &&
            (actions === null ? (
              <p className="font-body text-hint mt-2 text-center text-[var(--text-gray)]">불러오는 중...</p>
            ) : actions.length === 0 ? (
              <p className="font-body text-hint mt-2 text-center text-[var(--text-gray)]">아직 등록된 내용이 없어요.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {actions.map((a) => (
                  <li
                    key={a.id}
                    className="font-body text-hint rounded-[var(--radius-md)] border-2 border-[var(--soft-pink)] bg-[var(--soft-pink)]/30 px-3 py-2 text-center text-[var(--text-brown)]"
                  >
                    <p>
                      <span className="text-accent">문제점</span> {a.problemText}
                    </p>
                    <p className="mt-0.5">
                      <span className="text-accent">개선점</span> {a.improvementText}
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </div>

        <div className="relative border-t border-[var(--soft-pink)] pt-6">
          <span className="absolute top-3 left-0 opacity-60 sm:left-2">
            <DoodleBubble />
          </span>
          <span className="absolute top-8 right-1 opacity-55 sm:right-4">
            <DoodleStar />
          </span>
          <span className="absolute bottom-1 left-4 opacity-50 sm:left-8">
            <DoodleStar />
          </span>
          <span className="absolute right-4 bottom-4 opacity-60 sm:right-8">
            <DoodleBubble />
          </span>
          {isStayPoint ? (
            <>
              <p className="font-hero text-section font-semibold text-center text-[var(--text-brown)]">
                3개월, 6개월, 9개월 전 여러분은 누군가의 1년째 이야기를 듣고 그 힘으로 버텼어요. 이제는 선생님
                덕분에, 또 다른 누군가가 버틸 힘을 얻었어요.
              </p>
              <div className="relative mt-4">
                <span className="absolute -top-2 left-2 opacity-50 sm:left-8">
                  <DoodleHeart />
                </span>
                <span className="absolute -top-3 right-3 opacity-50 sm:right-10">
                  <DoodleStar />
                </span>
                <p
                  className="font-hero text-title text-center font-bold"
                  style={{ color: "var(--pink-strong)", lineHeight: "var(--leading-title)" }}
                >
                  정말 자랑스럽고 감사합니다.
                </p>
                <span className="absolute -bottom-2 left-1/4 opacity-40">
                  <DoodleBubble />
                </span>
                <span className="absolute -bottom-3 right-1/4 opacity-40">
                  <DoodleHeart />
                </span>
              </div>
            </>
          ) : (
            <p className="font-hero text-section font-semibold text-center text-[var(--text-brown)]">
              힘든 이야기를 꺼내주셔서 감사해요!
              <br />
              덕분에 지금 저희와 함께 출발한 선생님과 다음 후배들을 위한 변화가 조금씩 만들어지고 있어요!
              <br />
              힘들면 언제라도 간호국 행정간호사를 찾아주셔도 됩니다!
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center gap-2">
          <SoftButton onClick={() => setFinished(true)}>
            <span style={{ fontFamily: "var(--font-hero)" }}>끝!</span>
          </SoftButton>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="font-hero text-hint text-[var(--text-gray)] underline"
            >
              뒤로
            </button>
          )}
        </div>
      </div>
    </SoftCard>
  );
}
