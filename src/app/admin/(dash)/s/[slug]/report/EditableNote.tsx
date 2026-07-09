"use client";
// 편집 가능한 서술 섹션 — 저장본(없으면 자동 초안)을 HTML로 렌더하고, 리치 에디터로 편집·저장하면 DB에 반영한다.
// 화면에서만 편집 UI·배지를 노출하고, 인쇄물에는 본문(표 포함)만 남긴다.

import { useActionState, useEffect, useRef, useState } from "react";
import { saveReportNote, type NoteState } from "./actions";
import { noteToHtml } from "@/lib/report-html";
import { NoteEditor } from "./NoteEditor";

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
  const html = noteToHtml(content); // 렌더/에디터 초기값 공통 HTML
  // 에디터의 현재 HTML을 담는 hidden input — 매 입력마다 리렌더하지 않도록 ref로 직접 갱신
  const contentRef = useRef<HTMLInputElement>(null);

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

      {editing && (
        <form action={action} className="flex flex-col gap-2 print:hidden">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="sectionKey" value={sectionKey} />
          <input type="hidden" name="content" defaultValue={html} ref={contentRef} />
          <NoteEditor
            initialHtml={html}
            onChange={(h) => {
              if (contentRef.current) contentRef.current.value = h;
            }}
          />
          <p className="text-xs text-ink-soft">
            굵게·기울임·목록과 표를 넣을 수 있습니다. 표는 “표 삽입” 후 행+/열+로 크기를 조절하세요.
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
      )}

      {/* 본문 — 비편집 시 화면·인쇄 모두 노출. 편집 시 화면에선 숨기고 인쇄에는 저장본을 남겨(편집 중 인쇄해도 누락 방지) 인쇄물을 보존한다. flex 래퍼를 쓰지 않아 인쇄 페이지 분할이 정상 동작한다. */}
      <div
        className={editing ? "hidden print:block" : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
