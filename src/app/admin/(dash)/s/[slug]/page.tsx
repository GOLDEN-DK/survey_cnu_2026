// 관리자 대시보드 — 응답 현황 + 정량 집계 + 차트

import {
  getDashboardStats,
  getRosterDemographics,
  type GroupStat,
  type ChoiceStat,
  type DistItem,
  type GenderAgeMatrix,
} from "@/lib/admin-stats";
import { DateChart, ScaleAvgChart } from "@/components/admin/charts";
import { ScaleTable } from "@/components/admin/scale-table";

export const dynamic = "force-dynamic";

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: GroupStat[] }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-2 font-semibold text-ink">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-soft">
            <th className="py-1 pr-2">구분</th>
            <th className="w-16 whitespace-nowrap py-1 pl-2 text-right font-medium">
              응답 수
            </th>
            <th className="w-16 whitespace-nowrap py-1 pl-4 text-right font-medium">
              평균
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line/50">
              <td className="py-1 pr-2 text-ink">{r.name}</td>
              <td className="w-16 py-1 pl-2 text-right tabular-nums text-ink-soft">
                {r.count}
              </td>
              <td className="w-16 py-1 pl-4 text-right font-semibold tabular-nums text-ink">
                {r.avg.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChoiceTable({ choice, total }: { choice: ChoiceStat; total: number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-2 font-semibold text-ink">
        [{choice.code}] {choice.text}
      </h3>
      <table className="w-full text-sm">
        <tbody>
          {choice.options.map((o) => {
            const pct = total ? Math.round((o.count / total) * 100) : 0;
            return (
              <tr key={o.label} className="border-b border-line/50">
                <td className="py-1 text-ink">{o.label}</td>
                <td className="w-1/2 py-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-ink-soft">
                      {o.count} ({pct}%)
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 분포(이름·건수) 가로 막대 표 — 성별/연령대/지역 구성에 사용
function DistTable({
  title,
  items,
  total,
}: {
  title: string;
  items: DistItem[];
  total: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-2 font-semibold text-ink">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {items.map((it) => {
            const pct = total ? Math.round((it.count / total) * 100) : 0;
            return (
              <tr key={it.name} className="border-b border-line/50">
                <td className="whitespace-nowrap py-1 pr-2 text-ink">{it.name}</td>
                <td className="w-1/2 py-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-ink-soft">
                      {it.count} ({pct}%)
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 성별 × 연령대 교차표 (행=성별, 열=연령대, 행/열 합계 포함)
function MatrixTable({ title, m }: { title: string; m: GenderAgeMatrix }) {
  const grandTotal = m.rowTotals.reduce((s, n) => s + n, 0);
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
      <h3 className="mb-2 font-semibold text-ink">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-ink-soft">
            <th className="py-1 text-left font-medium">성별＼연령대</th>
            {m.colLabels.map((c) => (
              <th key={c} className="py-1 text-right font-medium">
                {c}
              </th>
            ))}
            <th className="py-1 text-right font-semibold">계</th>
          </tr>
        </thead>
        <tbody>
          {m.rowLabels.map((r, i) => (
            <tr key={r} className="border-b border-line/50">
              <td className="py-1 text-ink">{r}</td>
              {m.colLabels.map((c, j) => (
                <td key={c} className="py-1 text-right text-ink">
                  {m.counts[i][j]}
                </td>
              ))}
              <td className="py-1 text-right font-semibold text-ink">
                {m.rowTotals[i]}
              </td>
            </tr>
          ))}
          <tr>
            <td className="py-1 font-semibold text-ink">계</td>
            {m.colTotals.map((t, j) => (
              <td key={j} className="py-1 text-right font-semibold text-ink">
                {t}
              </td>
            ))}
            <td className="py-1 text-right font-semibold text-ink">{grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [stats, demo] = await Promise.all([
    getDashboardStats(slug),
    getRosterDemographics(slug),
  ]);

  const hasResponses = !!stats && stats.total > 0;
  const hasRoster = !!demo && demo.total > 0;

  if (!hasResponses && !hasRoster) {
    return <p className="text-ink-soft">아직 수집된 응답이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {hasRoster && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-ink">
            수강생 인구통계{" "}
            <span className="text-sm font-normal text-ink-soft">
              (전체 명단 {demo!.total}명 기준)
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <DistTable title="성별" items={demo!.byGender} total={demo!.total} />
            <DistTable
              title="연령대"
              items={demo!.byAgeBand}
              total={demo!.total}
            />
            <DistTable title="지역" items={demo!.byRegion} total={demo!.total} />
          </div>
          <div className="mt-3">
            <MatrixTable title="성별 × 연령대 교차" m={demo!.genderAge} />
          </div>
        </section>
      )}

      {!hasResponses ? (
        <p className="text-ink-soft">아직 수집된 응답이 없습니다.</p>
      ) : (
        <>
      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">응답 현황</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card label="총 응답 수" value={stats!.total} />
          <Card label="전체 만족도 평균 (5점)" value={stats!.overallAvg.toFixed(2)} />
          <Card label="응답된 강좌 수" value={stats!.byCourseEnrolled.length} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">일자별 응답 추이</h2>
        <div className="rounded-xl border border-line bg-white p-4">
          <DateChart data={stats!.byDate} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">문항별 만족도 평균</h2>
        <div className="rounded-xl border border-line bg-white p-4">
          <ScaleAvgChart
            data={stats!.scales.map((s) => ({
              no: s.no,
              text: s.text,
              avg: s.avg,
            }))}
          />
        </div>
        <div className="mt-3">
          <ScaleTable scales={stats!.scales} />
        </div>
      </section>

      {stats!.byGender.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-ink">성별 · 시간대별 만족도</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <GroupTable title="성별 (수강 명단 기준)" rows={stats!.byGender} />
            <GroupTable title="시간대 (주간/야간, 명단 기준)" rows={stats!.byTime} />
          </div>
        </section>
      )}

      {(stats!.byAgeBand.length > 0 || stats!.byRegion.length > 0) && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-ink">
            응답자 연령대 · 지역별 만족도
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <GroupTable title="연령대 (응답자 기준)" rows={stats!.byAgeBand} />
            <GroupTable title="지역 (응답자 기준)" rows={stats!.byRegion} />
          </div>
        </section>
      )}

      {stats!.byCourseEnrolled.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-ink">강좌별 · 교수별 만족도</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <GroupTable title="강좌별 (수강 명단 기준)" rows={stats!.byCourseEnrolled} />
            <GroupTable title="교수별" rows={stats!.byProfessor} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">수강 목적 분포</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {stats!.choices.map((c) => (
            <ChoiceTable key={c.code} choice={c} total={stats!.total} />
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
