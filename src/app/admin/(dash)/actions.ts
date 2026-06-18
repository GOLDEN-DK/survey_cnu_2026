"use server";
// 새 설문 생성 — 세션 재검증 후 survey를 만들고 표준 만족도 문항(템플릿)을 시드한다.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SATISFACTION_QUESTIONS, buildOptions } from "@/lib/survey-template";
import { START_TEXT } from "@/constants/survey";

export type CreateState = { ok: boolean; message: string } | null;

async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) throw new Error("Unauthorized");
}

export async function createSurvey(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const startStr = String(formData.get("startAt") ?? "");
  const endStr = String(formData.get("endAt") ?? "");

  if (!title) return { ok: false, message: "설문 제목을 입력해 주세요." };
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
    return {
      ok: false,
      message:
        "주소(slug)는 영문 소문자·숫자·하이픈 3~60자로 입력해 주세요. 예: satisfaction-2026-2",
    };
  }

  const exists = await prisma.survey.findUnique({ where: { slug } });
  if (exists) return { ok: false, message: "이미 존재하는 주소(slug)입니다." };

  const startAt = startStr ? new Date(`${startStr}T00:00:00+09:00`) : null;
  const endAt = endStr ? new Date(`${endStr}T23:59:59+09:00`) : null;
  if (startAt && endAt && startAt > endAt) {
    return { ok: false, message: "시작일이 종료일보다 늦을 수 없습니다." };
  }

  await prisma.$transaction(async (tx) => {
    const survey = await tx.survey.create({
      data: {
        slug,
        title,
        description: START_TEXT,
        status: "draft", // 새 설문은 준비 중. 명단 업로드 후 설정에서 공개로 전환.
        startAt,
        endAt,
      },
    });

    for (let i = 0; i < SATISFACTION_QUESTIONS.length; i++) {
      const q = SATISFACTION_QUESTIONS[i];
      const question = await tx.question.create({
        data: {
          surveyId: survey.id,
          section: q.section,
          orderNo: i + 1,
          code: q.code,
          text: q.text,
          type: q.type,
          required: q.required,
          guide: q.guide ?? null,
          scaleSet: q.scaleSet ?? null,
        },
      });
      const opts = buildOptions(q);
      if (opts.length > 0) {
        await tx.option.createMany({
          data: opts.map((o) => ({ questionId: question.id, ...o })),
        });
      }
    }
  });

  revalidatePath("/admin");
  // 생성 직후 명단 업로드 화면으로 이동(설강과목·수강생 등록 유도)
  redirect(`/admin/s/${slug}/upload`);
}
