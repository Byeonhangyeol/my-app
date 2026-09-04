"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// "1년을 견뎌냈던 이유" 카드 — Stay Point 답변 직후(1년 트랙)뿐 아니라 3/6/9개월 트랙에서도
// 보여준다(사용자 요청: 아직 1년이 안 된 사람에게도 먼저 버텨낸 선배의 이유가 힘이 된다).
// 기수·인원수는 더 이상 보여주지 않는다 — 기수에 상관없이 지금까지 쌓인 전체 응답·직접 작성
// 문구 중에서 무작위로 1개만 뽑는다(get_stay_point_quotes, 사용자 요청). 본인 device_id가
// 남긴 응답은 제외한다.
// deviceId로 이미 본 문구는 quote_impressions에 기록해 다음엔 제외한다(다른 인용문 카드와
// 같은 중복 방지 패턴). 보여줄 문구가 하나도 없으면 카드째 건너뛴다.
// 레오(입체레오 14번, 둘이 함께 간식 먹는 포즈) — 같이 버텨낸 사람이 있다는 공동체감 표현.

export default function StayPointShareCard({
  deviceId,
  onNext,
  onEmpty,
  onBack,
}: {
  deviceId: string;
  onNext: () => void;
  onEmpty?: () => void;
  onBack?: () => void;
}) {
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.rpc("get_stay_point_quotes", {
        p_device_id: deviceId,
        p_limit: 1,
      });
      const list = (data ?? []).map((row: { answer_text: string }) => row.answer_text);
      if (list.length === 0) {
        onEmpty?.();
        onNext();
        return;
      }
      setQuote(list[0]);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={14} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        다른 동기들은 이거 때매 남을 수 있었대요.
      </p>
      <div className="mt-3 font-body text-body text-[var(--text-body-color)] sm:mt-4">
        {quote === null ? (
          <p className="font-body text-hint text-center text-[var(--text-gray)]">불러오는 중...</p>
        ) : (
          <p className="text-center">&quot;{quote}&quot;</p>
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
