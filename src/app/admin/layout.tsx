"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard } from "@/components/ui";

// 행정간호사 전용 화면(/admin/*) 공통 레이아웃.
// 로그인 여부를 확인해, 로그인하지 않았으면 로그인 화면으로 돌려보낸다 — PRD.md 7번이
// 요구하는 "로그인 없이는 접근 불가"를 화면 단에서 강제하는 부분이다.

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/publish", label: "공개 콘텐츠 관리" },
  { href: "/admin/nurses", label: "명단 관리" },
  { href: "/admin/cohorts", label: "기수·발송 관리" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setAuthed(true);
      setChecked(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요.
        </p>
      </main>
    );
  }

  if (!checked) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        <SoftCard level={2}>
          <p className="text-sm text-slate-500">확인 중...</p>
        </SoftCard>
      </main>
    );
  }

  if (!authed) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <nav
        className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
        style={{
          background: "linear-gradient(150deg, rgba(255,255,255,0.92) 0%, rgba(247,246,244,0.92) 100%)",
          boxShadow: "0 2px 14px rgba(120,92,82,0.08)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="flex items-center gap-2">
          <LeoCharacter n={5} size="xs" float={false} />
          <ul className="flex flex-wrap gap-1.5 text-[0.95rem]">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block rounded-full px-3.5 py-1.5 font-medium transition-all duration-200"
                    style={
                      active
                        ? {
                            background: "linear-gradient(155deg, var(--pink-strong) 0%, var(--pink) 100%)",
                            boxShadow: "var(--shadow-inset)",
                            color: "#fff",
                          }
                        : { color: "var(--text-body-color)" }
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full px-3.5 py-1.5 text-sm text-sky-600 transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: "linear-gradient(150deg, #ffffff 0%, var(--surface-bg-2) 100%)", boxShadow: "var(--shadow-sm)" }}
        >
          로그아웃
        </button>
      </nav>
      {children}
    </div>
  );
}
