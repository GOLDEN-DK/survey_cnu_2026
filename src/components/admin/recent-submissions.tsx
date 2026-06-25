"use client";
// 최근 제출 현황 — 페이지 로드 시(서버 렌더) 최신, 표 위 새로고침 버튼으로 수동 갱신

import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/recent?survey=${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
      if (res.ok) setRows((await res.json()) as RecentSubmission[]);
    } catch {
      // 일시적 네트워크 오류는 화면을 유지(다시 새로고침)
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xl font-bold text-ink">최근 제출 현황</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="ml-auto rounded-lg border border-line px-3 py-1 text-xs font-semibold text-ink-soft hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {loading ? "갱신 중…" : "↻ 새로고침"}
        </button>
      </div>
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
