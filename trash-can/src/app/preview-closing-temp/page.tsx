"use client";

// 임시 확인용 페이지 — GiftBoxCard 인터랙션을 스크린샷/클릭으로 확인하기 위한 스캐폴드.
// 확인 후 trash-can으로 옮긴다.
import GiftBoxCard from "@/app/c/[token]/GiftBoxCard";

export default function PreviewClosing() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <GiftBoxCard onNext={() => {}} onBack={() => {}} />
    </main>
  );
}
