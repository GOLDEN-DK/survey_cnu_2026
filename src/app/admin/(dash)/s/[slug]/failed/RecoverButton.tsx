"use client";
// 제출 실패 보관 — 보존된 답변을 정식 응답으로 복원하는 버튼(+결과 메시지)

import { useActionState } from "react";
import { recoverFailedSubmission, type RecoverState } from "./actions";

export function RecoverButton({
  id,
  slug,
  name,
}: {
  id: string;
  slug: string;
  name: string;
}) {
  const [state, action, pending] = useActionState<RecoverState, FormData>(
    recoverFailedSubmission,
    null,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (
              !window.confirm(
                `${name} 님의 보관된 답변을 정식 응답으로 복원합니다. 진행할까요?`,
              )
            )
              e.preventDefault();
          }}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-brand disabled:opacity-50"
        >
          {pending ? "복원 중…" : "이 답변으로 응답 채우기"}
        </button>
      </form>
      {state && (
        <span
          className={`text-xs font-medium ${state.ok ? "text-brand" : "text-danger"}`}
        >
          {state.ok ? "✓ " : "⚠ "}
          {state.message}
        </span>
      )}
    </div>
  );
}
