// 응답 검증 규칙 — 단계 이동(클라이언트)과 제출(서버)에서 공용으로 사용한다.

import type { QuestionDTO, AnswerValue } from "./survey-types";

export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 2000;
export const REQUIRED_MESSAGE = "이 문항에 답해 주세요.";

function isEmpty(a: AnswerValue | undefined): boolean {
  return (
    !a ||
    ((a.text == null || a.text.trim().length === 0) &&
      a.number == null &&
      (!a.multi || a.multi.length === 0))
  );
}

// 한 문항의 응답이 유효한지 검사한다. 유효하면 null, 아니면 안내 메시지를 반환한다.
export function validateAnswer(
  q: QuestionDTO,
  a: AnswerValue | undefined,
): string | null {
  if (isEmpty(a)) {
    return q.required ? REQUIRED_MESSAGE : null;
  }

  switch (q.type) {
    case "short_text":
      if (a!.text && a!.text.length > SHORT_TEXT_MAX) {
        return `${SHORT_TEXT_MAX}자 이내로 입력해 주세요.`;
      }
      return null;
    case "long_text":
      if (a!.text && a!.text.length > LONG_TEXT_MAX) {
        return `${LONG_TEXT_MAX}자 이내로 입력해 주세요.`;
      }
      return null;
    case "single_choice":
      if (!a!.text || !q.options.some((o) => o.label === a!.text)) {
        return "보기 중에서 선택해 주세요.";
      }
      return null;
    case "multi_choice":
      if (a!.multi && a!.multi.some((m) => !q.options.some((o) => o.label === m))) {
        return "보기 중에서 선택해 주세요.";
      }
      return null;
    case "scale_5":
      if (
        a!.number == null ||
        !Number.isInteger(a!.number) ||
        a!.number < 1 ||
        a!.number > 5
      ) {
        return REQUIRED_MESSAGE;
      }
      return null;
    default:
      return null;
  }
}

// 문항 목록에서 첫 번째 오류 문항을 찾는다 (단계 검증·제출 검증 공용).
export function findFirstError(
  questions: QuestionDTO[],
  answers: Record<string, AnswerValue>,
): { code: string; message: string } | null {
  for (const q of questions) {
    const err = validateAnswer(q, answers[q.code]);
    if (err) return { code: q.code, message: err };
  }
  return null;
}
