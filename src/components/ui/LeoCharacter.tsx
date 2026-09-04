"use client";

import { useEffect, useState } from "react";

// public 폴더의 "입체레오 (N).png" 캐릭터 이미지를 화면에 배치할 때 쓰는 공용 컴포넌트.
// 화면마다 표정·포즈가 다른 레오를 골라 쓰되(어떤 화면에 몇 번을 쓰는지는 각 파일 주석 참고),
// 크기·비율·그림자는 이 컴포넌트가 통일해서 관리한다.
//
// 원본 PNG는 투명 배경이 아니라 거의 다 흰 캔버스 배경이라, 그대로 쓰면 배경 위에 흰 사각형이
// 도드라져 보인다. 그래서 캔버스에 그려서 거의 흰 픽셀(각 채널 값이 다 높은 픽셀)만 투명하게
// 지우는 방식으로 실제 투명 배경 PNG를 브라우저에서 만들어 쓴다 — 이러면 그림자도 캐릭터
// 실루엣을 그대로 따라간다.
//
// size: "hero"(화면 폭의 25~35%, 최대 260px) | "lg"(180px) | "md"(140px) | "sm"(90px) | "xs"(64px)
// float: 아주 미세하게(2~4px) 위아래로 떠 있는 느낌을 줄지 여부 (기본 true)

// 캐릭터가 제목·본문 글씨보다 작아 보인다는 피드백을 반영해 전체적으로 한 단계씩 키움
// (특히 대화 화면 대부분이 쓰는 sm 기준).
const SIZE_MAP = {
  hero: "w-[32vw] max-w-[220px] sm:max-w-[260px]",
  lg: "w-[220px]",
  md: "w-[168px]",
  sm: "w-[128px]",
  xs: "w-[76px]",
} as const;

export type LeoSize = keyof typeof SIZE_MAP;

// 처리 결과(투명 배경 data URL)를 원본 경로별로 한 번만 계산해서 재사용한다.
const transparentCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function cutOutWhiteBackground(src: string): Promise<string> {
  const cached = transparentCache.get(src);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(src);
  if (inFlight) return inFlight;

  const task = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d context 없음");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const THRESH_LOW = 235; // 이보다 밝은 픽셀부터 서서히 투명해지기 시작
        const THRESH_HIGH = 250; // 이 이상은 완전 투명 (배경 흰 캔버스)
        for (let i = 0; i < data.length; i += 4) {
          const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
          if (minChannel >= THRESH_LOW) {
            const t = Math.min(1, (minChannel - THRESH_LOW) / (THRESH_HIGH - THRESH_LOW));
            data[i + 3] = Math.round(data[i + 3] * (1 - t));
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const url = canvas.toDataURL("image/png");
        transparentCache.set(src, url);
        resolve(url);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`이미지를 불러오지 못함: ${src}`));
    img.src = src;
  });

  pending.set(src, task);
  return task;
}

export function LeoCharacter({
  n,
  size = "md",
  float = true,
  className = "",
  alt = "레오",
}: {
  /** public/입체레오 (N).png 의 N */
  n: number;
  size?: LeoSize;
  float?: boolean;
  className?: string;
  alt?: string;
}) {
  const src = `/입체레오 (${n}).png`;
  const [trackedSrc, setTrackedSrc] = useState(src);
  const [resolvedSrc, setResolvedSrc] = useState<string>(src);

  // n(=src)이 바뀌면, 처리된 결과를 기다리는 동안 우선 원본을 보여준다 — effect가 아니라
  // 렌더링 중에 바로 맞춰서(리액트 공식 "prop 변경에 따라 state 조정" 패턴) 여분의 렌더를 피한다.
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setResolvedSrc(src);
  }

  useEffect(() => {
    let active = true;
    cutOutWhiteBackground(src)
      .then((url) => {
        if (active) setResolvedSrc(url);
      })
      .catch(() => {
        // 실패하면 원본 그대로 둔다 (흰 배경이 남더라도 캐릭터 자체는 보이는 게 낫다).
      });
    return () => {
      active = false;
    };
  }, [src]);

  return (
    <span className={`relative inline-block ${SIZE_MAP[size]} ${className}`}>
      <span
        aria-hidden
        className="absolute bottom-[6%] left-1/2 h-[14%] w-[62%] -translate-x-1/2 rounded-full blur-md"
        style={{ background: "rgba(120,92,82,0.18)" }}
      />
      <img
        src={resolvedSrc}
        alt={alt}
        className={`relative w-full select-none object-contain drop-shadow-[0_8px_10px_rgba(120,92,82,0.2)] ${float ? "leo-float" : ""}`}
      />
    </span>
  );
}
