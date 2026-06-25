// 강좌별 집계 — 강좌 선택 시 문항 평균 + 응답자별 개별 응답, 하단 강좌별 평균 목록

import {
  getCourseBreakdown,
  getCourseResponses,
  type ResponseDetail,
} from "@/lib/admin-stats";
import { ScaleAvgChart } from "@/components/admin/charts";
import { ScaleTable } from "@/components/admin/scale-table";
import { CourseSelect } from "./CourseSelect";

export const dynamic = "force-dynamic";

// 응답자 1명의 카드 — 이름·제출일 + 척도 점수(●●●●○) + 자유의견
function ResponseCard({ detail }: { detail: ResponseDetail }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between border-b border-line/60 pb-2">
        <span className="font-semibold text-ink">
          {detail.respondentName ?? "(이름 없음)"}
        </span>
        <span className="text-xs text-ink-soft">{detail.submittedAt} 제출</span>
      </div>
      <ul className="flex flex-col gap-1">
        {detail.scales.map((s) => (
          <li key={s.code} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0 text-right text-ink-soft">{s.no}</span>
            <span className="flex-1 truncate text-ink" title={s.text}>
              {s.text}
            </span>
            <span className="shrink-0 font-mono text-xs text-brand">
              {s.score != null
                ? "●".repeat(s.score) + "○".repeat(5 - s.score)
                : "─────"}
            </span>
            <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-ink">
              {s.score ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      {detail.texts.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-line/60 pt-2">
          {detail.texts.map((t) => (
            <p key={t.code} className="text-sm text-ink-soft">
              <span className="mr-1">💬</span>
              <span className="font-medium text-ink">{t.code}</span> {t.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ course?: string }>;
}) {
  const { slug } = await params;
  const { course } = await searchParams;
  const breakdown = await getCourseBreakdown(slug);
  if (breakdown.length === 0) {
    return <p className="text-ink-soft">아직 수집된 응답이 없습니다.</p>;
  }

  const selectedName =
    course && breakdown.some((c) => c.name === course)
      ? course
      : breakdown[0].name;
  const cur = breakdown.find((c) => c.name === selectedName)!;
  const responses = await getCourseResponses(slug, selectedName);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">강좌별 문항 만족도</h2>
          <p className="mt-1 text-sm text-ink-soft">
            강좌를 선택하면 해당 강좌의 문항별 평균·분포와 응답자별 상세 응답을 볼
            수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CourseSelect
            courses={breakdown.map((c) => ({ name: c.name, total: c.total }))}
            selected={selectedName}
          />
          <div className="text-sm text-ink-soft">
            {cur.professor ? <span>{cur.professor} 교수 · </span> : null}
            응답 {cur.total}명 · 만족도 평균{" "}
            <span className="font-semibold text-ink">
              {cur.overallAvg.toFixed(2)}
            </span>
          </div>
        </div>

        {cur.scales.length > 0 && (
          <>
            <div className="rounded-xl border border-line bg-white p-4">
              <ScaleAvgChart
                data={cur.scales.map((s) => ({
                  no: s.no,
                  text: s.text,
                  avg: s.avg,
                }))}
              />
            </div>
            <ScaleTable scales={cur.scales} />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">
            응답자별 상세 응답{" "}
            <span className="text-sm font-normal text-ink-soft">
              ({selectedName} · {responses.length}명)
            </span>
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            이 강좌에 응답한 분들의 문항 점수와 자유의견입니다.
          </p>
        </div>
        {responses.length === 0 ? (
          <p className="text-sm text-ink-soft">
            이 강좌에는 아직 응답이 없습니다.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {responses.map((r, i) => (
              <ResponseCard key={i} detail={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
