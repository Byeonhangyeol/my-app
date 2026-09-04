import { supabase } from "@/lib/supabase";
import type { Milestone, Nurse } from "@/types/db";

// PLAN.md 4번(입사일 기준 기수 묶기 + 시점 자동 계산), 5번(퇴사자 제외)에 대응하는 순수 계산 로직.

export type DueCohort = {
  cohortMonth: string; // 그 기수의 대표 입사월, YYYY-MM-01
  milestone: Milestone;
  nurseCount: number;
  nurseIds: string[]; // 대상자 명단(cohort_nurses) 자동 채우기용
};

const MILESTONE_MONTHS: Record<Milestone, number> = {
  "3m": 3,
  "6m": 6,
  "9m": 9,
  stay_point: 12,
};

export const MILESTONE_LABELS: Record<Milestone, string> = {
  "3m": "3개월",
  "6m": "6개월",
  "9m": "9개월",
  stay_point: "Stay Point (1년 경과)",
};

// 입사일을 그 달의 1일로 맞춰 기수(cohort_month)를 만든다.
function toCohortMonth(hireDate: string): string {
  const d = new Date(hireDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

// 같은 입사월(기수)끼리 명단을 묶는다.
export function groupByCohortMonth(nurses: Nurse[]): Map<string, Nurse[]> {
  const map = new Map<string, Nurse[]>();
  for (const nurse of nurses) {
    const cohortMonth = toCohortMonth(nurse.hireDate);
    const list = map.get(cohortMonth) ?? [];
    list.push(nurse);
    map.set(cohortMonth, list);
  }
  return map;
}

// milestone별로 "이미 어떤 기수(자동이든, 명단 관리에서 직접 선택한 수동이든)에 대상자로
// 들어가 있는 간호사 id" 모음. 자동 기수를 계산할 때 이미 수동으로 보낸 사람을 다시 포함하지
// 않도록 걸러내는 데 쓴다 — 안 걸러내면 같은 사람에게 같은 시점 링크가 수동 기수 카드 하나,
// 자동 기수 카드 하나로 두 번 나온다(사용자가 겪은 버그).
export type MilestoneCoverage = Map<Milestone, Set<string>>;

// 오늘 기준으로 3/6/12개월·Stay Point 시점이 된 기수 목록을 계산한다.
// 퇴사 표시된 인원은 계산에서 제외한다 — 이미 그만둔 사람에게 알림이 나가지 않도록 한다.
// coverage를 넘기면, 그 milestone에 이미 다른 기수(수동 포함)로 들어가 있는 사람은 이번
// 자동 계산 결과에서 뺀다 — 명단 관리에서 "직접 선택"으로 보낸 사람이 기수·발송 관리에
// 자동 기수로 또 한 번 중복돼 나오는 것을 막기 위함이다.
export function computeDueCohorts(
  nurses: Nurse[],
  today: Date = new Date(),
  coverage?: MilestoneCoverage,
): DueCohort[] {
  const activeNurses = nurses.filter((nurse) => !nurse.resigned);
  const grouped = groupByCohortMonth(activeNurses);
  const due: DueCohort[] = [];

  grouped.forEach((members, cohortMonth) => {
    (Object.keys(MILESTONE_MONTHS) as Milestone[]).forEach((milestone) => {
      const dueDate = addMonths(cohortMonth, MILESTONE_MONTHS[milestone]);
      if (dueDate <= today) {
        const covered = coverage?.get(milestone);
        const eligible = covered ? members.filter((m) => !covered.has(m.id)) : members;
        if (eligible.length === 0) return;
        due.push({ cohortMonth, milestone, nurseCount: eligible.length, nurseIds: eligible.map((m) => m.id) });
      }
    });
  });

  return due.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));
}

// cohorts·cohort_nurses를 조인해서 milestone별 "이미 대상자로 들어가 있는 간호사 id" 모음을 만든다.
export async function fetchMilestoneCoverage(): Promise<MilestoneCoverage> {
  const coverage: MilestoneCoverage = new Map();
  if (!supabase) return coverage;

  const { data: cohortRows } = await supabase.from("cohorts").select("id, milestone");
  const milestoneByCohortId = new Map((cohortRows ?? []).map((c) => [c.id as string, c.milestone as Milestone]));
  if (milestoneByCohortId.size === 0) return coverage;

  const { data: memberRows } = await supabase.from("cohort_nurses").select("cohort_id, nurse_id");
  for (const row of memberRows ?? []) {
    const milestone = milestoneByCohortId.get(row.cohort_id);
    if (!milestone) continue;
    const set = coverage.get(milestone) ?? new Set<string>();
    set.add(row.nurse_id);
    coverage.set(milestone, set);
  }
  return coverage;
}

// 문자로 보낼 링크에 들어갈, 짧고 예측하기 어려운 코드를 만든다.
function generateLinkToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// 시점이 된 기수마다 링크를 하나씩 만든다 (이미 있으면 건드리지 않는다).
// PRD.md는 "행정간호사가 로그인할 때마다 그 시점에 확인한다"고 정하고 있어, 로그인 이후
// 처음 보게 되는 대시보드(/admin)와 기수·발송 관리 화면(/admin/cohorts) 양쪽에서 호출한다.
export async function ensureDueCohortLinks(): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };

  const { data: nurseRows, error: nurseError } = await supabase
    .from("nurses")
    .select("id, hire_date, resigned");
  if (nurseError) return { error: "명단을 불러오지 못했어요." };

  const nurses = (nurseRows ?? []).map(
    (row) => ({ id: row.id, hireDate: row.hire_date, resigned: row.resigned }) as Nurse,
  );
  const coverage = await fetchMilestoneCoverage();
  const due = computeDueCohorts(nurses, new Date(), coverage);
  if (due.length === 0) return { error: null };

  // (cohort_month, milestone) 유니크 제약은 이제 자동 기수(is_manual=false)에만 걸린
  // partial unique index다(수동 기수는 cohort_month가 "만든 날짜"라 의미가 없어서 제외함,
  // 20260901000003 마이그레이션). PostgREST의 upsert(on_conflict=컬럼목록)는 WHERE 조건이
  // 없는 일반 unique 제약만 잡을 수 있어서, partial index를 대상으로는 항상
  // "there is no unique or exclusion constraint matching..." 에러가 났다 — 그래서 upsert
  // 대신 이미 있는 자동 기수를 먼저 조회해, 없는 것만 insert한다.
  const { data: existingRows, error: existingError } = await supabase
    .from("cohorts")
    .select("cohort_month, milestone")
    .eq("is_manual", false)
    .in("cohort_month", Array.from(new Set(due.map((d) => d.cohortMonth))));
  if (existingError) return { error: "기수 정보를 불러오지 못했어요." };

  const existingKeys = new Set((existingRows ?? []).map((r) => `${r.cohort_month}::${r.milestone}`));
  const missing = due.filter((d) => !existingKeys.has(`${d.cohortMonth}::${d.milestone}`));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("cohorts").insert(
      missing.map((d) => ({
        cohort_month: d.cohortMonth,
        milestone: d.milestone,
        link_token: generateLinkToken(),
        status: "pending",
      })),
    );
    if (insertError) return { error: "기수 링크 생성에 실패했어요." };
  }

  await populateCohortMembership(due);
  return { error: null };
}

// due로 계산된 자동 기수들의 실제 id를 조회해, 대상자 명단(cohort_nurses)을 채워둔다.
// 이미 채워져 있으면 upsert가 그대로 무시한다.
async function populateCohortMembership(due: DueCohort[]): Promise<void> {
  if (!supabase || due.length === 0) return;

  const { data: cohortRows } = await supabase
    .from("cohorts")
    .select("id, cohort_month, milestone")
    .in(
      "cohort_month",
      Array.from(new Set(due.map((d) => d.cohortMonth))),
    );
  const cohortIdByKey = new Map((cohortRows ?? []).map((c) => [`${c.cohort_month}::${c.milestone}`, c.id as string]));

  const membershipRows = due.flatMap((d) => {
    const cohortId = cohortIdByKey.get(`${d.cohortMonth}::${d.milestone}`);
    if (!cohortId) return [];
    return d.nurseIds.map((nurseId) => ({ cohort_id: cohortId, nurse_id: nurseId }));
  });
  if (membershipRows.length === 0) return;

  await supabase.from("cohort_nurses").upsert(membershipRows, { onConflict: "cohort_id,nurse_id", ignoreDuplicates: true });
}
