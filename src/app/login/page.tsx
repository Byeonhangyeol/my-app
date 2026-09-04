"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { LeoCharacter, SoftCard, SoftInput, SoftButton } from "@/components/ui";

// 행정간호사 로그인 화면. 별도 가입 화면은 없고, 계정 하나만 미리 만들어 쓰는 것을 전제로 한다.
// (DESIGN.md "로그인" 화면 참고)
// 레오(입체레오 6번, 걸어가는 포즈) — "들어오세요" 하듯 화면 안으로 향하는 느낌.
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-lg font-medium">로그인</h1>
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 설정이 아직 안 되어 있어요. Supabase 프로젝트를 만든 뒤,{" "}
          <code>.env</code>에 <code>NEXT_PUBLIC_SUPABASE_URL</code>과{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 추가해주세요.
        </p>
      </main>
    );
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("로그인에 실패했어요. 아이디와 비밀번호를 확인해주세요.");
      return;
    }
    router.replace("/admin");
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setLoading(true);
    const { error } = await supabase!.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError("재설정 메일 발송에 실패했어요.");
      return;
    }
    setMessage("비밀번호 재설정 메일을 보냈어요. 메일함을 확인해주세요.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6 sm:max-w-lg sm:p-8 md:max-w-xl">
      <div className="flex justify-center">
        <LeoCharacter n={6} size="sm" />
      </div>
      <SoftCard level={3}>
        <h1 className="text-2xl font-semibold text-pink-600 sm:text-3xl">
          {mode === "login" ? "로그인" : "비밀번호 재설정"}
        </h1>

        <form
          onSubmit={mode === "login" ? handleLogin : handleReset}
          className="mt-6 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-base text-slate-600">
            아이디(이메일)
            <SoftInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>

          {mode === "login" && (
            <label className="flex flex-col gap-1.5 text-base text-slate-600">
              비밀번호
              <SoftInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <SoftButton type="submit" shape="rect" disabled={loading} className="mt-3 w-full">
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "재설정 메일 보내기"}
          </SoftButton>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "reset" : "login");
            setError(null);
            setMessage(null);
          }}
          className="mt-5 text-left text-sm text-sky-600 underline"
        >
          {mode === "login" ? "비밀번호를 잊으셨나요?" : "로그인 화면으로 돌아가기"}
        </button>
      </SoftCard>
    </main>
  );
}
