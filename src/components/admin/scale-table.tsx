// 문항별 만족도 표 — 번호+내용, 평균, ①~⑤ 분포(값에 비례한 배경 강도). 대시보드·강좌별 공용.

import type { ScaleStat } from "@/lib/admin-stats";

export function ScaleTable({ scales }: { scales: ScaleStat[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-soft">
            <th className="py-2 pr-2 font-medium">문항</th>
            <th className="px-2 py-2 text-right font-medium">평균</th>
            <th className="py-2 text-center font-medium">①</th>
            <th className="py-2 text-center font-medium">②</th>
            <th className="py-2 text-center font-medium">③</th>
            <th className="py-2 text-center font-medium">④</th>
            <th className="py-2 text-center font-medium">⑤</th>
          </tr>
        </thead>
        <tbody>
          {scales.map((s) => {
            const max = Math.max(...s.dist, 1);
            return (
              <tr key={s.code} className="border-b border-line/50">
                <td className="py-2 pr-2 text-ink">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink-soft">
                    {s.no}
                  </span>
                  {s.text}
                </td>
                <td className="px-2 py-2 text-right font-semibold text-ink">
                  {s.avg.toFixed(2)}
                </td>
                {s.dist.map((n, i) => (
                  <td
                    key={i}
                    className={`py-2 text-center tabular-nums ${
                      n > 0 && n / max > 0.6
                        ? "font-semibold text-white"
                        : "text-ink-soft"
                    }`}
                    style={{
                      backgroundColor:
                        n > 0
                          ? `rgba(29, 78, 216, ${0.06 + 0.45 * (n / max)})`
                          : undefined,
                    }}
                  >
                    {n}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
