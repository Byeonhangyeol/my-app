import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "./RegisterServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "신규간호사 케어",
  description: "신규간호사의 사직 위험을 조기에 감지·대응하는 도구",
  // 홈 화면에 추가(PWA 설치)했을 때 iOS Safari가 이 값들을 읽어 앱처럼 보이게 한다
  // (매니페스트는 src/app/manifest.ts, 안드로이드 크롬은 매니페스트만으로 충분).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "신규간호사 케어",
  },
};

export const viewport: Viewport = {
  themeColor: "#ec4899",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <div className="flex-1">{children}</div>
        <footer
          className="shrink-0 px-4 text-center text-[0.7rem] text-[var(--text-gray)]"
          style={{ paddingTop: "0.75rem", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          Copyright © {new Date().getFullYear()} by 간호국 변한결
        </footer>
      </body>
    </html>
  );
}
