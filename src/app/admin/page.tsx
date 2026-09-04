"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ensureDueCohortLinks, MILESTONE_LABELS } from "@/lib/cohorts";
import { computeBreakdown, computeFlightRiskStats, computeFrictionMapStats, countParticipants, displayName } from "@/lib/stats";
import { FlightRiskBar } from "./FlightRiskBar";
import { FrictionMapBars } from "./FrictionMapBars";
import { LeoCharacter, SoftCard, SoftInput } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/departments";
import type { Cohort, EmergencyAlert, Milestone, ResponseRecord } from "@/types/db";

// 필터 칩 버튼 — 대시보드 전체가 재사용하는 작은 pill 토글. 선택되면 포인트 컬러+눌린 느낌.
function FilterChip({
  active,
  onClick,
  children,
  tone = "pink",
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "pink" | "sky" | "purple";
  className?: string;
}) {
  const activeBg =
    tone === "sky"
      ? "linear-gradient(155deg, #38bdf8 0%, #0ea5e9 100%)"
      : tone === "purple"
        ? "linear-gradient(155deg, #c084fc 0%, #a855f7 100%)"
        : "linear-gradient(155deg, var(--pink-strong) 0%, var(--pink) 100%)";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 sm:text-sm ${className}`}
      style={
        active
          ? { background: activeBg, boxShadow: "var(--shadow-inset)", color: "#fff" }
          : {
              background: "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-2) 100%)",
              boxShadow: "var(--shadow-sm)",
              color: "var(--text-body-color)",
            }
      }
    >
      {children}
    </button>
  );
}

// 위급 알림에서 펼쳐보는 답안지 — 그 사람이 이 대화(같은 기수)에서 남긴 답변을 시간순으로 나열한다.
function AlertAnswerSheet({ items }: { items: ResponseRecord[] }) {
  if (items.length === 0) {
    return <p className="mt-2 text-xs text-slate-400">이 대화에 남긴 답변이 아직 없어요.</p>;
  }
  return (
    <ul className="mt-2 flex flex-col gap-1.5 border-t border-slate-200 pt-2">
      {items.map((r) => (
        <li key={r.id} className="text-xs">
          <span className="font-medium text-slate-500">{STEP_LABELS[r.step]}</span>
          <span className="text-slate-700"> — {r.answerText ?? "(내용 없음)"}</span>
        </li>
      ))}
    </ul>
  );
}

const MILESTONES: Milestone[] = ["3m", "6m", "9m", "stay_point"];

const STEP_LABELS: Record<ResponseRecord["step"], string> = {
  flight_risk: "사직 고민",
  friction_map: "가장 힘든 점",
  stay_menu: "Stay Menu",
  stay_point: "Stay Point",
  stay_point_needs: "필요한 것",
  recheck: "재확인 체크인",
};

// 행정간호사용 통계 대시보드. 로그인 직후 처음 보게 되는 화면이다.
// (DESIGN.md "대시보드 홈"·"통계 대시보드", PLAN.md 14·15·16번 작업)
// - 지금 발송해야 할 기수 배너 (여기서 시점 계산을 한 번 더 확인한다 — PRD.md: "로그인할 때마다 확인")
// - 확인하지 않은 위급 신호 알림 (앱 내 알림, 16번) + 확인된 알림 지난 기록
// - 전체 응답 통계 (14번)
// 개선 조치 기록·선배 한마디 큐레이션은 결과가 아니라 행정간호사가 직접 노출을 고르는
// 콘텐츠라서 이 화면이 아니라 /admin/publish에서 관리한다.

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [cohortsById, setCohortsById] = useState<Map<string, Cohort>>(new Map());
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [milestoneFilter, setMilestoneFilter] = useState<Milestone | "all">("all");
  const [cohortFilter, setCohortFilter] = useState<string | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string | "all">("all");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  // 기수·병동 목록이 길어지면 칩이 한없이 늘어서 보기 불편해서, 평소엔 지금 고른 값만
  // 보여주는 버튼으로 접어두고 누르면 그때만 목록이 아래로 펼쳐지게 한다.
  const [cohortMenuOpen, setCohortMenuOpen] = useState(false);
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);

  async function loadAll() {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    // 시점이 된 기수가 있으면 링크를 만들어둔다. 실패해도 나머지 대시보드는 계속 보여준다.
    await ensureDueCohortLinks();

    const [cohortsRes, responsesRes, alertsRes] = await Promise.all([
      supabase.from("cohorts").select("id, cohort_month, milestone, link_token, status, created_at"),
      supabase
        .from("responses")
        .select(
          "id, cohort_id, device_id, step, answer_text, advice_text, disclosure_level, disclosed_name, disclosed_department, is_exposed, created_at",
        ),
      supabase
        .from("emergency_alerts")
        .select("id, response_id, cohort_id, device_id, consented, disclosed_name, reasoning, acknowledged, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (cohortsRes.error || responsesRes.error || alertsRes.error) {
      setError("데이터를 불러오지 못했어요.");
      setLoading(false);
      return;
    }

    const cohortMap = new Map<string, Cohort>();
    for (const row of cohortsRes.data ?? []) {
      cohortMap.set(row.id, {
        id: row.id,
        cohortMonth: row.cohort_month,
        milestone: row.milestone,
        linkToken: row.link_token,
        status: row.status === "sent" ? "sent" : "pending",
        createdAt: row.created_at,
      });
    }
    setCohortsById(cohortMap);
    setPendingCount(Array.from(cohortMap.values()).filter((c) => c.status === "pending").length);

    setResponses(
      (responsesRes.data ?? []).map((row) => ({
        id: row.id,
        cohortId: row.cohort_id,
        deviceId: row.device_id,
        step: row.step,
        answerText: row.answer_text,
        adviceText: row.advice_text,
        disclosureLevel: row.disclosure_level,
        disclosedName: row.disclosed_name,
        disclosedDepartment: row.disclosed_department,
        isExposed: row.is_exposed,
        createdAt: row.created_at,
      })),
    );

    setAlerts(
      (alertsRes.data ?? []).map((row) => ({
        id: row.id,
        responseId: row.response_id,
        cohortId: row.cohort_id,
        deviceId: row.device_id,
        consented: row.consented,
        disclosedName: row.disclosed_name,
        reasoning: row.reasoning,
        acknowledged: row.acknowledged,
        createdAt: row.created_at,
      })),
    );

    setLoading(false);
  }

  useEffect(() => {
    // 최초 진입 시 전체 데이터를 불러온다. loadAll 내부에서 비동기로 setState하므로 안전하다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  async function acknowledgeAlert(id: string) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("emergency_alerts")
      .update({ acknowledged: true })
      .eq("id", id);
    if (updateError) {
      setError("확인 처리에 실패했어요.");
      return;
    }
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  // 개월차(milestone)·입사 기수(cohort)·부서 필터에 맞는 응답만 걸러서 통계에 반영한다.
  // 부서 필터는 부서까지 공개한 응답에만 적용할 수 있다 — 완전 익명 응답은 애초에 부서
  // 정보가 없으므로(PRD 익명 원칙), 특정 부서를 고르면 그 부서를 공개한 응답만 남는다.
  const filteredResponses = responses.filter((r) => {
    const cohort = cohortsById.get(r.cohortId);
    if (!cohort) return false;
    if (milestoneFilter !== "all" && cohort.milestone !== milestoneFilter) return false;
    if (cohortFilter !== "all" && r.cohortId !== cohortFilter) return false;
    if (departmentFilter !== "all" && r.disclosedDepartment !== departmentFilter) return false;
    return true;
  });
  const cohortList = Array.from(cohortsById.values()).sort(
    (a, b) => b.cohortMonth.localeCompare(a.cohortMonth) || a.milestone.localeCompare(b.milestone),
  );

  function selectMilestone(m: Milestone | "all") {
    setMilestoneFilter(m);
    setCohortFilter("all");
  }

  function selectCohort(cohort: Cohort) {
    setCohortFilter(cohort.id);
    setMilestoneFilter(cohort.milestone);
  }

  const flightRisk = computeFlightRiskStats(filteredResponses);
  const frictionMap = computeFrictionMapStats(filteredResponses);
  // Flight Risk·마찰 지도의 퍼센트를 클릭했을 때 "어느 부서·어느 입사월에서 나온
  // 응답인지" 펼쳐 보여주기 위한 세부 집계. 입사월은 응답이 속한 기수의 cohortMonth로 구한다.
  const hireMonthOf = (cohortId: string) => cohortsById.get(cohortId)?.cohortMonth.slice(0, 7);
  const flightRiskAnswers = filteredResponses.filter((r) => r.step === "flight_risk");
  const flightRiskBreakdown = {
    yes: computeBreakdown(
      flightRiskAnswers.filter((r) => r.answerText === "예"),
      hireMonthOf,
    ),
    no: computeBreakdown(
      flightRiskAnswers.filter((r) => r.answerText === "아니오"),
      hireMonthOf,
    ),
  };
  const frictionMapAnswers = filteredResponses.filter((r) => r.step === "friction_map" && r.answerText);
  const frictionMapWithBreakdown = frictionMap.map((item) => ({
    ...item,
    breakdown: computeBreakdown(
      frictionMapAnswers.filter((r) => r.answerText!.split(" — ")[0] === item.choice),
      hireMonthOf,
    ),
  }));
  const participants = countParticipants(filteredResponses);
  const stayPointCount = filteredResponses.filter((r) => r.step === "stay_point").length;
  const unacknowledged = alerts.filter((a) => !a.acknowledged);
  const acknowledged = alerts.filter((a) => a.acknowledged);
  // 위급 알림 자체는 이름만 들고 있어서(EmergencyConsentStep은 이름만 받음), 병동까지
  // 표시하려면 그 답변이 저장된 responses 행(disclosed_department)을 같이 찾아봐야 한다.
  const responsesById = new Map(responses.map((r) => [r.id, r]));
  function alertLabel(a: EmergencyAlert): string {
    if (!a.consented || !a.disclosedName) return "익명";
    const department = a.responseId ? responsesById.get(a.responseId)?.disclosedDepartment : undefined;
    return department ? `${a.disclosedName} (${department})` : a.disclosedName;
  }

  // 알림을 남긴 사람(같은 기기+같은 기수)이 이 대화에서 남긴 답변 전부 — 시간순.
  function responsesForAlert(a: EmergencyAlert): ResponseRecord[] {
    return responses
      .filter((r) => r.cohortId === a.cohortId && r.deviceId === a.deviceId)
      .sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  }

  function toggleAlertExpanded(id: string) {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 지금 필터에 걸린 응답·통계를 엑셀 파일로 내려받는다. 기한을 지정하면 그 기간 응답만 담는다.
  function downloadExcel() {
    const rangeFiltered = filteredResponses.filter((r) => {
      const day = r.createdAt.slice(0, 10);
      if (exportStart && day < exportStart) return false;
      if (exportEnd && day > exportEnd) return false;
      return true;
    });

    // 한 사람(같은 기기+같은 기수)이 남긴 답변들을 한 행에 옆으로 펼쳐서 담는다 — 행정간호사가
    // 직접 지정한 열 구성(입사일/개월/ID/flight risk/stay menu/stay point/등록일).
    // flight risk·stay menu는 1년(Stay Point) 시점 트랙에서는 애초에 묻지 않는 질문이라
    // (page.tsx의 milestone === "stay_point" 분기 참고) 그 행은 두 칸 다 비어 있는 게 정상이다.
    const DISCLOSURE_RANK: Record<ResponseRecord["disclosureLevel"], number> = {
      anonymous: 0,
      department: 1,
      name: 2,
    };
    const groupsByPerson = new Map<string, ResponseRecord[]>();
    for (const r of rangeFiltered) {
      const key = `${r.cohortId}::${r.deviceId}`;
      const list = groupsByPerson.get(key) ?? [];
      list.push(r);
      groupsByPerson.set(key, list);
    }
    function cellFor(list: ResponseRecord[], step: ResponseRecord["step"]) {
      const found = list.find((r) => r.step === step);
      return found ? `${found.answerText ?? ""}${found.isExposed ? "" : " (비노출)"}` : "";
    }
    const responseRows = Array.from(groupsByPerson.values()).map((list) => {
      const first = list[0];
      const cohort = cohortsById.get(first.cohortId);
      const isStayPoint = cohort?.milestone === "stay_point";
      // ID는 이 사람이 살면서 가장 많이 공개한 수준(예: 한 번이라도 이름까지 공개했다면
      // 그 응답)을 기준으로 표시한다 — 공개는 익명→공개 방향으로만 전환되기 때문에
      // 보통 최근 응답과 같지만, 혹시 몰라 랭크로 직접 고른다.
      const mostDisclosed = list.reduce((best, r) =>
        DISCLOSURE_RANK[r.disclosureLevel] > DISCLOSURE_RANK[best.disclosureLevel] ? r : best,
      );
      return {
        입사일: cohort ? cohort.cohortMonth.slice(0, 7) : "",
        개월: cohort ? (isStayPoint ? "1년" : MILESTONE_LABELS[cohort.milestone]) : "",
        ID: displayName(mostDisclosed),
        "flight risk": cellFor(list, "flight_risk"),
        "stay menu": cellFor(list, "stay_menu"),
        "stay point": cellFor(list, "stay_point"),
        등록일: first.createdAt.slice(0, 10),
      };
    });

    const rangeFlightRisk = computeFlightRiskStats(rangeFiltered);
    const rangeFrictionMap = computeFrictionMapStats(rangeFiltered);
    const flightRiskRows = [
      { 항목: '사직 고민 "예"', 인원: rangeFlightRisk.yes },
      { 항목: '사직 고민 "아니오"', 인원: rangeFlightRisk.no },
    ];
    const frictionMapRows = rangeFrictionMap.map((f) => ({ 항목: f.choice, 인원: f.count }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(responseRows), "응답목록");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flightRiskRows), "Flight Risk");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(frictionMapRows), "마찰 지도");
    const rangeLabel = exportStart || exportEnd ? `_${exportStart || "처음"}~${exportEnd || "지금"}` : "";
    XLSX.writeFile(wb, `대시보드${rangeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:max-w-4xl sm:p-8 sm:gap-10 md:max-w-5xl lg:max-w-6xl">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LeoCharacter n={5} size="xs" float={false} />
            <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">대시보드</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              기한{" "}
              <SoftInput
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="!w-auto !rounded-full !px-3 !py-1.5 !text-xs"
              />
            </label>
            <span className="text-xs text-slate-400">~</span>
            <SoftInput
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="!w-auto !rounded-full !px-3 !py-1.5 !text-xs"
            />
            <FilterChip active={false} onClick={downloadExcel} tone="sky">
              엑셀 다운로드
            </FilterChip>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {pendingCount > 0 ? (
          <Link href="/admin/cohorts">
            <SoftCard level={2} className="mt-2 !px-4 !py-3 text-sm text-pink-800">
              지금 발송해야 할 기수가 {pendingCount}개 있어요. 기수·발송 관리에서 링크를 복사해 보내주세요 →
            </SoftCard>
          </Link>
        ) : (
          <p className="mt-2 text-sm text-slate-500">지금 발송 대기 중인 기수는 없어요.</p>
        )}
      </div>

      <section>
        <h2 className="text-sm font-medium text-sky-700">위급 신호 알림</h2>
        <p className="mt-1 text-xs text-slate-400">
          완전 익명으로 시작했거나 신원 공개에 동의하지 않아도 신호는 그대로 와요 — 신원 없이
          &quot;익명&quot;으로만 표시될 뿐이에요.
        </p>
        {unacknowledged.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">확인하지 않은 위급 신호가 없어요.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {unacknowledged.map((a) => {
              const cohort = cohortsById.get(a.cohortId);
              return (
                <SoftCard key={a.id} as="li" level={2} className="!px-4 !py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-red-600">
                      {alertLabel(a)}
                      {cohort
                        ? ` · ${cohort.cohortMonth.slice(0, 7)} 기수 · ${MILESTONE_LABELS[cohort.milestone]}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => acknowledgeAlert(a.id)}
                      className="shrink-0 rounded-full px-3 py-1 text-xs text-red-600"
                      style={{ background: "linear-gradient(150deg, #fff 0%, #fee2e2 100%)", boxShadow: "var(--shadow-sm)" }}
                    >
                      확인함
                    </button>
                  </div>
                  {a.reasoning && <p className="mt-1 text-red-600">{a.reasoning}</p>}
                  <button
                    type="button"
                    onClick={() => toggleAlertExpanded(a.id)}
                    className="mt-1 text-xs text-slate-500 underline"
                  >
                    {expandedAlerts.has(a.id) ? "답안지 접기" : "답안지 보기"}
                  </button>
                  {expandedAlerts.has(a.id) && <AlertAnswerSheet items={responsesForAlert(a)} />}
                </SoftCard>
              );
            })}
          </ul>
        )}

        {acknowledged.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAcknowledged((prev) => !prev)}
              className="text-xs text-slate-500 underline"
            >
              {showAcknowledged ? "확인된 알림 숨기기" : `확인된 알림 ${acknowledged.length}건 보기`}
            </button>
            {showAcknowledged && (
              <ul className="mt-2 flex flex-col gap-2">
                {acknowledged.map((a) => {
                  const cohort = cohortsById.get(a.cohortId);
                  return (
                    <li
                      key={a.id}
                      className="rounded-[var(--radius-md)] p-3 text-sm text-slate-500"
                      style={{ background: "var(--surface-bg-2)", boxShadow: "var(--shadow-inset-sm)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {alertLabel(a)}
                          {cohort
                            ? ` · ${cohort.cohortMonth.slice(0, 7)} 기수 · ${MILESTONE_LABELS[cohort.milestone]}`
                            : ""}
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-600">확인됨</span>
                      </div>
                      {a.reasoning && <p className="mt-1">{a.reasoning}</p>}
                      <button
                        type="button"
                        onClick={() => toggleAlertExpanded(a.id)}
                        className="mt-1 text-xs text-slate-500 underline"
                      >
                        {expandedAlerts.has(a.id) ? "답안지 접기" : "답안지 보기"}
                      </button>
                      {expandedAlerts.has(a.id) && <AlertAnswerSheet items={responsesForAlert(a)} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-sky-700">전체 통계 (참여 {participants}명)</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip active={milestoneFilter === "all" && cohortFilter === "all"} onClick={() => selectMilestone("all")}>
            전체
          </FilterChip>
          {MILESTONES.map((m) => (
            <FilterChip key={m} active={milestoneFilter === m && cohortFilter === "all"} onClick={() => selectMilestone(m)}>
              {MILESTONE_LABELS[m]}
            </FilterChip>
          ))}
        </div>

        {cohortList.length > 0 && (
          <div className="mt-2">
            <FilterChip active={cohortMenuOpen} onClick={() => setCohortMenuOpen((v) => !v)} tone="sky">
              {cohortFilter === "all"
                ? "기수 선택"
                : (() => {
                    const c = cohortsById.get(cohortFilter);
                    return c ? `${c.cohortMonth.slice(0, 7)} 입사 · ${MILESTONE_LABELS[c.milestone]}` : "기수 선택";
                  })()}{" "}
              {cohortMenuOpen ? "▲" : "▼"}
            </FilterChip>
            {cohortMenuOpen && (
              <div
                className="mt-2 flex flex-wrap gap-2 rounded-[var(--radius-md)] p-3"
                style={{ background: "var(--surface-bg-2)", boxShadow: "var(--shadow-inset-sm)" }}
              >
                <FilterChip
                  active={cohortFilter === "all"}
                  onClick={() => {
                    setCohortFilter("all");
                    setCohortMenuOpen(false);
                  }}
                  tone="sky"
                >
                  전체
                </FilterChip>
                {cohortList.map((c) => (
                  <FilterChip
                    key={c.id}
                    active={cohortFilter === c.id}
                    onClick={() => {
                      selectCohort(c);
                      setCohortMenuOpen(false);
                    }}
                    tone="sky"
                  >
                    {c.cohortMonth.slice(0, 7)} 입사 · {MILESTONE_LABELS[c.milestone]}
                  </FilterChip>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2">
          <p className="text-xs text-slate-400">부서 (부서까지 공개한 응답만 필터링돼요)</p>
          <FilterChip active={departmentMenuOpen} onClick={() => setDepartmentMenuOpen((v) => !v)} tone="purple" className="mt-1">
            {departmentFilter === "all" ? "병동 선택" : departmentFilter} {departmentMenuOpen ? "▲" : "▼"}
          </FilterChip>
          {departmentMenuOpen && (
            <div
              className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-[var(--radius-md)] p-3"
              style={{ background: "var(--surface-bg-2)", boxShadow: "var(--shadow-inset-sm)" }}
            >
              <FilterChip
                active={departmentFilter === "all"}
                onClick={() => {
                  setDepartmentFilter("all");
                  setDepartmentMenuOpen(false);
                }}
                tone="purple"
              >
                전체
              </FilterChip>
              {DEPARTMENTS.map((d) => (
                <FilterChip
                  key={d}
                  active={departmentFilter === d}
                  onClick={() => {
                    setDepartmentFilter(d);
                    setDepartmentMenuOpen(false);
                  }}
                  tone="purple"
                >
                  {d}
                </FilterChip>
              ))}
            </div>
          )}
        </div>

        {milestoneFilter === "stay_point" ? (
          <SoftCard level={2} className="mt-3 text-sm">
            <p className="text-slate-600">
              Stay Point는 자유 서술형 답변이라 그래프로 보여주기 어려워요. 지금까지{" "}
              <span className="font-semibold text-pink-600">{stayPointCount}건</span>이 모였어요.
            </p>
            <Link href="/admin/publish" className="mt-2 inline-block text-sky-600 underline">
              공개 콘텐츠 관리에서 답변 내용 보기 →
            </Link>
          </SoftCard>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <SoftCard level={2}>
              <p className="text-slate-500">Flight Risk</p>
              <FlightRiskBar
                yes={flightRisk.yes}
                no={flightRisk.no}
                total={flightRisk.total}
                yesBreakdown={flightRiskBreakdown.yes}
                noBreakdown={flightRiskBreakdown.no}
              />
            </SoftCard>
            <SoftCard level={2}>
              <p className="text-slate-500">마찰 지도</p>
              <FrictionMapBars items={frictionMapWithBreakdown} />
            </SoftCard>
          </div>
        )}
      </section>
    </main>
  );
}
