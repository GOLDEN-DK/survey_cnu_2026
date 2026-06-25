"use server";
// 제출 실패 보관 — 보존된 답변을 정식 응답으로 복원한다. 저장은 submitResponse를 재사용(중복 없음).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { submitResponse } from "@/app/s/[surveyId]/actions";
import type { SubmitPayload } from "@/lib/survey-types";

export type RecoverState = { ok: boolean; message: string } | null;

export async function recoverFailedSubmission(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const id = formData.get("id");
  const slug = formData.get("slug");
  if (typeof id !== "string") return { ok: false, message: "잘못된 요청입니다." };

  const failed = await prisma.failedSubmission.findUnique({ where: { id } });
  if (!failed) return { ok: false, message: "보관 기록을 찾을 수 없습니다." };
  if (!failed.enrollmentId) {
    return { ok: false, message: "본인확인 정보가 없어 복원할 수 없습니다." };
  }

  const e = await prisma.enrollment.findUnique({
    where: { id: failed.enrollmentId },
    include: { course: { select: { name: true, professor: true } } },
  });
  if (!e) return { ok: false, message: "수강 정보를 찾을 수 없습니다." };

  const revalidate = () => {
    if (typeof slug === "string") revalidatePath(`/admin/s/${slug}/failed`);
  };

  // 이미 응답을 완료한 경우 — 새로 저장하지 않고 보관 기록만 정리한다.
  if (e.respondedAt) {
    await prisma.failedSubmission.delete({ where: { id } });
    revalidate();
    return {
      ok: true,
      message: `${e.name} 님은 이미 응답 완료 상태라 보관 기록만 정리했습니다.`,
    };
  }

  let answers: SubmitPayload["answers"];
  try {
    answers = JSON.parse(failed.answersJson) as SubmitPayload["answers"];
  } catch {
    return { ok: false, message: "보관된 답변을 읽을 수 없습니다." };
  }

  const payload: SubmitPayload = {
    surveyId: failed.surveyId,
    respondent: {
      enrollmentId: e.id,
      courseName: e.course.name,
      professor: e.course.professor,
      name: e.name,
    },
    answers,
  };

  const result = await submitResponse(null, payload);
  if (result.ok) {
    await prisma.failedSubmission.delete({ where: { id } });
    revalidate();
    return { ok: true, message: `${e.name} 님의 응답을 복원했습니다.` };
  }
  // 기간 종료·검증 오류 등 — submitResponse의 사유를 그대로 안내(보관 기록은 유지)
  return { ok: false, message: result.message ?? "복원하지 못했습니다." };
}
