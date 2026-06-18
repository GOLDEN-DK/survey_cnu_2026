"use client";
// 명단 업로드 폼 — 설강과목/수강생 파일을 각각 Server Action으로 전송하고 결과를 표시한다.

import { useActionState } from "react";
import { uploadCourses, uploadEnrollments, type UploadState } from "./actions";

type Action = (prev: UploadState, formData: FormData) => Promise<UploadState>;

function UploadCard({
  step,
  title,
  hint,
  action,
  slug,
}: {
  step: number;
  title: string;
  hint: string;
  action: Action;
  slug: string;
}) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    action,
    null,
  );
  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4"
    >
      <input type="hidden" name="slug" value={slug} />
      <div>
        <h3 className="font-semibold text-ink">
          {step}. {title}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">{hint}</p>
      </div>
      <input
        type="file"
        name="file"
        accept=".xls,.xlsx"
        required
        className="text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-60"
      >
        {pending ? "업로드 중…" : "업로드"}
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

export function UploadForms({ slug }: { slug: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <UploadCard
        step={1}
        title="설강과목 업로드"
        hint="교과목명·담당교수가 담긴 파일. 교과목명 기준으로 갱신(upsert)됩니다."
        action={uploadCourses}
        slug={slug}
      />
      <UploadCard
        step={2}
        title="수강생 명단 업로드"
        hint="이름·연락처·성별이 담긴 파일. 설강과목을 먼저 올린 뒤 진행하세요. 기존 명단은 유지하고 신규만 추가합니다."
        action={uploadEnrollments}
        slug={slug}
      />
    </div>
  );
}
