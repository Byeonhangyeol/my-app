// PRD.md "개발 단위" 1번(데이터 모델 설계)에 대응하는 타입 정의.
// 실제 테이블 구조는 supabase/migrations/ 아래 파일들 참고 (특히 20260828000006번에서
// 평가 시점이 12개월 → 9개월로, 20260828000008·9번에서 재확인 단계·선배 한마디 문구가 추가됨).

/** 명단: 신규간호사 기본 정보 */
export interface Nurse {
  id: string;
  name: string;
  phone: string;
  hireDate: string; // ISO 날짜 문자열 (YYYY-MM-DD)
  department: string; // 부서 (부서만 공개 기능에 필요)
  employeeNumber: string; // 사번
  resigned: boolean; // 퇴사 표시 여부
  createdAt: string;
}

/** 평가 시점 종류 */
export type Milestone = "3m" | "6m" | "9m" | "stay_point";

/** 기수: 같은 입사월 그룹 + 시점별로 발급되는 링크 하나 */
export interface Cohort {
  id: string;
  cohortMonth: string; // 대표 입사월 (YYYY-MM-DD)
  milestone: Milestone;
  linkToken: string;
  status: "pending" | "sent";
  createdAt: string;
}

/** 공개 수준 */
export type DisclosureLevel = "anonymous" | "department" | "name";

/** 대화 시작 전에 한 번 고르는 기본 공개 수준 (사직의사·가장 힘든 점·Stay Menu·Stay Point
 * 답변마다, 기본이 익명/부서만 공개면 그때그때 공개 의향을 다시 물어보는 데 쓴다). */
export type BaseDisclosure = { level: DisclosureLevel; name?: string; department?: string };

/** 대화 단계 */
export type ConversationStep =
  | "flight_risk"
  | "friction_map"
  | "stay_menu"
  | "stay_point"
  | "stay_point_needs" // Stay Point 두 번째 질문 — 후배가 버티려면 무엇이 필요할지
  | "recheck"; // 재확인 체크인 — 이전 시점에 답한 마찰 항목을 다시 물어보는 단계

/** 응답: 신규간호사가 대화에서 남긴 답변 (기기 식별자 기준) */
export interface ResponseRecord {
  id: string;
  cohortId: string;
  deviceId: string;
  step: ConversationStep;
  answerText: string | null;
  adviceText: string | null; // 선배 한마디 카드용으로 다듬어진 문구 (없으면 answerText를 그대로 씀)
  disclosureLevel: DisclosureLevel;
  disclosedName: string | null;
  disclosedDepartment: string | null;
  isExposed: boolean; // 신규간호사 공유용 통계·문구에 이 응답을 포함할지 (행정간호사가 /admin/publish에서 개별 선택)
  createdAt: string;
}

/** 행정간호사가 직접 입력하는 개선 조치 기록 (공유 화이트리스트 4번 항목) */
export interface AdminAction {
  id: string;
  problemText: string;
  improvementText: string;
  isExposed: boolean; // 신규간호사에게 이 기록을 보여줄지 (행정간호사가 /admin/publish에서 선택)
  createdAt: string;
}

/** 1년 근속(Stay Point) 축하 선물상자 카드에 무작위로 보여주는 감사 문구.
 * 행정간호사가 /admin/publish에서 추가·수정·삭제할 수 있다. */
export interface GratitudeMessage {
  id: string;
  messageText: string;
  createdAt: string;
}

/** 행정간호사가 실제 응답과 별개로 직접 쓴 문구 — 어느 목록에 섞일지는 category로 정한다.
 * 실제 응답과 같은 무작위 뽑기 풀에 섞여 신규간호사에게 노출되지만, 참여자 수 등 실제 통계에는
 * 포함되지 않는다(responses 테이블에 넣지 않으므로). */
export type CuratedQuoteCategory = "stay_menu" | "stay_point_advice" | "stay_point_needs" | "stay_point_letter";

export interface CuratedQuote {
  id: string;
  category: CuratedQuoteCategory;
  quoteText: string;
  isExposed: boolean;
  createdAt: string;
}

/** 위급 신호 알림: 마찰 지도 서술 답변에서 AI가 위급 신호를 감지했거나(response에 연결),
 * 대화 끝에서 본인이 직접 도움을 요청했을 때(response와 무관, responseId는 null)의 기록 */
export interface EmergencyAlert {
  id: string;
  responseId: string | null;
  cohortId: string;
  deviceId: string;
  consented: boolean; // 신원과 함께 알리는 것에 동의했는지
  disclosedName: string | null;
  reasoning: string | null;
  acknowledged: boolean; // 행정간호사가 확인했는지 (16번 작업에서 사용)
  createdAt: string;
}
