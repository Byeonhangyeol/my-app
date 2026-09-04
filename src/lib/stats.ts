import type { ResponseRecord } from "@/types/db";

// PLAN.md 14번(응답 자동 저장 및 통계 집계)에 대응하는 순수 집계 로직.
// 행정간호사는 responses 테이블을 전체 열람할 수 있으므로, 매번 DB 함수를 거치지 않고
// 클라이언트에서 바로 집계한다 (원격 SECURITY DEFINER 함수들은 anon도 써야 하는 집계에 쓴다).

export type FlightRiskStats = { yes: number; no: number; total: number };

// Flight Risk 체크: "지금 사직을 진지하게 고민하고 있나요?"에 대한 예/아니오 비율.
export function computeFlightRiskStats(responses: ResponseRecord[]): FlightRiskStats {
  const answers = responses.filter((r) => r.step === "flight_risk");
  const yes = answers.filter((r) => r.answerText === "예").length;
  const no = answers.filter((r) => r.answerText === "아니오").length;
  return { yes, no, total: answers.length };
}

export type FrictionMapStat = { choice: string; count: number };

// 마찰 지도 선택지별 응답 수 (선택지 뒤에 붙는 서술 답변은 제외하고 앞부분만 센다).
export function computeFrictionMapStats(responses: ResponseRecord[]): FrictionMapStat[] {
  const counts = new Map<string, number>();
  for (const r of responses) {
    if (r.step !== "friction_map" || !r.answerText) continue;
    const choice = r.answerText.split(" — ")[0];
    counts.set(choice, (counts.get(choice) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([choice, count]) => ({ choice, count }))
    .sort((a, b) => b.count - a.count);
}

export type BreakdownItem = { label: string; count: number };
export type ResponseBreakdown = { departments: BreakdownItem[]; hireMonths: BreakdownItem[] };

// Flight Risk·마찰 지도에서 특정 항목(예: "예", 또는 마찰 지도 선택지 하나)을 고른 응답들이
// 실제로 어느 부서, 어느 입사월 기수에서 나왔는지 펼쳐 보여줄 때 쓰는 집계.
// 부서는 부서까지 공개한 응답에만 있어(PRD 익명 원칙), 나머지는 "비공개"로 묶는다.
// 입사월은 응답이 속한 기수(cohort)로 정해지므로 공개 수준과 무관하게 항상 알 수 있다.
export function computeBreakdown(
  items: ResponseRecord[],
  hireMonthOf: (cohortId: string) => string | undefined,
): ResponseBreakdown {
  const deptCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  for (const r of items) {
    const deptLabel = r.disclosedDepartment ?? "비공개";
    deptCounts.set(deptLabel, (deptCounts.get(deptLabel) ?? 0) + 1);
    const monthLabel = hireMonthOf(r.cohortId) ?? "미상";
    monthCounts.set(monthLabel, (monthCounts.get(monthLabel) ?? 0) + 1);
  }
  const toSortedList = (m: Map<string, number>): BreakdownItem[] =>
    Array.from(m.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  return { departments: toSortedList(deptCounts), hireMonths: toSortedList(monthCounts) };
}

// 참여 인원 수 (기기 식별자 기준 중복 제거).
export function countParticipants(responses: ResponseRecord[]): number {
  return new Set(responses.map((r) => r.deviceId)).size;
}

// Stay Menu / Stay Point처럼 서술형 답변을 그대로 목록으로 보여줄 때 쓰는 표시용 이름.
export function displayName(r: ResponseRecord): string {
  if (r.disclosureLevel === "name" && r.disclosedName) {
    return r.disclosedDepartment ? `${r.disclosedName} (${r.disclosedDepartment})` : r.disclosedName;
  }
  if (r.disclosureLevel === "department" && r.disclosedDepartment) {
    return `${r.disclosedDepartment} 소속 (익명)`;
  }
  return "익명";
}
