"use client";
// 강좌별 문항 만족도 상세 — 드롭다운으로 강좌를 고르면 그 강좌의 문항별 차트·표를 보여준다.

import { useState } from "react";
import type { CourseBreakdown } from "@/lib/admin-stats";
import { ScaleAvgChart } from "@/components/admin/charts";
import { ScaleTable } from "@/components/admin/scale-table";

export function CourseBreakdownView({
  courses,
}: {
  courses: CourseBreakdown[];
}) {
  const [idx, setIdx] = useState(0);
  if (courses.length === 0) {
    return <p className="text-sm text-ink-soft">집계할 강좌가 없습니다.</p>;
  }
  const cur = courses[idx] ?? courses[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="min-h-touch rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
        >
          {courses.map((c, i) => (
            <option key={c.name} value={i}>
              {c.name} ({c.total}명)
            </option>
          ))}
        </select>
        <div className="text-sm text-ink-soft">
          {cur.professor ? <span>{cur.professor} 교수 · </span> : null}
          응답 {cur.total}명 · 만족도 평균{" "}
          <span className="font-semibold text-ink">
            {cur.overallAvg.toFixed(2)}
          </span>
        </div>
      </div>

      {cur.scales.length > 0 ? (
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
      ) : (
        <p className="text-sm text-ink-soft">
          이 강좌에는 척도 문항 응답이 없습니다.
        </p>
      )}
    </div>
  );
}
