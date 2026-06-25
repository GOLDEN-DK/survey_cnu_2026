// 제출 실패 보관함 — 최종 제출이 실패해 보존된 작성 답변 목록(복원·연락용)

import { getFailedSubmissions } from "@/lib/admin-stats";
import { RecoverButton } from "./RecoverButton";

export const dynamic = "force-dynamic";

export default async function FailedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await getFailedSubmissions(slug);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">제출 실패 보관함</h2>
      <p className="text-sm text-ink-soft">
        최종 제출이 오류로 실패했을 때 작성 내용을 보존한 기록입니다. 응답자에게 연락해
        다시 제출하도록 안내하거나, 내용을 확인해 대신 처리할 수 있습니다. {rows.length}건
      </p>

      <div className="flex flex-col gap-3">
        {rows.map((f) => (
          <div key={f.id} className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <span className="rounded bg-surface px-2 py-0.5 font-semibold text-ink">
                {f.respondentName ?? "(이름 없음)"}
              </span>
              {f.courseName && <span className="truncate">{f.courseName}</span>}
              <span className="ml-auto">{f.createdAt}</span>
            </div>
            <div className="flex flex-col gap-1">
              {f.answers.map((a, i) => {
                const parts = [
                  a.valueText,
                  a.comment ? `(의견) ${a.comment}` : null,
                  typeof a.valueNumber === "number" ? `점수 ${a.valueNumber}` : null,
                  a.multi && a.multi.length ? a.multi.join(", ") : null,
                ].filter(Boolean);
                if (parts.length === 0) return null;
                return (
                  <p key={i} className="text-sm text-ink">
                    <span className="font-semibold text-ink-soft">{a.code}</span>{" "}
                    {parts.join(" · ")}
                  </p>
                );
              })}
            </div>
            {f.error && (
              <p className="mt-2 text-xs text-ink-soft">오류: {f.error}</p>
            )}
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <RecoverButton
                id={f.id}
                slug={slug}
                name={f.respondentName ?? "응답자"}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-ink-soft">보관된 실패 응답이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
