"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftButton, SoftIconButton, BackArrowIcon } from "@/components/ui";

// Stay Point(1년 경과)에서는 "1년을 먼저 견딘 선배가 남긴 말"(StayPointLetterCard)을 보여주지
// 않는다 — 지금 이 사람이 바로 그 "선배"가 된 시점이라 어색하다(사용자 요청). 대신 같은
// 기수(cohort_month)의 더 이른 시점(3/6/9개월)에 이 기기가 직접 남겼던 마찰 지도 답변을
// "선생님은 예전에 이거 때문에 힘들어하셨네요"로 돌아본다. 다른 신규간호사에게는 마찰 지도
// 자유 서술(이유)을 절대 보여주지 않지만, 이 카드는 그 답을 직접 썼던 본인(같은 device_id)
// 에게만 보여주는 것이라 이유까지 그대로 노출해도 된다(사용자 확인).
// 답이 여러 번(3/6/9개월 등) 쌓여 있으면 최신 것 하나만 보여주지 않고 전부 누적으로,
// 그때 고른 선택지와 직접 적은 서술을 원문 그대로 함께 보여준다(사용자 요청) —
// get_friction_map_history가 답변마다 {선택지, 서술}로 나눠 오래된 순서대로 돌려준다.
// 그런 과거 답변이 아예 없으면(예: 이 기수에서 처음 답한 경우) 카드째 건너뛴다.
// 레오(입체레오 13번, 두 손으로 볼을 감싼 편안한 포즈) — 지나온 시간을 다정하게 돌아보는 느낌.

type FrictionHistoryEntry = { choice: string; description: string | null };

export default function StayPointRecallCard({
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
  const [history, setHistory] = useState<FrictionHistoryEntry[] | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.rpc("get_friction_map_history", {
        p_device_id: deviceId,
        p_cohort_id: cohortId,
      });
      const list = (data ?? []) as FrictionHistoryEntry[];
      if (list.length === 0) {
        onEmpty?.();
        onNext();
        return;
      }
      setHistory(list);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, deviceId]);

  if (history === null) {
    return (
      <SoftCard level={3} className="page-enter">
        <div className="flex justify-center">
          <LeoCharacter n={13} size="sm" />
        </div>
        <p className="font-body text-hint mt-3 text-center text-[var(--text-gray)]">불러오는 중...</p>
      </SoftCard>
    );
  }

  return (
    <SoftCard level={3} className="page-enter">
      <div className="flex justify-center">
        <LeoCharacter n={13} size="sm" />
      </div>
      <p
        className="font-title text-section mt-3 text-center font-bold text-[var(--text-brown)]"
        style={{ lineHeight: "var(--leading-title)" }}
      >
        선생님은 예전에 이거때매 힘들어 하셨었네요.
        <br />
        뒤도 돌아볼겸, 해결이 되었길 바라면서 과거를 돌아봐요.
      </p>
      <p className="font-body text-hint mt-2 text-center text-[var(--text-gray)]">
        안심하세요! 같은 기기의 이전 답변만 참고했으며, 응답자의 신원을 확인할 수는 없어요.
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {history.map((entry, i) => (
          <li
            key={i}
            className="rounded-[var(--radius-md)] px-5 py-4 text-center"
            style={{
              background: "linear-gradient(150deg, #fffaf0 0%, var(--surface-bg-3) 100%)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          >
            <p className="text-accent font-bold">{entry.choice}</p>
            {entry.description && (
              <p className="font-body text-body mt-1 text-[var(--text-body-color)]">&quot;{entry.description}&quot;</p>
            )}
          </li>
        ))}
      </ul>
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
