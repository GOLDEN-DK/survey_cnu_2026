"use client";
// 실시간 제출 현황 — 최근 제출(성공·실패)을 10초마다 폴링해 보여주는 대시보드 상단 위젯

import { useEffect, useState } from "react";
import { formatPhone } from "@/lib/format";
import type { RecentSubmission } from "@/lib/admin-stats";

// ISO 시각 → 한국시간 HH:mm:ss (서버·클라 동일 결과라 hydration 안전)
function formatAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

export function RecentSubmissions({
  slug,
  initial,
}: {
  slug: string;
  initial: RecentSubmission[];
}) {
  const [rows, setRows] = useState<RecentSubmission[]>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/admin/recent?survey=${encodeURIComponent(slug)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as RecentSubmission[];
        if (alive) setRows(data);
      } catch {
        // 일시적 네트워크 오류는 화면을 유지하고 다음 주기에 재시도
      }
    };
    const id = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [slug]);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-ink">
        실시간 제출 현황
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand" />
        <span className="text-sm font-normal text-ink-soft">
          (10초마다 자동 갱신)
        </span>
      </h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {rows.length === 0 ? (
          <p className="p-4 text-ink-soft">아직 제출된 응답이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li
                key={`${r.status}-${r.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.status === "success"
                      ? "bg-brand/10 text-brand"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {r.status === "success" ? "제출 완료" : "제출 실패"}
                </span>
                <span className="font-semibold text-ink">
                  {r.name ?? "(이름 없음)"}
                </span>
                {r.phone && (
                  <span className="tabular-nums text-ink-soft">
                    {formatPhone(r.phone)}
                  </span>
                )}
                {r.courseName && (
                  <span className="truncate text-ink-soft">{r.courseName}</span>
                )}
                <span className="ml-auto whitespace-nowrap tabular-nums text-xs text-ink-soft">
                  {formatAt(r.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
