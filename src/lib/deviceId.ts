// 신규간호사를 "누구인지"가 아니라 "이 브라우저인지"로 인식하기 위한 식별자.
// 사번·이름 입력을 요구하지 않고, 이 값 하나로 같은 사람의 재방문을 알아본다.
// 특정 기수 링크에 묶지 않고 브라우저 전체에서 하나만 쓴다 — 나중에 재확인 체크인(19번 작업)에서
// 다른 시점 대화에 다시 왔을 때도 같은 사람으로 이어서 알아보기 위해서다.

const STORAGE_KEY = "nurse_device_id";

// 브라우저에 저장된 식별자를 읽고, 없으면 새로 만들어 저장한 뒤 반환한다.
export function getDeviceId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}

// getDeviceId()를 부르기 전에, 이미 식별자가 있었는지(=재방문인지) 확인할 때 쓴다.
export function hasDeviceId(): boolean {
  return Boolean(window.localStorage.getItem(STORAGE_KEY));
}
