// 정성 응답 — E1~E4 자유의견 목록 + 검색

import { getComments } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const comments = await getComments(slug, q);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">정성 응답 (자유의견)</h2>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="검색어 (예: 강사, 주차, 시간)"
          className="h-10 flex-1 rounded-lg border-2 border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand"
        >
          검색
        </button>
      </form>

      <p className="text-sm text-ink-soft">{comments.length}건</p>

      <div className="flex flex-col gap-2">
        {comments.map((c) => (
          <div
            key={`${c.responseId}-${c.code}`}
            className="rounded-xl border border-line bg-white p-3"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <span className="rounded bg-surface px-2 py-0.5 font-semibold text-ink">
                {c.code}
              </span>
              <span className="truncate">{c.question}</span>
              <span className="ml-auto">{c.submittedAt}</span>
            </div>
            <p className="whitespace-pre-line text-sm text-ink">{c.text}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-ink-soft">표시할 응답이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
