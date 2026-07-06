// 관리자 보호 영역 공통 레이아웃 — 상단 헤더 + 설문 목록 링크 + 로그아웃
// 설문별 네비(대시보드·강좌별 등)와 내보내기는 s/[slug]/layout.tsx에 있다.

import Link from "next/link";
import { logout } from "../login/actions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link
            href="/admin"
            className="text-lg font-bold text-ink hover:text-brand"
          >
            평생교육원 설문 관리
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm font-semibold text-ink-soft hover:text-brand"
            >
              설문 목록
            </Link>
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
      <main className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
