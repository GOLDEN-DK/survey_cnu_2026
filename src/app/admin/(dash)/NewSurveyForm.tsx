"use client";
// 새 설문 생성 폼 — 제목·주소(slug)·기간을 입력하면 표준 문항으로 설문을 만든다.

import { useActionState } from "react";
import { createSurvey, type CreateState } from "./actions";

export function NewSurveyForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(
    createSurvey,
    null,
  );

  const inputClass =
    "rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink";

  return (
    <form
      action={action}
      className="flex max-w-md flex-col gap-3 rounded-xl border border-line bg-white p-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">설문 제목</span>
        <input
          name="title"
          required
          placeholder="예: 2026학년도 2학기 평생교육원 수강생 만족도 조사"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">주소(slug)</span>
        <input
          name="slug"
          required
          placeholder="satisfaction-2026-2"
          className={inputClass}
        />
        <span className="text-xs text-ink-soft">
          응답자 주소가 됩니다 · /s/입력값 · 영문 소문자·숫자·하이픈
        </span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">시작일</span>
          <input type="date" name="startAt" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">종료일</span>
          <input type="date" name="endAt" className={inputClass} />
        </label>
      </div>
      <p className="text-xs text-ink-soft">
        표준 만족도 17문항으로 생성됩니다(준비 중 상태). 생성 후 명단을 업로드하고
        설정에서 공개로 전환하세요.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-60"
      >
        {pending ? "생성 중…" : "설문 만들기"}
      </button>
      {state && !state.ok && (
        <p className="text-sm font-medium text-danger">⚠ {state.message}</p>
      )}
    </form>
  );
}
