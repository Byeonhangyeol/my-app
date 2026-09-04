import type { MetadataRoute } from "next";

// PWA 설치(홈 화면에 추가)를 위한 웹 앱 매니페스트. 이 파일이 있으면 Next.js가 자동으로
// /manifest.webmanifest 라우트를 만들고 <head>에 링크를 넣어준다 — 기존 코드 스택(Next.js)
// 그대로, 네이티브 앱으로 새로 만들지 않고도 "홈 화면에 설치"가 가능해진다(사용자 요청).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "신규간호사 케어",
    short_name: "신규간호사 케어",
    description: "신규간호사의 사직 위험을 조기에 감지·대응하는 도구",
    start_url: "/",
    display: "standalone",
    background_color: "#fff5f7",
    theme_color: "#ec4899",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
