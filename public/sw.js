// 설치 가능(PWA) 조건을 만족시키기 위한 최소 서비스 워커. 응답 내용이 기기별·시점별로
// 계속 바뀌는 앱(대화 진행 상태, 관리자 통계)이라 아무것도 캐시하지 않는다 — fetch 이벤트를
// 그냥 네트워크로 흘려보내기만 해서, 오래된 화면이 캐시에서 나오는 문제를 애초에 만들지 않는다.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // 아무 응답도 가로채지 않는다 — 항상 네트워크에서 그대로 받아온다.
});
