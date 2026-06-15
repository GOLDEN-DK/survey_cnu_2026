"use client";
// 관리자 로그인 페이지

import { useActionState } from "react";
import { login } from "./actions";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold text-ink">관리자 로그인</h1>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-soft">아이디</span>
          <input
            name="username"
            autoComplete="username"
            required
            className="h-12 rounded-lg border-2 border-line bg-white px-3 text-base text-ink focus:border-brand focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-soft">비밀번호</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-12 rounded-lg border-2 border-line bg-white px-3 text-base text-ink focus:border-brand focus:outline-none"
          />
        </label>
        {state?.error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-lg bg-brand text-base font-bold text-on-brand disabled:opacity-60"
        >
          {pending ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
