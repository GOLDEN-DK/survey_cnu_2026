"use client";
// 편집 가능한 서술 섹션 — 저장본(없으면 자동 초안)을 렌더하고, 관리자가 편집·저장하면 DB에 반영한다.
// 화면에서만 편집 UI·배지를 노출하고, 인쇄물에는 본문 텍스트만 남긴다.

import { useActionState, useEffect, useState } from "react";
import { saveReportNote, type NoteState } from "./actions";

// 저장 텍스트를 문단/불릿으로 렌더 — "·" 또는 "-"로 시작하는 줄은 리스트 항목으로 처리.
function RenderContent({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.every((l) => /^[·\-]/.test(l.trim()));
        if (isList) {
          return (
            <ul key={bi} className="flex list-none flex-col gap-1">
              {lines.map((l, li) => (
                <li key={li} className="pl-4 -indent-4">
                  {l.replace(/^[·\-]\s*/, "· ")}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={bi}>{block}</p>;
      })}
    </div>
  );
}

export function EditableNote({
  slug,
  sectionKey,
  draft,
  saved,
}: {
  slug: string;
  sectionKey: string;
  draft: string;
  saved: { content: string; updatedAt: string } | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<NoteState, FormData>(
    saveReportNote,
    null,
  );
  const content = saved?.content ?? draft;

  // 저장·초안복귀가 성공하면 편집 모드를 닫는다(갱신된 saved는 서버에서 다시 내려온다).
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-end gap-2 print:hidden">
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            saved
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {saved ? `수정됨 · ${saved.updatedAt}` : "자동 초안"}
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            편집
          </button>
        )}
      </div>

      {editing ? (
        <form action={action} className="flex flex-col gap-2 print:hidden">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="sectionKey" value={sectionKey} />
          <textarea
            name="content"
            defaultValue={content}
            rows={Math.min(20, content.split("\n").length + 3)}
            className="w-full rounded-lg border border-line p-2 text-sm leading-relaxed"
          />
          <p className="text-xs text-ink-soft">
            줄 앞에 · 를 붙이면 목록 항목으로, 빈 줄 두 개로 문단을 나눕니다.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "저장 중…" : "저장"}
            </button>
            <button
              type="submit"
              name="intent"
              value="reset"
              disabled={pending}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
            >
              자동 초안으로 되돌리기
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-ink-soft hover:text-ink"
            >
              취소
            </button>
            {state && !state.ok && (
              <span className="text-sm text-danger">{state.message}</span>
            )}
          </div>
        </form>
      ) : (
        <RenderContent content={content} />
      )}
    </div>
  );
}
