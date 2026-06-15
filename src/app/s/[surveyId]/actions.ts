"use server";
// 설문 응답 저장 — 서버에서 상태/기간/입력을 재검증하고 response+answer를 트랜잭션으로 저장한다.
// (Server Function은 직접 POST로도 호출 가능하므로 클라이언트 검증을 신뢰하지 않고 여기서 다시 검증한다.)

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateAnswer } from "@/lib/validate";
import { getSurveyById, toQuestionDTO, getOpenState } from "@/lib/survey-data";
import type {
  SubmitPayload,
  SubmitResult,
  AnswerValue,
} from "@/lib/survey-types";

type AnswerRow = {
  responseId: string;
  questionId: string;
  valueText: string | null;
  valueNumber: number | null;
};

export async function submitResponse(
  _prev: SubmitResult | null,
  payload: SubmitPayload,
): Promise<SubmitResult> {
  const survey = await getSurveyById(payload.surveyId);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };
  if (getOpenState(survey) !== "open") {
    return { ok: false, message: "현재 응답 기간이 아닙니다." };
  }

  const byCode = new Map(payload.answers.map((a) => [a.code, a]));

  // 서버측 검증 (validate.ts 공용 규칙)
  const errors: Record<string, string> = {};
  for (const q of survey.questions) {
    const raw = byCode.get(q.code);
    const av: AnswerValue = {
      text: raw?.valueText,
      number: raw?.valueNumber,
      multi: raw?.multi,
    };
    const err = validateAnswer(toQuestionDTO(q), av);
    if (err) errors[q.code] = err;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "응답을 다시 확인해 주세요.", errors };
  }

  const h = await headers();
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;

  await prisma.$transaction(async (tx) => {
    const response = await tx.response.create({
      data: { surveyId: survey.id, userAgent },
    });

    const rows: AnswerRow[] = [];
    for (const q of survey.questions) {
      const raw = byCode.get(q.code);
      if (!raw) continue;

      if (q.type === "multi_choice") {
        for (const label of raw.multi ?? []) {
          rows.push({
            responseId: response.id,
            questionId: q.id,
            valueText: label,
            valueNumber: null,
          });
        }
      } else if (q.type === "scale_5") {
        if (raw.valueNumber != null) {
          rows.push({
            responseId: response.id,
            questionId: q.id,
            valueText: null,
            valueNumber: raw.valueNumber,
          });
        }
      } else if (raw.valueText && raw.valueText.trim().length > 0) {
        rows.push({
          responseId: response.id,
          questionId: q.id,
          valueText: raw.valueText.trim(),
          valueNumber: null,
        });
      }
    }

    if (rows.length > 0) {
      await tx.answer.createMany({ data: rows });
    }
  });

  return { ok: true };
}
