"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// Stay Menu 답변 직후, 같은 시점(3/6/9개월)의 이전 기수들이 남긴 Stay Menu 답변을 몇 개
// 무작위로 보여준다. 이 카드는 Stay Point "선배 한마디" 카드와는 별개다 — 같은 연차끼리
// 답변을 나눠보는 용도라 1년 이상 근속자의 이야기와 섞지 않는다.
// 이름·부서를 공개했어도 여기서는 항상 익명으로만 나간다 — get_previous_stay_menu_quotes
// RPC가 answer_text만 돌려주도록 만들어져 있어 구조적으로 익명 처리된다.
// deviceId로 이 기기가 이미 본 문구는 quote_impressions에 기록해두고 다음엔 제외한다 —
// 같은 사람에게 같은 문구가 반복해서 보이는 것을 막기 위해서다(사용자 리포트).
// 보여줄 문구가 하나도 없으면(아직 이전 기수 응답이 없음) "아직 모인 이야기가 없어요"라고
// 빈 화면을 보여주는 대신, 이 카드 자체를 건너뛰고 바로 다음 단계로 넘어간다(사용자 요청).
// 이때 onEmpty로 부모(page.tsx)에게도 알려서, 나중에 뒤로가기가 이 단계로 돌아왔을 때도
// 똑같이 건너뛰게 한다 — 안 그러면 돌아왔다가 곧바로 다시 앞으로 튕겨 나가 "뒤로가기가
// 안 먹힌다"는 버그가 된다(사용자 리포트).
// 레오(입체레오 22번, 책 읽는 포즈) — 같은 연차 선배들의 이야기를 들어보는 느낌.

export default function StayMenuPeerQuotesCard({
  cohortId,
  deviceId,
  onNext,
  onEmpty,
  onBack,
}: {
  cohortId: string;
  deviceId: string;
  onNext: () => void;
  onEmpty?: () => void;
  onBack?: () => void;
}) {
  const [quotes, setQuotes] = useState<string[] | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.rpc("get_previous_stay_menu_quotes", {
        p_cohort_id: cohortId,
        p_device_id: deviceId,
        p_limit: 3,
      });
      const list = (data ?? []).map((row: { answer_text: string }) => row.answer_text);
      if (list.length === 0) {
        onEmpty?.();
        onNext();
        return;
      }
      setQuotes(list);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, deviceId]);

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={22} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        같은 시점의 선배들은 이렇게 말했어요
      </p>
      <div className="mt-3 font-body text-body text-[var(--text-body-color)] sm:mt-4">
        {quotes === null ? (
          <p className="font-body text-hint text-center text-[var(--text-gray)]">불러오는 중...</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {quotes.map((q, i) => (
              <li key={i}>&quot;{q}&quot;</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between">
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
