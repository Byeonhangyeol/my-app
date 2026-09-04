import type { PostgrestError } from "@supabase/supabase-js";

// responses 테이블은 (device_id, cohort_id, step) 조합이 유니크하다. 저장 도중 오류가 나서
// 새로고침한 뒤 같은 질문을 다시 답하면, 사실 이미 저장은 돼 있던 경우라 이 유니크 제약
// 위반(23505)이 난다 — 이때는 진짜 오류가 아니라 "이미 답했다"는 뜻이므로, 화면에는
// 에러를 보여주지 않고 그냥 다음 단계로 넘어가게 해서 신규간호사가 화면에 갇히지 않게 한다.
export function isAlreadySavedError(error: PostgrestError): boolean {
  return error.code === "23505";
}
