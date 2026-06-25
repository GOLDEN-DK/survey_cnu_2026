"use client";
// 강좌별 현황 목록 — 정렬 가능한 표. 정렬 상태를 URL(?sort&dir)에 유지해 상세 갔다 와도 보존된다.

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type CourseRow = {
  name: string;
  professor: string | null;
  total: number;
  overallAvg: number;
};

type SortKey = "name" | "total" | "avg";

const normKey = (v?: string): SortKey =>
  v === "name" || v === "avg" ? v : "total";
const normDir = (v?: string): "asc" | "desc" => (v === "asc" ? "asc" : "desc");

export function CourseList({
  courses,
  sort,
  dir,
}: {
  courses: CourseRow[];
  sort?: string;
  dir?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sortKey, setSortKey] = useState<SortKey>(normKey(sort));
  const [sortDir, setSortDir] = useState<"asc" | "desc">(normDir(dir));

  const sorted = [...courses].sort((a, b) => {
    let v = 0;
    if (sortKey === "name") v = a.name.localeCompare(b.name, "ko");
    else if (sortKey === "total") v = a.total - b.total;
    else v = a.overallAvg - b.overallAvg;
    return sortDir === "asc" ? v : -v;
  });

  const toggle = (key: SortKey) => {
    const nextDir =
      sortKey === key
        ? sortDir === "asc"
          ? "desc"
          : "asc"
        : key === "name"
          ? "asc"
          : "desc";
    setSortKey(key);
    setSortDir(nextDir);
    // 정렬 상태를 URL에 반영(서버 왕복 없이) — 상세 갔다 오거나 새로고침해도 유지된다.
    window.history.replaceState(
      null,
      "",
      `${pathname}?sort=${key}&dir=${nextDir}`,
    );
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const go = (name: string) =>
    router.push(
      `${pathname}?course=${encodeURIComponent(name)}&sort=${sortKey}&dir=${sortDir}`,
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-soft">
            <th
              className="cursor-pointer select-none px-4 py-2.5 font-semibold hover:text-ink"
              onClick={() => toggle("name")}
            >
              강좌명{arrow("name")}
            </th>
            <th className="px-4 py-2.5 font-semibold">교수</th>
            <th
              className="cursor-pointer select-none px-4 py-2.5 text-right font-semibold hover:text-ink"
              onClick={() => toggle("total")}
            >
              응답 수{arrow("total")}
            </th>
            <th
              className="cursor-pointer select-none px-4 py-2.5 text-right font-semibold hover:text-ink"
              onClick={() => toggle("avg")}
            >
              만족도 평균{arrow("avg")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.name}
              onClick={() => go(c.name)}
              className="cursor-pointer border-b border-line/50 last:border-0 hover:bg-surface"
            >
              <td className="px-4 py-2.5 font-medium text-ink">{c.name}</td>
              <td className="px-4 py-2.5 text-ink-soft">
                {c.professor ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                {c.total}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                {c.overallAvg.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
