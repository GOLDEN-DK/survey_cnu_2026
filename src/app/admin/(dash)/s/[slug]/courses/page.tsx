// 강좌별 집계 — 수강 명단(course) 기준 응답 수와 만족도 평균

import { getDashboardStats } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stats = await getDashboardStats(slug);
  if (!stats || stats.total === 0) {
    return <p className="text-ink-soft">아직 수집된 응답이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">강좌별 응답 (수강 명단 기준)</h2>
      <p className="text-sm text-ink-soft">
        응답이 많은 순으로 정렬됩니다. 평균은 해당 강좌 응답의 5점 척도 전체 평균입니다.
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th className="py-2">강좌명</th>
              <th className="py-2 text-right">응답 수</th>
              <th className="py-2 text-right">만족도 평균</th>
            </tr>
          </thead>
          <tbody>
            {stats.byCourseEnrolled.map((c) => (
              <tr key={c.name} className="border-b border-line/50">
                <td className="py-2 text-ink">{c.name}</td>
                <td className="py-2 text-right text-ink">{c.count}</td>
                <td className="py-2 text-right font-semibold text-ink">
                  {c.avg.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
