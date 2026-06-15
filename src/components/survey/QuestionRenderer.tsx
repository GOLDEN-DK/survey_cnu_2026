"use client";
// 문항 1개 렌더 — question.type에 따라 적절한 입력 컴포넌트로 분기한다.

import type { QuestionDTO, AnswerValue } from "@/lib/survey-types";
import { Scale5 } from "./Scale5";
import { SingleChoice } from "./SingleChoice";
import { MultiChoice } from "./MultiChoice";
import { ShortText } from "./ShortText";
import { LongText } from "./LongText";

type Props = {
  question: QuestionDTO;
  value: AnswerValue | undefined;
  error?: string | null;
  onChange: (value: AnswerValue) => void;
};

export function QuestionRenderer({ question, value, error, onChange }: Props) {
  const labelId = `label-${question.code}`;
  const inputId = `input-${question.code}`;
  const isShort = question.type === "short_text";
  const showGuideBelow = !!question.guide && !isShort;

  return (
    <section
      id={`q-${question.code}`}
      className="scroll-mt-24 rounded-2xl bg-bg p-5 shadow-sm"
    >
      <p id={labelId} className="text-question font-semibold text-ink">
        {question.text}
        {question.required ? (
          <span className="text-danger"> *</span>
        ) : (
          <span className="text-help text-ink-soft"> (선택)</span>
        )}
      </p>
      {showGuideBelow && (
        <p className="mt-1 text-help text-ink-soft">{question.guide}</p>
      )}

      <div className="mt-4">
        {question.type === "scale_5" && question.scaleSet && (
          <Scale5
            scaleSet={question.scaleSet}
            value={value?.number}
            labelledBy={labelId}
            onChange={(n) => onChange({ number: n })}
          />
        )}
        {question.type === "single_choice" && (
          <SingleChoice
            options={question.options}
            value={value?.text}
            labelledBy={labelId}
            onChange={(t) => onChange({ text: t })}
          />
        )}
        {question.type === "multi_choice" && (
          <MultiChoice
            options={question.options}
            value={value?.multi ?? []}
            labelledBy={labelId}
            onChange={(m) => onChange({ multi: m })}
          />
        )}
        {question.type === "short_text" && (
          <ShortText
            id={inputId}
            value={value?.text ?? ""}
            placeholder={question.guide ?? undefined}
            labelledBy={labelId}
            onChange={(t) => onChange({ text: t })}
          />
        )}
        {question.type === "long_text" && (
          <LongText
            id={inputId}
            value={value?.text ?? ""}
            labelledBy={labelId}
            onChange={(t) => onChange({ text: t })}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-body font-semibold text-danger">
          ⚠ {error}
        </p>
      )}
    </section>
  );
}
