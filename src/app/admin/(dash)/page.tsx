// 관리자 대시보드 — 응답 현황 + 정량 집계 + 차트

import { getDashboardStats, type GroupStat, type ChoiceStat } from "@/lib/admin-stats";
import { DateChart, ScaleAvgChart } from "@/components/admin/charts";

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
            <th className="py-1">구분</th>
            <th className="py-1 text-right">응답 수</th>
            <th className="py-1 text-right">평균</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line/50">
              <td className="py-1 text-ink">{r.name}</td>
              <td className="py-1 text-right text-ink">{r.count}</td>
              <td className="py-1 text-right text-ink">{r.avg.toFixed(2)}</td>
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

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  if (!stats || stats.total === 0) {
    return (
      <p className="text-ink-soft">아직 수집된 응답이 없습니다.</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">응답 현황</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card label="총 응답 수" value={stats.total} />
          <Card label="전체 만족도 평균 (5점)" value={stats.overallAvg.toFixed(2)} />
          <Card label="응답된 강좌 수" value={stats.byCourseEnrolled.length} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">일자별 응답 추이</h2>
        <div className="rounded-xl border border-line bg-white p-4">
          <DateChart data={stats.byDate} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">문항별 만족도 평균</h2>
        <div className="rounded-xl border border-line bg-white p-4">
          <ScaleAvgChart
            data={stats.scales.map((s) => ({ code: s.code, avg: s.avg }))}
          />
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-1">문항</th>
                <th className="py-1 text-right">평균</th>
                <th className="py-1 text-right">①</th>
                <th className="py-1 text-right">②</th>
                <th className="py-1 text-right">③</th>
                <th className="py-1 text-right">④</th>
                <th className="py-1 text-right">⑤</th>
              </tr>
            </thead>
            <tbody>
              {stats.scales.map((s) => (
                <tr key={s.code} className="border-b border-line/50">
                  <td className="py-1 text-ink">
                    <span className="font-semibold">{s.code}</span>{" "}
                    <span className="text-ink-soft">{s.text}</span>
                  </td>
                  <td className="py-1 text-right font-semibold text-ink">
                    {s.avg.toFixed(2)}
                  </td>
                  {s.dist.map((n, i) => (
                    <td key={i} className="py-1 text-right text-ink-soft">
                      {n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {stats.byGender.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-ink">성별 · 시간대별 만족도</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <GroupTable title="성별 (수강 명단 기준)" rows={stats.byGender} />
            <GroupTable title="시간대 (주간/야간, 명단 기준)" rows={stats.byTime} />
          </div>
        </section>
      )}

      {stats.byCourseEnrolled.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-ink">강좌별 · 교수별 만족도</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <GroupTable title="강좌별 (수강 명단 기준)" rows={stats.byCourseEnrolled} />
            <GroupTable title="교수별" rows={stats.byProfessor} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">수강 목적 분포</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.choices.map((c) => (
            <ChoiceTable key={c.code} choice={c} total={stats.total} />
          ))}
        </div>
      </section>
    </div>
  );
}
