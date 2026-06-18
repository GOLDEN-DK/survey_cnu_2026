"use client";
// 본인확인 게이트 — 이름·휴대폰으로 수강 과목을 조회하고, 한 과목을 선택해 설문에 진입한다.
// 명단에서 못 찾으면 진행을 차단한다. 이미 응답한 과목은 비활성으로 표시한다.

import { useState, useTransition } from "react";
import type { RespondentContext, LookupResult } from "@/lib/survey-types";
import { lookupAction } from "./lookup-actions";

type Props = {
  surveyId: string;
  title: string;
  onSelect: (ctx: RespondentContext) => void;
};

export function IdentityGate({ surveyId, title, onSelect }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const search = () => {
    const n = name.trim();
    const p = phone.trim();
    if (!n || !p) {
      setWarn("성함과 휴대폰 번호를 모두 입력해 주세요.");
      return;
    }
    setWarn(null);
    setResult(null);
    startTransition(async () => {
      setResult(await lookupAction(surveyId, n, p));
    });
  };

  const inputClass =
    "min-h-touch w-full rounded-xl border-2 border-line bg-bg px-4 py-3 text-body text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none";

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-question font-bold text-ink">{title}</h1>
        <p className="text-body leading-relaxed text-ink">
          본인 확인을 위해 <b>성함</b>과 <b>휴대폰 번호</b>를 입력해 주세요. 수강하신
          강좌가 표시되면 선택 후 설문을 시작합니다.
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="rc-name" className="text-label font-semibold text-ink">
            성함
          </label>
          <input
            id="rc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 홍길동"
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="rc-phone" className="text-label font-semibold text-ink">
            휴대폰 번호
          </label>
          <input
            id="rc-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="예) 010-1234-5678"
            autoComplete="tel"
            className={inputClass}
          />
        </div>

        {warn && (
          <p role="alert" className="text-body font-semibold text-danger">
            ⚠ {warn}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 min-h-touch-lg w-full rounded-xl bg-brand text-label font-bold text-on-brand disabled:opacity-60"
        >
          {pending ? "조회 중…" : "내 강좌 찾기"}
        </button>
      </form>

      {result && !result.found && (
        <div className="rounded-xl border-2 border-danger/40 bg-danger/5 p-5">
          <p className="text-body font-semibold text-danger">
            입력하신 정보로 수강 내역을 찾을 수 없습니다.
          </p>
          <p className="mt-2 text-help text-ink-soft">
            성함과 휴대폰 번호를 다시 확인해 주세요. 명단에 등록된 정보와 같아야
            합니다. 계속 찾을 수 없으면 평생교육원으로 문의해 주세요.
          </p>
        </div>
      )}

      {result && result.found && (
        <ResultList result={result} onSelect={onSelect} />
      )}
    </div>
  );
}

function ResultList({
  result,
  onSelect,
}: {
  result: Extract<LookupResult, { found: true }>;
  onSelect: (ctx: RespondentContext) => void;
}) {
  const allDone = result.courses.every((c) => c.responded);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-ink">
        <b>{result.name}</b>님, 수강하신 강좌를 선택해 주세요.
      </p>
      {allDone && (
        <p className="text-help text-ink-soft">
          모든 강좌에 이미 응답해 주셨습니다. 감사합니다.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {result.courses.map((c) => (
          <li key={c.enrollmentId}>
            <button
              type="button"
              disabled={c.responded}
              onClick={() =>
                onSelect({
                  enrollmentId: c.enrollmentId,
                  courseName: c.courseName,
                  professor: c.professor,
                  name: result.name,
                })
              }
              className="flex w-full flex-col gap-1 rounded-xl border-2 border-line bg-white p-4 text-left enabled:hover:border-brand enabled:active:border-brand-strong disabled:opacity-55"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-label font-bold text-ink">
                  {c.courseName}
                </span>
                {c.responded && (
                  <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-help font-semibold text-ink-soft">
                    응답 완료
                  </span>
                )}
              </span>
              <span className="text-help text-ink-soft">
                {c.professor} 교수{c.schedule ? ` · ${c.schedule}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
