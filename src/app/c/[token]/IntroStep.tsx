"use client";

import HeroSection from "./HeroSection";

// 앱을 시작할 때 딱 한 번만 보여주는 메인 화면. 실제 비주얼·레이아웃은 HeroSection이 맡고,
// 이 파일은 page.tsx가 기대하는 기존 이름·props(onStart)를 그대로 유지하기 위한 얇은 래퍼다.
export default function IntroStep({ onStart }: { onStart: () => void }) {
  return <HeroSection onStart={onStart} />;
}
