"use client";
// 문항 목록 + 추가/수정/삭제/순서변경 컨트롤.

import { useState } from "react";
import type { QuestionDTO } from "@/lib/survey-types";
import { QuestionEditForm } from "./QuestionEditForm";
import { deleteQuestion, moveQuestion } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  short_text: "단답",
  long_text: "장문",
  single_choice: "객관식(단일)",
  multi_choice: "객관식(복수)",
  scale_5: "5점 척도",
};

export function QuestionsEditor({
  slug,
  questions,
  answerCounts,
}: {
  slug: string;
  questions: QuestionDTO[];
  answerCounts: Record<string, number>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const ordered = [...questions].sort((a, b) => a.orderNo - b.orderNo);

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((q, i) => {
        const count = answerCounts[q.id] ?? 0;
        return (
          <div key={q.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-surface px-2 py-0.5 text-xs font-bold text-brand">
                {q.code}
              </span>
              <span className="text-xs text-ink-soft">섹션 {q.section}</span>
              <span className="text-xs text-ink-soft">
                {TYPE_LABEL[q.type] ?? q.type}
              </span>
              {q.type === "scale_5" && q.commentMode && (
                <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                  의견란
                </span>
              )}
              {count > 0 && (
                <span className="text-xs text-ink-soft">응답 {count}건</span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <MoveButton
                  slug={slug}
                  id={q.id}
                  direction="up"
                  disabled={i === 0}
                />
                <MoveButton
                  slug={slug}
                  id={q.id}
                  direction="down"
                  disabled={i === ordered.length - 1}
                />
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                  className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink hover:border-brand"
                >
                  {editingId === q.id ? "닫기" : "수정"}
                </button>
                <DeleteButton slug={slug} id={q.id} disabled={count > 0} />
              </span>
            </div>
            <p className="mt-2 text-sm text-ink">{q.text}</p>
            {editingId === q.id && (
              <div className="mt-3 border-t border-line pt-3">
                <QuestionEditForm
                  slug={slug}
                  question={q}
                  answerCount={count}
                  onDone={() => setEditingId(null)}
                />
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-xl border border-brand/40 bg-white p-4">
          <h3 className="mb-3 font-semibold text-ink">새 문항 추가</h3>
          <QuestionEditForm
            slug={slug}
            question={null}
            answerCount={0}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
        >
          + 새 문항 추가
        </button>
      )}
    </div>
  );
}

function MoveButton({
  slug,
  id,
  direction,
  disabled,
}: {
  slug: string;
  id: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  return (
    <form action={async (fd) => void (await moveQuestion(null, fd))}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg border border-line px-2 py-1 text-xs text-ink hover:border-brand disabled:opacity-30"
      >
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

function DeleteButton({
  slug,
  id,
  disabled,
}: {
  slug: string;
  id: string;
  disabled: boolean;
}) {
  return (
    <form action={async (fd) => void (await deleteQuestion(null, fd))}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "응답이 있어 삭제할 수 없습니다" : "삭제"}
        className="rounded-lg border border-line px-2 py-1 text-xs text-danger hover:border-danger disabled:opacity-30"
      >
        삭제
      </button>
    </form>
  );
}
