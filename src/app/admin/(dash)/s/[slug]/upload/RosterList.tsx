"use client";
// 응답자 명단 — 과목별 수강생 목록 + 개별 리셋/삭제 + 전체 응답 초기화.

import { useActionState, useState } from "react";
import {
  resetEnrollment,
  deleteEnrollment,
  resetAllResponses,
  type RosterActionState,
} from "./actions";

type Row = {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  courseName: string;
  professor: string;
  responded: boolean;
};

// 연락처 포맷 — 01012345678 → 010-1234-5678 (마스킹 없이 전체 표시)
function formatPhone(phone: string): string {
  if (phone.length === 11)
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  if (phone.length === 10)
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  return phone;
}

export function RosterList({ slug, roster }: { slug: string; roster: Row[] }) {
  const [allState, allAction, allPending] = useActionState<
    RosterActionState,
    FormData
  >(resetAllResponses, null);
  const [respondedOnly, setRespondedOnly] = useState(true);

  if (roster.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        등록된 명단이 없습니다. 위에서 설강과목·수강생 파일을 업로드하세요.
      </p>
    );
  }

  const respondedCount = roster.filter((r) => r.responded).length;
  const shown = respondedOnly ? roster.filter((r) => r.responded) : roster;

  // 과목별 그룹 (roster는 과목 orderNo·이름 순으로 이미 정렬됨)
  const groups = new Map<string, Row[]>();
  for (const r of shown) {
    const arr = groups.get(r.courseName) ?? [];
    arr.push(r);
    groups.set(r.courseName, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-ink">응답자 명단</h3>
        <span className="text-sm text-ink-soft">
          응답 {respondedCount} / 전체 {roster.length}
        </span>
        <label className="flex items-center gap-1.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={respondedOnly}
            onChange={(e) => setRespondedOnly(e.target.checked)}
          />
          응답 완료만 보기
        </label>
        <form action={allAction} className="ml-auto">
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            disabled={allPending || respondedCount === 0}
            onClick={(e) => {
              if (
                !window.confirm(
                  "설문의 모든 응답을 삭제하고 초기화합니다. 되돌릴 수 없습니다. 진행할까요?",
                )
              )
                e.preventDefault();
            }}
            className="rounded-lg border border-danger px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-40"
          >
            {allPending ? "처리 중…" : "전체 응답 초기화"}
          </button>
        </form>
      </div>
      {allState && (
        <p
          className={`text-sm font-medium ${allState.ok ? "text-brand" : "text-danger"}`}
        >
          {allState.ok ? "✓ " : "⚠ "}
          {allState.message}
        </p>
      )}

      {shown.length === 0 && (
        <p className="text-sm text-ink-soft">
          {respondedOnly
            ? "응답을 완료한 사람이 없습니다."
            : "명단이 없습니다."}
        </p>
      )}

      {[...groups.entries()].map(([courseName, rows]) => (
        <div
          key={courseName}
          className="overflow-hidden rounded-xl border border-line bg-white"
        >
          <div className="border-b border-line px-4 py-2 text-sm font-semibold text-ink">
            {courseName}
            <span className="ml-2 font-normal text-ink-soft">
              ({rows[0].professor})
            </span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2"
              >
                <span className="font-medium text-ink">{r.name}</span>
                <span className="text-xs text-ink-soft">
                  {formatPhone(r.phone)}
                </span>
                {r.gender && (
                  <span className="text-xs text-ink-soft">{r.gender}</span>
                )}
                {r.responded ? (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    응답 완료
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft">미응답</span>
                )}
                <span className="ml-auto flex gap-1">
                  <RowButton
                    slug={slug}
                    id={r.id}
                    action={resetEnrollment}
                    label="리셋"
                    disabled={!r.responded}
                    confirmText="이 응답을 초기화하면 응답 기록이 삭제되고 다시 응답할 수 있습니다. 진행할까요?"
                    danger={false}
                  />
                  <RowButton
                    slug={slug}
                    id={r.id}
                    action={deleteEnrollment}
                    label="삭제"
                    disabled={false}
                    confirmText={`${r.name} 님을 명단에서 제거하고 응답도 삭제합니다. 되돌릴 수 없습니다. 진행할까요?`}
                    danger
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RowButton({
  slug,
  id,
  action,
  label,
  disabled,
  confirmText,
  danger,
}: {
  slug: string;
  id: string;
  action: (prev: RosterActionState, fd: FormData) => Promise<RosterActionState>;
  label: string;
  disabled: boolean;
  confirmText: string;
  danger: boolean;
}) {
  return (
    <form
      action={async (fd) => {
        await action(null, fd);
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="enrollmentId" value={id} />
      <button
        type="submit"
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          if (!window.confirm(confirmText)) e.preventDefault();
        }}
        className={`rounded-lg border px-2 py-1 text-xs font-semibold disabled:opacity-30 ${
          danger
            ? "border-line text-danger hover:border-danger"
            : "border-line text-ink hover:border-brand"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
