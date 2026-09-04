"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// 1년을 먼저 견딘 선배가 후배에게 남기는 말 — /admin/publish에서 행정간호사가 직접 쓴
// 글(curated_quotes, category='stay_point_letter')만 무작위로 하나 보여준다. 실제 응답과
// 달리 8개 선택지 구조에 맞지 않는 자유 서술형 글이라 별도 카드로 분리했다(사용자 요청).
// deviceId로 이미 본 글은 quote_impressions에 기록해 다음엔 제외한다 — 다른 인용문 카드와
// 같은 중복 방지 패턴이다. 보여줄 글이 하나도 없으면(아직 등록된 글이 없음) 카드 자체를
// 건너뛰고(onEmpty로 부모에 알려 뒤로가기도 함께 건너뛰게 함) 바로 다음 단계로 넘어간다.
// 레오(입체레오 13번, 두 손으로 볼을 감싼 편안한 포즈) — 조용히 편지를 건네는 느낌.

export default function StayPointLetterCard({
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
  const [letter, setLetter] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.rpc("get_stay_point_letters", {
        p_device_id: deviceId,
        p_limit: 1,
      });
      const list = (data ?? []).map((row: { answer_text: string }) => row.answer_text);
      if (list.length === 0) {
        onEmpty?.();
        onNext();
        return;
      }
      setLetter(list[0]);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={13} size="sm" />
      </div>
      <p
        className="font-title text-title mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        1년을 먼저 견딘 선배가 이런 말을 남겼어요.
      </p>
      <div className="mt-3 font-body text-body text-[var(--text-body-color)] sm:mt-4">
        {letter === null ? (
          <p className="font-body text-hint text-center text-[var(--text-gray)]">불러오는 중...</p>
        ) : (
          <p className="text-center" style={{ lineHeight: "var(--leading-body)" }}>
            &quot;{letter}&quot;
          </p>
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
