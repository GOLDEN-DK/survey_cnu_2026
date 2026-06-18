// 관리자 보호 영역 레이아웃 — 상단 네비 + 내보내기 + 로그아웃

import Link from "next/link";
import { logout } from "../login/actions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-bold text-ink">평생교육원 설문 관리</span>
          <nav className="flex gap-4 text-sm font-semibold text-ink-soft">
            <Link href="/admin" className="hover:text-brand">
              대시보드
            </Link>
            <Link href="/admin/courses" className="hover:text-brand">
              강좌별
            </Link>
            <Link href="/admin/comments" className="hover:text-brand">
              정성 응답
            </Link>
            <Link href="/admin/upload" className="hover:text-brand">
              명단 관리
            </Link>
            <Link href="/admin/settings" className="hover:text-brand">
              설문 설정
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <a
              href="/api/admin/export?format=xlsx"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Excel
            </a>
            <a
              href="/api/admin/export?format=csv"
              className="text-sm font-semibold text-brand hover:underline"
            >
              CSV
            </a>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-ink-soft hover:text-danger"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
