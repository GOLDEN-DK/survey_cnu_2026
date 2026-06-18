"use client";
// 설문 일정·공개 상태 설정 폼 — 시작·종료일과 상태를 Server Action으로 저장한다.

import { useActionState } from "react";
import { updateSchedule, type ScheduleState } from "./actions";

type Props = {
  slug: string;
  status: string;
  startAt: string;
  endAt: string;
  description: string;
};

export function SettingsForm({
  slug,
  status,
  startAt,
  endAt,
  description,
}: Props) {
  const [state, action, pending] = useActionState<ScheduleState, FormData>(
    updateSchedule,
    null,
  );

  return (
    <form
      action={action}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-line bg-white p-4"
    >
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">공개 상태</span>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="draft">준비 중 (응답자에게 비공개)</option>
          <option value="open">진행 중 (기간 내 응답 가능)</option>
          <option value="closed">마감 (응답 종료)</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">시작일</span>
          <input
            type="date"
            name="startAt"
            defaultValue={startAt}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">종료일</span>
          <input
            type="date"
            name="endAt"
            defaultValue={endAt}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>

      <p className="text-sm text-ink-soft">
        진행 중이어도 시작일 전·종료일 후에는 응답이 자동으로 닫힙니다. 기간을 비우면
        해당 제한 없이 상태(진행/마감)만 적용됩니다.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">인사말</span>
        <textarea
          name="description"
          defaultValue={description}
          rows={8}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed text-ink"
        />
        <span className="text-xs text-ink-soft">
          응답자 첫 화면에 표시됩니다. 빈 줄로 문단을 나눌 수 있습니다. 비우면
          인사말이 표시되지 않습니다.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-60"
      >
        {pending ? "저장 중…" : "저장"}
      </button>

      {state && (
        <p
          className={`text-sm font-medium ${state.ok ? "text-brand" : "text-danger"}`}
        >
          {state.ok ? "✓ " : "⚠ "}
          {state.message}
        </p>
      )}
    </form>
  );
}
