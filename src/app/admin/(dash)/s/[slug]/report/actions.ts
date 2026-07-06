"use server";
// 결과보고서 서술 저장 — 세션 재검증 후 섹션 키별 저장본을 upsert하거나 초안으로 되돌린다.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPORT_SECTION_KEYS, type ReportSectionKey } from "@/lib/report-draft";

export type NoteState = { ok: boolean; message: string } | null;

async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) throw new Error("Unauthorized");
}

export async function saveReportNote(
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!REPORT_SECTION_KEYS.includes(sectionKey as ReportSectionKey)) {
    return { ok: false, message: "섹션 값이 올바르지 않습니다." };
  }
  if (content.length > 8000) {
    return { ok: false, message: "내용이 너무 깁니다. (8000자 이내로 입력해 주세요)" };
  }

  const survey = await prisma.survey.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };

  // 초안 복귀(reset) 또는 빈 내용이면 저장본을 삭제해 자동 초안이 다시 렌더되게 한다.
  if (intent === "reset" || content === "") {
    await prisma.reportNote.deleteMany({
      where: { surveyId: survey.id, sectionKey },
    });
    revalidatePath(`/admin/s/${slug}/report`);
    return { ok: true, message: "자동 초안으로 되돌렸습니다." };
  }

  await prisma.reportNote.upsert({
    where: { surveyId_sectionKey: { surveyId: survey.id, sectionKey } },
    update: { content },
    create: { surveyId: survey.id, sectionKey, content },
  });
  revalidatePath(`/admin/s/${slug}/report`);
  return { ok: true, message: "저장했습니다." };
}
