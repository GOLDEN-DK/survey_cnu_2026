"use client";
// 강좌 선택 드롭다운 — 선택 시 URL ?course= 를 갱신해 선택 강좌만 서버에서 다시 로드한다.

import { useRouter, usePathname } from "next/navigation";

export function CourseSelect({
  courses,
  selected,
}: {
  courses: { name: string; total: number }[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      value={selected}
      onChange={(e) =>
        router.push(`${pathname}?course=${encodeURIComponent(e.target.value)}`)
      }
      className="min-h-touch max-w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
    >
      {courses.map((c) => (
        <option key={c.name} value={c.name}>
          {c.name} ({c.total}명)
        </option>
      ))}
    </select>
  );
}
