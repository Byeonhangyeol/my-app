"use client";

import Image from "next/image";

// 메인화면(첫 진입 화면) Hero. public/main.png(구름 텐트 속에서 쉬고 있는 레오) 안에
// 제목("한달만")·부제("그렇게 1년, 2년...")·메모 문구가 이미 손그림으로 그려져 있어서,
// 같은 텍스트를 코드에서 다시 얹지 않는다(이미지가 그대로 이 화면의 본문이다).
// 다만 "한달만" 위 안내 문구와 CTA 버튼은 이미지에 없는 내용이라 별도 HTML 레이어로 얹는다
// (사용자 요청 — 이미지·캐릭터·소품·색감은 그대로 두고 문구·버튼만 추가).
//
// 구성: HeroSection(이 파일)
//  ├─ HeroBackground — 같은 이미지를 확대·블러 처리해 화면 전체를 채워서, 카드 옆이 텅 빈
//  │                    배경이 아니라 이미지 톤이 자연스럽게 이어지게 한다.
//  ├─ HeroImage — public/main.png을 항상 원본 비율(854:1842) 그대로, 화면 안에 다 들어오는
//  │              크기로 가운데 둔다. 어떤 화면 크기·비율에서도 위아래·좌우 어느 쪽도 잘리지
//  │              않는다(예전에는 모바일만 object-cover로 채워서, 화면 비율이 이미지와 많이
//  │              다르면 위아래가 잘렸다 — 사용자 피드백으로 전부 object-contain 방식으로 통일).
//  ├─ 안내 문구 — "한달만" 제목 바로 위, 이미지 박스 기준 top:%로 배치(아래 CTA도 마찬가지).
//  │             이미지를 담는 박스가 항상 이미지의 실제 렌더 크기와 정확히 같으므로(아래
//  │             aspect-ratio+높이 계산 참고), top/bottom을 %로 주면 이미지 속 위치와 항상 맞는다.
//  └─ CTA — "내 이야기 들려주기 →" pill 버튼, 이미지 하단부 위쪽에 배치.
export default function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="hero-viewport relative flex w-full items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#eef3fb_0%,#f7f2ea_50%,#fdedf1_100%)]">
      {/* 배경 — 같은 장면을 확대·블러 처리해 카드 옆 여백을 자연스럽게 채운다. */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/main.png"
          alt=""
          fill
          quality={40}
          sizes="100vw"
          className="scale-110 object-cover object-center blur-3xl"
        />
        <div className="absolute inset-0 bg-[rgba(20,28,52,0.35)]" />
      </div>

      {/*
        너비가 아니라 "이미지 원본 비율(aspect-ratio) + 뷰포트 높이(dvh)"를 기준으로 카드
        크기를 정한다. 너비만 기준으로 잡으면(예: max-width) 뷰포트 높이가 그보다 낮은
        화면(가로로 넓고 낮은 창, 노트북 등)에서 카드가 화면보다 커져 아래쪽(쿠션·소품)이
        잘리는 문제가 있었다 — height는 %가 아니라 dvh 같은 절대 단위여야 한다(퍼센트 높이는
        부모에게 "확정된 높이"가 없으면 계산이 안 돼 박스가 0으로 접혀버린다 — hero-viewport는
        min-height만 줘서 바로 이 문제가 있었다). 높이를 dvh로 고정하고 aspect-ratio로 너비를
        따라오게 한 뒤 max-width:100%를 같이 주면, 너비가 모자란 화면에서는 너비가 기준이
        되도록 자동으로 줄어들어(object-fit: contain과 같은 원리) 어떤 창 크기·비율에서도
        이미지 전체가 다 보인다.
      */}
      <div className="page-enter relative aspect-[854/1842] h-[100dvh] max-h-[100dvh] w-auto max-w-full overflow-hidden rounded-[1.5rem] shadow-[0_24px_60px_rgba(20,16,12,0.45)] sm:rounded-[2rem] lg:rounded-[2.5rem]">
        <Image
          src="/main.png"
          alt="포근한 구름 텐트 안, 따뜻한 전구 조명 아래 레오가 쉬고 있어요. 한달만, 그렇게 1년, 2년... 지금의 노력이 미래의 나를 꼭 안아줄 거예요."
          fill
          priority
          quality={90}
          sizes="(min-width: 1024px) 460px, 100vw"
          className="object-contain object-center"
        />

        {/* "한달만" 제목 바로 위 안내 문구 — 전구 아래·제목 위 여백에 자리한다. */}
        <div className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-8" style={{ top: "27%" }}>
          <p
            className="font-hero text-center font-normal text-[var(--text-brown)]"
            style={{
              fontSize: "clamp(0.8125rem, 2.3vw, 0.9375rem)",
              lineHeight: 1.55,
              letterSpacing: "0.015em",
              textShadow: "0 1px 3px rgba(255, 244, 214, 0.55)",
            }}
          >
            혼자 버티지 않도록,
            <br />
            선생님의 목소리를 들을게요.
          </p>
        </div>

        {/* CTA — 화면 최하단에 붙이지 않고 하단 소품 위쪽, 이미지 박스 기준으로 배치. */}
        <div
          className="absolute inset-x-0 z-10 flex justify-center px-6"
          style={{ bottom: "max(7%, calc(env(safe-area-inset-bottom) + 1.25rem))" }}
        >
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-full text-center font-semibold text-[var(--text-brown)] transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            style={{
              width: "min(78%, 22rem)",
              height: "clamp(3.375rem, 6vw + 2rem, 3.75rem)",
              fontSize: "clamp(1.0625rem, 1vw + 0.9rem, 1.1875rem)",
              background: "linear-gradient(150deg, #fffaf0 0%, #f3e6cf 55%, #ecdcc0 100%)",
              boxShadow:
                "0 8px 18px rgba(20,16,12,0.22), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(120,92,82,0.15)",
              border: "1px solid rgba(120,92,82,0.14)",
            }}
          >
            내 이야기 들려주기
            <span aria-hidden style={{ display: "inline-block", transform: "rotate(-6deg)" }}>
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
