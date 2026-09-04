"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { computeDueCohorts, ensureDueCohortLinks, fetchMilestoneCoverage, MILESTONE_LABELS } from "@/lib/cohorts";
import { LeoCharacter, SoftCard } from "@/components/ui";
import type { Cohort, Nurse } from "@/types/db";

// 기수·발송 관리 화면. 입사일 기준으로 시점이 된 기수를 계산하고,
// 아직 링크가 없으면 새로 만들어 저장한 뒤 복사할 수 있게 보여준다.
// 명단 관리에서 직접 선택해 보낸 "수동" 기수도 여기 함께 나온다(is_manual).
// (DESIGN.md "기수·발송 관리" 화면, PLAN.md 4·5·6번 작업)

type CohortCard = {
  cohortMonth: string;
  milestone: Cohort["milestone"];
  nurseCount: number;
  id: string;
  linkToken: string;
  status: "pending" | "sent";
  isManual: boolean;
  members: { id: string; name: string; department: string }[];
  createdAt: string;
};

// 발송 전이 항상 위, 발송됨은 항상 아래(생성 시각과 무관하게). 같은 상태 안에서는 가장
// 최근에 만든 기수가 위로 오도록 생성 시각 내림차순으로 둔다.
function sortCards(cards: CohortCard[]): CohortCard[] {
  return [...cards].sort((a, b) => {
    if (a.status !== b.status) return a.status === "sent" ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function mapCohortRow(row: {
  id: string;
  cohort_month: string;
  milestone: Cohort["milestone"];
  link_token: string;
  status: string;
  is_manual: boolean;
  created_at: string;
}): Cohort & { isManual: boolean } {
  return {
    id: row.id,
    cohortMonth: row.cohort_month,
    milestone: row.milestone,
    linkToken: row.link_token,
    status: row.status === "sent" ? "sent" : "pending",
    isManual: row.is_manual,
    createdAt: row.created_at,
  };
}

export default function CohortsPage() {
  const [cards, setCards] = useState<CohortCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // 기수별 삭제 확인 단계 — "confirm"(1차: 정말 삭제할까요?) → "force"(2차: 응답까지 있는데
  // 그래도 지울까요?). 기수마다 독립적으로 관리해서, 한 기수를 강제 삭제했다고 다른 기수의
  // 확인 절차가 건너뛰어지지 않게 한다. window.confirm 두 번 대신 화면에 직접 그려서,
  // 실수로 연속 클릭해도 바로 지워지지 않게 한다.
  const [deleteStage, setDeleteStage] = useState<Record<string, "confirm" | "force">>({});

  async function loadCohorts() {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const { data: nurseRows, error: nurseError } = await supabase
      .from("nurses")
      .select("id, name, phone, hire_date, department, employee_number, resigned, created_at");
    if (nurseError) {
      setError("명단을 불러오지 못했어요.");
      setLoading(false);
      return;
    }
    const nurses: Nurse[] = (nurseRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      hireDate: row.hire_date,
      department: row.department,
      employeeNumber: row.employee_number,
      resigned: row.resigned,
      createdAt: row.created_at,
    }));
    const nursesById = new Map(nurses.map((n) => [n.id, n]));

    // 이미 다른 기수(수동 포함)에 들어가 있는 사람은 자동 기수 계산에서 뺀다 — 안 그러면
    // 명단 관리에서 "직접 선택"으로 보낸 사람이 여기서 자동 기수로 또 한 번 중복돼 나온다.
    const coverage = await fetchMilestoneCoverage();
    const due = computeDueCohorts(nurses, new Date(), coverage);

    // 시점이 된 기수마다 링크·대상자 명단을 만든다 (이미 있으면 건드리지 않는다).
    const { error: ensureError } = await ensureDueCohortLinks();
    if (ensureError) {
      setError(ensureError);
      setLoading(false);
      return;
    }

    const { data: existingRows, error: cohortError } = await supabase
      .from("cohorts")
      .select("id, cohort_month, milestone, link_token, status, is_manual, created_at");
    if (cohortError) {
      setError("기수 정보를 불러오지 못했어요.");
      setLoading(false);
      return;
    }
    const existing = (existingRows ?? []).map(mapCohortRow);

    const { data: membershipRows, error: membershipError } = await supabase
      .from("cohort_nurses")
      .select("cohort_id, nurse_id");
    if (membershipError) {
      setError("대상자 명단을 불러오지 못했어요.");
      setLoading(false);
      return;
    }
    const memberIdsByCohort = new Map<string, string[]>();
    for (const row of membershipRows ?? []) {
      const list = memberIdsByCohort.get(row.cohort_id) ?? [];
      list.push(row.nurse_id);
      memberIdsByCohort.set(row.cohort_id, list);
    }

    function membersOf(cohortId: string) {
      return (memberIdsByCohort.get(cohortId) ?? [])
        .map((id) => nursesById.get(id))
        .filter((n): n is Nurse => Boolean(n))
        .map((n) => ({ id: n.id, name: n.name, department: n.department }));
    }

    // 자동 기수: 입사일 계산으로 아직 시점이 된 것만 보여준다(퇴사자만 남은 옛 기수는 자연히 빠짐).
    const autoCards: CohortCard[] = due
      .map((d) => {
        const match = existing.find((c) => !c.isManual && c.cohortMonth === d.cohortMonth && c.milestone === d.milestone);
        if (!match) return null;
        return {
          cohortMonth: d.cohortMonth,
          milestone: d.milestone,
          nurseCount: d.nurseCount,
          id: match.id,
          linkToken: match.linkToken,
          status: match.status,
          isManual: false,
          members: membersOf(match.id),
          createdAt: match.createdAt,
        };
      })
      .filter((c): c is CohortCard => c !== null);

    // 수동 기수: 명단 관리에서 직접 선택해 만든 것 — 입사일 계산과 무관하게 항상 보여준다.
    const manualCards: CohortCard[] = existing
      .filter((c) => c.isManual)
      .map((c) => ({
        cohortMonth: c.cohortMonth,
        milestone: c.milestone,
        nurseCount: memberIdsByCohort.get(c.id)?.length ?? 0,
        id: c.id,
        linkToken: c.linkToken,
        status: c.status,
        isManual: true,
        members: membersOf(c.id),
        createdAt: c.createdAt,
      }));

    setCards(sortCards([...manualCards, ...autoCards]));
    setLoading(false);
  }

  useEffect(() => {
    // 최초 진입 시 시점이 된 기수를 계산·생성한다. loadCohorts 내부에서 비동기로 setState하므로 안전하다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCohorts();
  }, []);

  async function setStatus(id: string, status: "pending" | "sent") {
    if (!supabase) return;
    const { error } = await supabase.from("cohorts").update({ status }).eq("id", id);
    if (error) {
      setError("상태 변경에 실패했어요.");
      return;
    }
    setCards((prev) => sortCards(prev.map((c) => (c.id === id ? { ...c, status } : c))));
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/c/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((prev) => (prev === token ? null : prev)), 2000);
    } catch {
      setError("링크 복사에 실패했어요. 직접 선택해서 복사해주세요.");
    }
  }

  // 이 기수의 대상자 명단에서만 뺀다 — 명단 관리의 전체 명단에서 삭제하는 게 아니다.
  async function removeMember(cohortId: string, nurseId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("cohort_nurses")
      .delete()
      .eq("cohort_id", cohortId)
      .eq("nurse_id", nurseId);
    if (deleteError) {
      setError("대상자를 빼지 못했어요.");
      return;
    }
    setCards((prev) =>
      prev.map((c) =>
        c.id === cohortId
          ? { ...c, members: c.members.filter((m) => m.id !== nurseId), nurseCount: Math.max(0, c.nurseCount - 1) }
          : c,
      ),
    );
  }

  // "삭제" 클릭 — 바로 지우지 않고 1차 확인 단계로만 넘어간다.
  function startDeleteCohort(id: string) {
    setError(null);
    setDeleteStage((prev) => ({ ...prev, [id]: "confirm" }));
  }

  function cancelDeleteCohort(id: string) {
    setDeleteStage((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // 1차 확인 — "발송됨" 상태인 기수는 실제 응답이 아직 없어도 이미 누군가 손에 링크가
  // 있을 수 있으므로, DB 삭제를 시도해보지도 않고 곧바로 2차(force) 확인으로 넘긴다.
  // 그 외(발송 전)에는 기본 삭제를 시도하고, 응답이 쌓여 있어 DB 외래키 제약이 막는
  // 경우에만 2차 확인으로 넘어간다.
  async function confirmDeleteCohort(id: string) {
    if (!supabase) return;
    setError(null);
    const card = cards.find((c) => c.id === id);
    if (card?.status === "sent") {
      setDeleteStage((prev) => ({ ...prev, [id]: "force" }));
      return;
    }
    const { error: deleteError } = await supabase.from("cohorts").delete().eq("id", id);
    if (!deleteError) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      cancelDeleteCohort(id);
      return;
    }
    setDeleteStage((prev) => ({ ...prev, [id]: "force" }));
  }

  // 2차 확인 — 응답·위급 신호·AI 분석 결과까지 함께 지운 뒤 기수를 삭제한다.
  async function forceDeleteCohort(id: string) {
    if (!supabase) return;
    setError(null);
    const [responsesResult, alertsResult, analysesResult] = await Promise.all([
      supabase.from("responses").delete().eq("cohort_id", id),
      supabase.from("emergency_alerts").delete().eq("cohort_id", id),
      supabase.from("status_analyses").delete().eq("cohort_id", id),
    ]);
    const childError = responsesResult.error ?? alertsResult.error ?? analysesResult.error;
    if (childError) {
      setError("관련 데이터를 지우지 못해 기수를 삭제하지 못했어요.");
      return;
    }

    const { error: forceDeleteError } = await supabase.from("cohorts").delete().eq("id", id);
    if (forceDeleteError) {
      setError("이 기수는 삭제할 수 없었어요.");
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== id));
    cancelDeleteCohort(id);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">기수·발송 관리</h1>
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
      <div className="flex items-center gap-3">
        <LeoCharacter n={6} size="sm" float={false} />
        <div>
          <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">기수·발송 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            입사일 기준으로 3/6/9개월·Stay Point 시점이 된 기수마다 링크를 하나씩 만들어요. 명단 관리에서 직접
            선택해 보낸 인원은 &quot;직접 선택&quot; 카드로 따로 나와요. 이 링크를 복사해서 본인의 대량 문자
            발송 기능으로 보내주세요.
          </p>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">계산 중...</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <ul className="mt-6 flex flex-col gap-3">
          {cards.map((c) => {
            const expanded = expandedIds.has(c.id);
            return (
              <SoftCard as="li" level={2} key={c.id}>
                <div className="flex items-center justify-between">
                  <span>
                    {c.isManual ? "직접 선택" : `${c.cohortMonth.slice(0, 7)} 입사`} 기수 · {MILESTONE_LABELS[c.milestone]} · 대상{" "}
                    {c.nurseCount}명
                  </span>
                  <span
                    className={
                      c.status === "sent"
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700"
                    }
                  >
                    {c.status === "sent" ? "발송됨" : "발송 전"}
                  </span>
                </div>

                {c.members.length > 0 && (
                  <div className="mt-1.5">
                    <button type="button" onClick={() => toggleExpanded(c.id)} className="text-xs text-sky-600 underline">
                      {expanded ? "대상자 명단 숨기기" : "대상자 명단 보기"}
                    </button>
                    {expanded && (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {c.members.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-2.5 text-xs text-slate-600"
                            style={{ background: "var(--surface-bg-2)", boxShadow: "var(--shadow-inset-sm)" }}
                          >
                            <span>
                              {m.name}
                              {m.department ? ` · ${m.department}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMember(c.id, m.id)}
                              aria-label={`${m.name} 대상자에서 빼기`}
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <code
                    className="flex-1 truncate rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-sky-700"
                    style={{ background: "var(--surface-bg-2)", boxShadow: "var(--shadow-inset-sm)" }}
                  >
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/c/${c.linkToken}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyLink(c.linkToken)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs text-sky-700"
                    style={{ background: "linear-gradient(150deg, #fff 0%, var(--surface-bg-2) 100%)", boxShadow: "var(--shadow-sm)" }}
                  >
                    {copiedToken === c.linkToken ? "복사됨" : "링크 복사"}
                  </button>
                  {c.status !== "sent" ? (
                    <button
                      type="button"
                      onClick={() => setStatus(c.id, "sent")}
                      className="shrink-0 rounded-full px-3 py-1.5 text-xs text-sky-700"
                      style={{ background: "linear-gradient(150deg, #fff 0%, var(--surface-bg-2) 100%)", boxShadow: "var(--shadow-sm)" }}
                    >
                      발송 완료로 표시
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus(c.id, "pending")}
                      className="shrink-0 rounded-full px-3 py-1.5 text-xs text-sky-700"
                      style={{ background: "linear-gradient(150deg, #fff 0%, var(--surface-bg-2) 100%)", boxShadow: "var(--shadow-sm)" }}
                    >
                      취소 (발송 전으로)
                    </button>
                  )}
                  {!deleteStage[c.id] && (
                    <button
                      type="button"
                      onClick={() => startDeleteCohort(c.id)}
                      className="shrink-0 rounded-full px-3 py-1.5 text-xs text-red-600"
                      style={{ background: "linear-gradient(150deg, #fff 0%, #fee2e2 100%)", boxShadow: "var(--shadow-sm)" }}
                    >
                      삭제
                    </button>
                  )}
                </div>

                {deleteStage[c.id] === "confirm" && (
                  <div className="mt-2 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <p>정말 이 기수 링크를 완전히 삭제할까요? 되돌릴 수 없어요.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => confirmDeleteCohort(c.id)}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-white"
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelDeleteCohort(c.id)}
                        className="rounded-full px-3 py-1.5 text-red-600"
                        style={{ background: "#fff", boxShadow: "var(--shadow-sm)" }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {deleteStage[c.id] === "force" && (
                  <div className="mt-2 rounded-[var(--radius-sm)] border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                    <p>
                      {c.status === "sent"
                        ? "이미 발송된 링크예요. 누군가 이 링크를 가지고 있을 수 있어요."
                        : "이미 응답이 쌓인 기수예요."}{" "}
                      이 기수에 달린 <strong>응답·위급 신호·AI 분석 결과까지 전부</strong> 영구 삭제할까요? 되돌릴 수
                      없어요.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => forceDeleteCohort(c.id)}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-white"
                      >
                        영구 삭제
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelDeleteCohort(c.id)}
                        className="rounded-full px-3 py-1.5 text-red-600"
                        style={{ background: "#fff", boxShadow: "var(--shadow-sm)" }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </SoftCard>
            );
          })}
          {cards.length === 0 && (
            <SoftCard as="li" level={2} className="text-sm text-slate-400">
              지금 시점이 된 기수가 없어요.
            </SoftCard>
          )}
        </ul>
      )}
    </main>
  );
}
