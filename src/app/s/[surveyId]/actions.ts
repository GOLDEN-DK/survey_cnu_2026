"use server";
// 설문 응답 저장 — 서버에서 상태/기간/입력을 재검증하고 response+answer를 트랜잭션으로 저장한다.
// (Server Function은 직접 POST로도 호출 가능하므로 클라이언트 검증을 신뢰하지 않고 여기서 다시 검증한다.)
// 저장 경로의 모든 예외는 함수 끝에서 잡아 사용자에겐 안내를 반환하고 서버 로그를 남긴다(흰 화면 방지·원인 추적).

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateAnswer } from "@/lib/validate";
import { getSurveyById, toQuestionDTO, getOpenState } from "@/lib/survey-data";
import { surveyHasRoster } from "@/lib/enrollment-data";
import { COMMENT_NEUTRAL } from "@/constants/survey";
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
  try {
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

    // 명단 기반 설문이면 본인확인(enrollment)을 서버에서 재검증한다.
    // 이름·전화·성별은 클라이언트 값을 믿지 않고 enrollment에서 가져와 저장한다.
    const requireRoster = await surveyHasRoster(survey.id);
    let resp: {
      enrollmentId: string;
      courseId: string;
      respondentName: string;
      respondentPhone: string;
      respondentGender: string | null;
      respondentBirth: string | null;
      respondentAddress: string | null;
    } | null = null;

    if (requireRoster) {
      const enrollmentId = payload.respondent?.enrollmentId;
      if (!enrollmentId) {
        return {
          ok: false,
          message: "본인 확인 정보가 없습니다. 처음부터 다시 진행해 주세요.",
        };
      }
      const e = await prisma.enrollment.findFirst({
        where: { id: enrollmentId, surveyId: survey.id },
      });
      if (!e) {
        return {
          ok: false,
          message: "수강 정보를 확인할 수 없습니다. 처음부터 다시 진행해 주세요.",
        };
      }
      if (e.respondedAt) {
        return { ok: false, message: "이미 이 강좌에 응답하셨습니다." };
      }
      resp = {
        enrollmentId: e.id,
        courseId: e.courseId,
        respondentName: e.name,
        respondentPhone: e.phone,
        respondentGender: e.gender,
        respondentBirth: e.birthDate,
        respondentAddress: e.address,
      };
    }

    await prisma.$transaction(async (tx) => {
      const response = await tx.response.create({
        data: { surveyId: survey.id, userAgent, ...(resp ?? {}) },
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
            // 인라인 의견: commentMode 척도 + 보통(3) 아님 + 내용 있을 때만 저장(서버 재평가)
            const comment = raw.comment?.trim();
            if (q.commentMode && raw.valueNumber !== COMMENT_NEUTRAL && comment) {
              rows.push({
                responseId: response.id,
                questionId: q.id,
                valueText: comment,
                valueNumber: null,
              });
            }
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

      // 과목별 1회 — 응답 완료 표시(다음 제출은 enrollmentId unique 제약으로 차단)
      if (resp) {
        await tx.enrollment.update({
          where: { id: resp.enrollmentId },
          data: { respondedAt: new Date() },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    // 동시/중복 제출로 enrollmentId가 충돌한 경우(정상 흐름의 일부 — 안내만)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { ok: false, message: "이미 이 강좌에 응답하셨습니다." };
    }
    // 그 외 예외: 흰 화면 대신 안내를 반환하고, 원인 추적을 위해 서버 로그를 남긴다.
    // (개인정보는 남기지 않는다 — surveyId·enrollmentId만)
    console.error(
      `[survey submit 실패] surveyId=${payload.surveyId} enrollmentId=${payload.respondent?.enrollmentId ?? "-"}`,
      err,
    );
    return {
      ok: false,
      message:
        "제출 중 일시적인 오류가 발생했어요. 작성하신 내용은 그대로 보관돼 있으니, 잠시 후 [제출하기]를 다시 눌러 주세요.",
    };
  }
}
