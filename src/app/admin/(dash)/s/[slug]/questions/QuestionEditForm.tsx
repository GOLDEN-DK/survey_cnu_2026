"use client";
// 문항 편집/추가 폼 — 유형별 입력(척도 scaleSet·의견란, 객관식 보기)을 분기한다.

import { useActionState, useEffect, useState } from "react";
import type { QuestionDTO } from "@/lib/survey-types";
import { createQuestion, updateQuestion, type QuestionState } from "./actions";

const TYPES = [
  { value: "scale_5", label: "5점 척도" },
  { value: "single_choice", label: "객관식(단일선택)" },
  { value: "multi_choice", label: "객관식(복수선택)" },
  { value: "short_text", label: "단답" },
  { value: "long_text", label: "장문" },
];

const labelCls = "flex flex-col gap-1";
const spanCls = "text-sm font-semibold text-ink";
const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink disabled:bg-surface disabled:text-ink-soft";

export function QuestionEditForm({
  slug,
  question,
  answerCount,
  onDone,
}: {
  slug: string;
  question: QuestionDTO | null;
  answerCount: number;
  onDone: () => void;
}) {
  const isNew = question === null;
  const [state, action, pending] = useActionState<QuestionState, FormData>(
    isNew ? createQuestion : updateQuestion,
    null,
  );

  const [type, setType] = useState<string>(question?.type ?? "scale_5");
  const [choices, setChoices] = useState<string[]>(
    question &&
      (question.type === "single_choice" || question.type === "multi_choice")
      ? question.options.map((o) => o.label)
      : ["", ""],
  );
  const locked = answerCount > 0; // 유형·코드 잠금

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const isChoice = type === "single_choice" || type === "multi_choice";
  const isText = type === "short_text" || type === "long_text";

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      {!isNew && <input type="hidden" name="id" value={question.id} />}

      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          <span className={spanCls}>섹션 (A~Z 한 글자)</span>
          <input
            name="section"
            defaultValue={question?.section ?? ""}
            maxLength={1}
            placeholder="예: B"
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          <span className={spanCls}>코드</span>
          <input
            name="code"
            defaultValue={question?.code ?? ""}
            disabled={locked}
            placeholder="예: B6"
            className={inputCls}
          />
          {locked && question && (
            <input type="hidden" name="code" value={question.code} />
          )}
        </label>
      </div>

      <label className={labelCls}>
        <span className={spanCls}>유형</span>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={locked}
          className={inputCls}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {locked && <input type="hidden" name="type" value={type} />}
      </label>

      <label className={labelCls}>
        <span className={spanCls}>문항 내용</span>
        <textarea
          name="text"
          defaultValue={question?.text ?? ""}
          rows={2}
          className={inputCls}
        />
      </label>

      {type === "scale_5" && (
        <>
          <label className={labelCls}>
            <span className={spanCls}>척도</span>
            <select
              name="scaleSet"
              defaultValue={question?.scaleSet ?? "satisfaction"}
              className={inputCls}
            >
              <option value="satisfaction">만족도 (매우 만족 ~ 매우 불만족)</option>
              <option value="intention">의향 (매우 있음 ~ 전혀 없음)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="commentMode"
              defaultChecked={question?.commentMode ?? false}
            />
            <span className="text-sm text-ink">
              의견란 달기 — 만족·불만족(보통 제외) 선택 시 아래에 의견 입력란 표시
            </span>
          </label>
          <label className={labelCls}>
            <span className={spanCls}>의견란 안내문구 (선택)</span>
            <input
              name="guide"
              defaultValue={question?.guide ?? ""}
              placeholder="비우면 기본 안내가 표시됩니다"
              className={inputCls}
            />
          </label>
        </>
      )}

      {isChoice && (
        <div className={labelCls}>
          <span className={spanCls}>보기</span>
          {choices.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="choice"
                value={c}
                onChange={(e) => {
                  const next = [...choices];
                  next[i] = e.target.value;
                  setChoices(next);
                }}
                placeholder={`보기 ${i + 1}`}
                className={`flex-1 ${inputCls}`}
              />
              <button
                type="button"
                onClick={() => setChoices(choices.filter((_, j) => j !== i))}
                className="rounded-lg border border-line px-2 text-xs text-danger hover:border-danger"
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setChoices([...choices, ""])}
            className="self-start rounded-lg border border-line px-3 py-1 text-xs font-semibold text-ink hover:border-brand"
          >
            + 보기 추가
          </button>
        </div>
      )}

      {isText && (
        <label className={labelCls}>
          <span className={spanCls}>안내문구 (선택)</span>
          <input
            name="guide"
            defaultValue={question?.guide ?? ""}
            placeholder="입력란 아래 안내 / 단답은 placeholder"
            className={inputCls}
          />
        </label>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="required"
          defaultChecked={question?.required ?? false}
        />
        <span className="text-sm text-ink">필수 응답</span>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink"
        >
          취소
        </button>
        {state && !state.ok && (
          <span className="text-sm font-medium text-danger">⚠ {state.message}</span>
        )}
      </div>
    </form>
  );
}
