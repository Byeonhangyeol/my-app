"use client";

import { useEffect } from "react";

// PWA 설치 조건(매니페스트 + 서비스 워커) 중 서비스 워커 등록을 담당한다. 화면에는 아무것도
// 그리지 않고, 마운트되면 한 번 등록만 시도한다.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패해도 앱 자체는 평소대로 동작해야 하므로 조용히 무시한다.
      });
    }
  }, []);

  return null;
}
