"use client";
// 문항 1개 렌더 — question.type에 따라 적절한 입력 컴포넌트로 분기한다.

import type { QuestionDTO, AnswerValue } from "@/lib/survey-types";
import { COMMENT_NEUTRAL } from "@/constants/survey";
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
  const isCommentScale = question.type === "scale_5" && question.commentMode;
  const showGuideBelow = !!question.guide && !isShort && !isCommentScale;
  // 척도 의견란 노출: commentMode 문항에서 보통(3)을 제외한 점수를 골랐을 때
  const showScaleComment =
    isCommentScale &&
    typeof value?.number === "number" &&
    value.number !== COMMENT_NEUTRAL;

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
          <>
            <Scale5
              scaleSet={question.scaleSet}
              value={value?.number}
              labelledBy={labelId}
              onChange={(n) => onChange({ ...value, number: n })}
            />
            {showScaleComment && (
              <div className="mt-3">
                <LongText
                  id={`${inputId}-comment`}
                  value={value?.comment ?? ""}
                  placeholder={
                    question.guide ??
                    "이 점수를 주신 이유를 자유롭게 적어 주세요 (선택)"
                  }
                  labelledBy={labelId}
                  onChange={(c) => onChange({ ...value, comment: c })}
                />
              </div>
            )}
          </>
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
