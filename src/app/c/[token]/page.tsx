"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getDeviceId, hasDeviceId } from "@/lib/deviceId";
import { MILESTONE_LABELS } from "@/lib/cohorts";
import type { BaseDisclosure, Cohort } from "@/types/db";
import IntroStep from "./IntroStep";
import RecheckStep from "./RecheckStep";
import DisclosureStep from "./DisclosureStep";
import FlightRiskStep from "./FlightRiskStep";
import FrictionMapStep from "./FrictionMapStep";
import FrictionMapStatsCard from "./FrictionMapStatsCard";
import StayMenuStep from "./StayMenuStep";
import StayMenuStatsCard from "./StayMenuStatsCard";
import FinalDisclosureStep from "./FinalDisclosureStep";
import StayPointStep from "./StayPointStep";
import StayPointNeedsStep from "./StayPointNeedsStep";
import StayPointShareCard from "./StayPointShareCard";
import StayPointLetterCard from "./StayPointLetterCard";
import StayPointRecallCard from "./StayPointRecallCard";
import GiftBoxCard from "./GiftBoxCard";
import ClosingCard from "./ClosingCard";
import DoodleBackground from "./DoodleBackground";
import { LeoCharacter, SoftCard } from "@/components/ui";

// 신규간호사가 문자 속 링크를 눌러 들어오는 화면.
// 링크(기수) 유효성을 확인하고, 브라우저 기기 식별자를 만든 뒤 대화를 시작한다.
// milestone이 stay_point인 기수는 Stay Point 질문 하나만 물어보는 별도 트랙으로 분기하고,
// 그 외(3/6/9개월)는 Flight Risk → 마찰 지도 → Stay Menu 순서를 그대로 따른다.
// 대화 시작 전에 공개 수준(완전 익명/부서만 공개/이름까지 공개)을 한 번 고르고, 이미 이름까지
// 공개를 골랐다면 다시 묻지 않는다. 완전 익명·부서만 공개를 골랐다면, 예전엔 사직의사·마찰
// 지도·Stay Menu 답변마다 매번 공개 의향을 물었지만, 번거롭다는 피드백에 따라 3/6/9개월
// 트랙(FULL_TRACK)의 맨 끝에서 딱 한 번만 확인하는 방식으로 바꿨다(FinalDisclosureStep 참고,
// 사용자 요청). Stay Point 트랙은 원래부터 공개 의향을 다시 묻지 않는다.
// 각 답변 직후에는 그때 관련된 통계 공유 카드만 보여주고, 마지막에 개선 조치·선배 한마디·
// 참여 인정 메시지를 담은 종료 카드로 마무리한다. Stay Point 트랙은 통계 카드 다음에 1년
// 근속 축하 선물상자(GiftBoxCard)를 한 번 더 보여준 뒤 종료 카드로 넘어간다(사용자 요청).
// (DESIGN.md "대화 화면"·"공유 통계 카드", PLAN.md 7~19번 작업)

type Phase =
  | "intro"
  | "recheck"
  | "base_disclosure"
  | "flight_risk"
  | "friction_map"
  | "friction_stats"
  | "stay_menu"
  | "stay_menu_stats"
  | "final_disclosure"
  | "stay_point"
  | "stay_point_needs"
  | "stay_point_stats"
  | "stay_point_letter"
  | "stay_point_recall"
  | "gift_box"
  | "closing";

type LoadState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "already_done" }
  | {
      status: "ready";
      cohort: Cohort;
      deviceId: string;
      phase: Phase;
      previousChoices: string[];
      baseDisclosure: BaseDisclosure | null;
      // stay_point_letter(선배가 남긴 말 카드)가 보여줄 글이 없어서 자동으로 건너뛴 적이
      // 있으면 true — 뒤로가기가 그 단계로 되돌아갔다가 곧바로 다시 앞으로 튕겨 나가
      // "뒤로가기가 안 먹힌다"는 버그(사용자 리포트)를 막기 위해, 되돌아갈 때도 이 단계를
      // 건너뛰어야 한다는 걸 기억해둔다.
      skipStayPointLetter: boolean;
      // stay_point_stats("1년을 견뎌냈던 이유" 인용문 카드)가 보여줄 문구가 없어서 건너뛴
      // 적이 있으면 true — 위와 같은 이유.
      skipStayPointStats: boolean;
      // stay_point_recall("선생님은 예전에...") 카드가 보여줄 과거 마찰 지도 답변이 없어서
      // 건너뛴 적이 있으면 true — 위와 같은 이유.
      skipStayPointRecall: boolean;
    };

// 뒤로가기 버튼을 눌렀을 때 각 트랙에서 어느 단계로 돌아갈지 정한 순서.
const FULL_TRACK_ORDER: Phase[] = [
  "intro",
  "recheck",
  "base_disclosure",
  "flight_risk",
  "friction_map",
  "friction_stats",
  "stay_menu",
  "stay_menu_stats",
  "stay_point_stats",
  "stay_point_letter",
  "final_disclosure",
  "closing",
];
const STAY_POINT_TRACK_ORDER: Phase[] = [
  "intro",
  "base_disclosure",
  "stay_point",
  "stay_point_needs",
  "stay_point_stats",
  "stay_point_recall",
  "gift_box",
  "closing",
];

export default function CohortLinkPage() {
  const params = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    async function run() {
      if (!supabase) return;

      // getDeviceId()가 새로 만들기 전에 먼저 확인해서, 이번이 처음 방문인지 알아낸다 —
      // 재확인 체크인에서 이 신호로 "저번에 말씀하신 거" 질문을 넣을지 정한다.
      const isReturning = hasDeviceId();
      const deviceId = getDeviceId();

      // cohorts 테이블은 행정간호사(로그인 사용자)만 직접 조회할 수 있도록 막아뒀다 —
      // anon에게 테이블 전체 SELECT를 열어주면 다른 기수의 링크까지 한꺼번에 드러나기 때문이다.
      // 그래서 이 링크 토큰 하나만 확인해주는 get_cohort_by_token() 함수를 대신 호출한다.
      const { data: rows, error } = await supabase.rpc("get_cohort_by_token", { token: params.token });
      const data = rows?.[0];

      if (error || !data) {
        setState({ status: "invalid" });
        return;
      }

      const cohort: Cohort = {
        id: data.id,
        cohortMonth: data.cohort_month,
        milestone: data.milestone,
        linkToken: data.link_token,
        status: data.status === "sent" ? "sent" : "pending",
        createdAt: data.created_at,
      };

      // 같은 기기가 같은 기수 링크로 다시 들어온 경우, 이미 답변을 마쳤다면 처음부터 다시
      // 진행하지 못하게 막는다 — 응답이 중복으로 쌓이는 것을 막기 위함이다.
      const { data: alreadyDone } = await supabase.rpc("has_completed_cohort", {
        p_device_id: deviceId,
        p_cohort_id: cohort.id,
      });
      if (alreadyDone) {
        setState({ status: "already_done" });
        return;
      }

      if (cohort.milestone === "stay_point") {
        setState({
          status: "ready",
          cohort,
          deviceId,
          phase: "intro",
          previousChoices: [],
          baseDisclosure: null,
          skipStayPointLetter: false,
          skipStayPointStats: false,
          skipStayPointRecall: false,
        });
        return;
      }

      // 재방문한 기기라면, 지난번에 답했던 마찰 항목이 있는지 확인해 먼저 물어본다 — 단,
      // 같은 기수(같은 입사월 그룹, cohort_month)의 이전 시점 답변만 인정한다. 다른 기수에서
      // 우연히 같은 기기로 답한 적이 있다고 해서 그걸 "저번에 그거"로 묻는 건 어색하다.
      let previousChoices: string[] = [];
      if (isReturning) {
        const { data: history } = await supabase.rpc("get_friction_map_history", {
          p_device_id: deviceId,
          p_cohort_id: cohort.id,
        });
        previousChoices = ((history ?? []) as { choice: string }[]).map((row) => row.choice);
      }

      setState({
        status: "ready",
        cohort,
        deviceId,
        phase: "intro",
        previousChoices,
        baseDisclosure: null,
        skipStayPointLetter: false,
        skipStayPointStats: false,
        skipStayPointRecall: false,
      });
    }

    // 접속하자마자 링크 유효성 확인 + 기기 식별을 한 번에 처리한다.
    run();
  }, [params.token]);

  function goTo(phase: Phase) {
    setState((prev) => (prev.status === "ready" ? { ...prev, phase } : prev));
  }

  // 메인 화면("한달만")에서 시작하기를 누르면, 재확인 체크인이 필요한 사람만 먼저 그걸 보고
  // 그 외에는 바로 공개 수준 선택으로 넘어간다.
  function handleStart() {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const next: Phase = prev.previousChoices.length > 0 ? "recheck" : "base_disclosure";
      return { ...prev, phase: next };
    });
  }

  function setBaseDisclosureAndGoNext(baseDisclosure: BaseDisclosure) {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const next: Phase = prev.cohort.milestone === "stay_point" ? "stay_point" : "flight_risk";
      return { ...prev, baseDisclosure, phase: next };
    });
  }

  // 현재 단계 바로 이전 단계로 돌아간다. recheck 질문이 없었던 사람에게는 그 단계를 건너뛴다.
  // 이미 이름까지 공개를 골랐어도 final_disclosure는 건너뛰지 않는다 — "도움을 받고
  // 싶은지"는 신원 공개 여부와 상관없이 똑같이 물어봐야 하고(사용자 요청), 신원을 이미
  // 알고 있는 사람은 그 단계 안에서(FinalDisclosureStep) 이름 입력 절차만 건너뛴다.
  // 여러 "보여줄 데이터가 없어서 건너뛴" 단계가 나란히 붙어 있을 수 있어서(예: 3/6/9개월
  // 트랙의 stay_point_letter 바로 앞이 stay_point_stats), 하나씩 체크할 때마다 idx가 갱신된
  // 위치를 다시 확인하도록 순서대로(현재 단계에서 가까운 것부터) 체크한다.
  function skipBackwardOverEmptySteps(
    order: Phase[],
    startIdx: number,
    ctx: {
      previousChoices: string[];
      skipStayPointLetter: boolean;
      skipStayPointStats: boolean;
      skipStayPointRecall: boolean;
    },
  ) {
    let idx = startIdx;
    if (order[idx] === "stay_point_letter" && ctx.skipStayPointLetter) idx -= 1;
    if (order[idx] === "stay_point_recall" && ctx.skipStayPointRecall) idx -= 1;
    if (order[idx] === "stay_point_stats" && ctx.skipStayPointStats) idx -= 1;
    if (order[idx] === "recheck" && ctx.previousChoices.length === 0) idx -= 1;
    return idx;
  }

  function goBack() {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const order = prev.cohort.milestone === "stay_point" ? STAY_POINT_TRACK_ORDER : FULL_TRACK_ORDER;
      const idx = skipBackwardOverEmptySteps(order, order.indexOf(prev.phase) - 1, {
        previousChoices: prev.previousChoices,
        skipStayPointLetter: prev.skipStayPointLetter,
        skipStayPointStats: prev.skipStayPointStats,
        skipStayPointRecall: prev.skipStayPointRecall,
      });
      if (idx < 0) return prev;
      return { ...prev, phase: order[idx] };
    });
  }

  // 이 단계에서 뒤로 갈 곳이 실제로 있는지 확인해, 없으면 뒤로가기 버튼 자체를 숨긴다.
  function canGoBack(
    currentPhase: Phase,
    milestone: Cohort["milestone"],
    previousChoices: string[],
    skipStayPointLetter: boolean,
    skipStayPointStats: boolean,
    skipStayPointRecall: boolean,
  ) {
    const order = milestone === "stay_point" ? STAY_POINT_TRACK_ORDER : FULL_TRACK_ORDER;
    const idx = skipBackwardOverEmptySteps(order, order.indexOf(currentPhase) - 1, {
      previousChoices,
      skipStayPointLetter,
      skipStayPointStats,
      skipStayPointRecall,
    });
    return idx >= 0;
  }

  // stay_point_letter 카드가 보여줄 글이 하나도 없어서 자동으로 건너뛸 때 호출된다 — 위와 같은 이유.
  function markStayPointLetterEmpty() {
    setState((prev) => (prev.status === "ready" ? { ...prev, skipStayPointLetter: true } : prev));
  }

  // stay_point_stats("1년을 견뎌냈던 이유") 카드가 보여줄 문구가 하나도 없어서 자동으로
  // 건너뛸 때 호출된다 — 위와 같은 이유.
  function markStayPointStatsEmpty() {
    setState((prev) => (prev.status === "ready" ? { ...prev, skipStayPointStats: true } : prev));
  }

  // stay_point_recall("선생님은 예전에...") 카드가 보여줄 과거 답변이 없어서 자동으로
  // 건너뛸 때 호출된다 — 위와 같은 이유.
  function markStayPointRecallEmpty() {
    setState((prev) => (prev.status === "ready" ? { ...prev, skipStayPointRecall: true } : prev));
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요.
        </p>
      </main>
    );
  }

  if (state.status === "loading") {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <p className="text-sm text-slate-500">확인 중...</p>
      </main>
    );
  }

  if (state.status === "invalid") {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <SoftCard level={2}>
          <p className="text-sm text-slate-600">유효하지 않거나 만료된 링크예요. 간호국 간호행정에게 다시 문의해주세요.</p>
        </SoftCard>
      </main>
    );
  }

  if (state.status === "already_done") {
    return (
      <main className="relative mx-auto w-full max-w-md overflow-hidden p-6 sm:max-w-lg sm:p-8 md:max-w-[820px] md:p-10">
        <DoodleBackground />
        <div className="relative flex flex-col items-center gap-2 py-16 text-center sm:py-20 md:py-28">
          <LeoCharacter n={9} size="lg" />
          <h1 className="font-hero mt-2 text-4xl font-bold text-pink-500 sm:text-5xl md:text-6xl">고마워요!</h1>
          <p className="text-sm text-slate-400 sm:text-base md:text-lg">이미 이 링크로 답변을 남겨주셨어요.</p>
        </div>
      </main>
    );
  }

  const { cohort, deviceId, phase, baseDisclosure } = state;

  // 메인화면(intro)만 카드형 padding·max-width를 벗어나 화면을 꽉 채우는 Hero로 보여준다.
  // 이후 질문 화면들은 기존 카드 레이아웃(padding·max-width·DoodleBackground)을 그대로 쓴다.
  return (
    <main
      className={
        phase === "intro"
          ? "relative w-full overflow-hidden"
          : "relative mx-auto w-full max-w-md overflow-hidden p-6 sm:max-w-lg sm:p-8 md:max-w-[820px] md:p-10"
      }
    >
      {phase !== "intro" && <DoodleBackground />}

      <div className="relative">
        {phase !== "intro" && (
          <p className="text-center text-xs text-slate-400 sm:text-sm">
            {cohort.cohortMonth.slice(0, 7)} 동기 · {MILESTONE_LABELS[cohort.milestone]}
          </p>
        )}

        <div className={phase === "intro" ? "" : "mt-6"}>
          {phase === "intro" && <IntroStep onStart={handleStart} />}
          {phase === "recheck" && state.previousChoices.length > 0 && (
            <RecheckStep
              cohortId={cohort.id}
              deviceId={deviceId}
              previousChoices={state.previousChoices}
              onComplete={() => goTo("base_disclosure")}
              onBack={
                canGoBack(
                  phase,
                  cohort.milestone,
                  state.previousChoices,
                  state.skipStayPointLetter,
                  state.skipStayPointStats,
                  state.skipStayPointRecall,
                )
                  ? goBack
                  : undefined
              }
            />
          )}
          {phase === "base_disclosure" && (
            <DisclosureStep
              submitting={false}
              title="답변을 어떻게 전달할까요? 여기서 고른 대로 저장하고, 이름까지 공개를 고르지 않으면 대화 끝에서 한 번 더 물어볼게요."
              onConfirm={(level, extra) => setBaseDisclosureAndGoNext({ level, ...extra })}
              onBack={
                canGoBack(
                  phase,
                  cohort.milestone,
                  state.previousChoices,
                  state.skipStayPointLetter,
                  state.skipStayPointStats,
                  state.skipStayPointRecall,
                )
                  ? goBack
                  : undefined
              }
            />
          )}
          {phase === "flight_risk" && baseDisclosure && (
            <FlightRiskStep
              cohortId={cohort.id}
              deviceId={deviceId}
              baseDisclosure={baseDisclosure}
              onComplete={() => goTo("friction_map")}
              onBack={
                canGoBack(
                  phase,
                  cohort.milestone,
                  state.previousChoices,
                  state.skipStayPointLetter,
                  state.skipStayPointStats,
                  state.skipStayPointRecall,
                )
                  ? goBack
                  : undefined
              }
            />
          )}
          {phase === "friction_map" && baseDisclosure && (
            <FrictionMapStep
              cohortId={cohort.id}
              deviceId={deviceId}
              baseDisclosure={baseDisclosure}
              onComplete={() => goTo("friction_stats")}
              onBack={
                canGoBack(
                  phase,
                  cohort.milestone,
                  state.previousChoices,
                  state.skipStayPointLetter,
                  state.skipStayPointStats,
                  state.skipStayPointRecall,
                )
                  ? goBack
                  : undefined
              }
            />
          )}
          {phase === "friction_stats" && (
            <FrictionMapStatsCard cohortId={cohort.id} onNext={() => goTo("stay_menu")} onBack={goBack} />
          )}
          {phase === "stay_menu" && baseDisclosure && (
            <StayMenuStep
              cohortId={cohort.id}
              deviceId={deviceId}
              baseDisclosure={baseDisclosure}
              onComplete={() => goTo("stay_menu_stats")}
              onBack={goBack}
            />
          )}
          {phase === "stay_menu_stats" && (
            <StayMenuStatsCard cohortId={cohort.id} onNext={() => goTo("stay_point_stats")} onBack={goBack} />
          )}
          {phase === "stay_point" && baseDisclosure && (
            <StayPointStep
              cohortId={cohort.id}
              deviceId={deviceId}
              baseDisclosure={baseDisclosure}
              onComplete={() => goTo("stay_point_needs")}
              onBack={
                canGoBack(
                  phase,
                  cohort.milestone,
                  state.previousChoices,
                  state.skipStayPointLetter,
                  state.skipStayPointStats,
                  state.skipStayPointRecall,
                )
                  ? goBack
                  : undefined
              }
            />
          )}
          {phase === "stay_point_needs" && baseDisclosure && (
            <StayPointNeedsStep
              cohortId={cohort.id}
              deviceId={deviceId}
              baseDisclosure={baseDisclosure}
              onComplete={() => goTo("stay_point_stats")}
              onBack={goBack}
            />
          )}
          {phase === "stay_point_stats" && (
            <StayPointShareCard
              deviceId={deviceId}
              onNext={() => goTo(cohort.milestone === "stay_point" ? "stay_point_recall" : "stay_point_letter")}
              onEmpty={markStayPointStatsEmpty}
              onBack={goBack}
            />
          )}
          {phase === "stay_point_letter" && (
            <StayPointLetterCard
              deviceId={deviceId}
              onNext={() => goTo("final_disclosure")}
              onEmpty={markStayPointLetterEmpty}
              onBack={goBack}
            />
          )}
          {phase === "stay_point_recall" && (
            <StayPointRecallCard
              cohortId={cohort.id}
              deviceId={deviceId}
              onNext={() => goTo("gift_box")}
              onEmpty={markStayPointRecallEmpty}
              onBack={goBack}
            />
          )}
          {phase === "gift_box" && <GiftBoxCard onNext={() => goTo("closing")} onBack={goBack} />}
          {phase === "final_disclosure" && baseDisclosure && (
            <FinalDisclosureStep
              base={baseDisclosure}
              cohortId={cohort.id}
              deviceId={deviceId}
              onNext={() => goTo("closing")}
              onBack={
                canGoBack(
                  phase,
                  cohort.milestone,
                  state.previousChoices,
                  state.skipStayPointLetter,
                  state.skipStayPointStats,
                  state.skipStayPointRecall,
                )
                  ? goBack
                  : undefined
              }
            />
          )}
          {phase === "closing" && (
            <ClosingCard
              isStayPoint={cohort.milestone === "stay_point"}
              onBack={goBack}
              onRestart={() => goTo("intro")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
