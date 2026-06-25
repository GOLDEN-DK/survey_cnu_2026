// 설문별 관리 레이아웃 — 설문 제목 + 네비(대시보드·강좌별·정성·명단·설정) + 내보내기

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveyBySlug } from "@/lib/survey-data";

export default async function SurveyAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);
  if (!survey) notFound();
  const base = `/admin/s/${slug}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3">
        <span className="font-bold text-ink">{survey.title}</span>
        <nav className="flex flex-wrap gap-4 text-sm font-semibold text-ink-soft">
          <Link href={base} className="hover:text-brand">
            대시보드
          </Link>
          <Link href={`${base}/courses`} className="hover:text-brand">
            강좌별
          </Link>
          <Link href={`${base}/comments`} className="hover:text-brand">
            정성 응답
          </Link>
          <Link href={`${base}/failed`} className="hover:text-brand">
            제출 실패
          </Link>
          <Link href={`${base}/upload`} className="hover:text-brand">
            명단 관리
          </Link>
          <Link href={`${base}/questions`} className="hover:text-brand">
            문항 편집
          </Link>
          <Link href={`${base}/settings`} className="hover:text-brand">
            설문 설정
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <a
            href={`/api/admin/export?survey=${slug}&format=xlsx`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Excel
          </a>
          <a
            href={`/api/admin/export?survey=${slug}&format=csv`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            CSV
          </a>
        </div>
      </div>
      {children}
    </div>
  );
}
