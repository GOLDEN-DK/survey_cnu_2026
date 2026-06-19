"use server";
// 관리자 명단 업로드 — 설강과목/수강생 .xls를 파싱해 설문별로 저장한다.
// Server Function은 직접 POST로도 호출 가능하므로 액션 내부에서 세션을 재검증한다.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSurveyBySlug } from "@/lib/survey-data";
import { parseCoursesXls, parseEnrollmentsXls } from "@/lib/xlsx-import";
import { applyEnrollments } from "@/lib/enrollment-import";

export type UploadState = {
  ok: boolean;
  message: string;
  missingCourses?: string[]; // 설강과목에 없어 제외된 교과목명(수강생 업로드)
} | null;

async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("Unauthorized");
  }
}

function getFile(formData: FormData): File | null {
  const f = formData.get("file");
  return f instanceof File && f.size > 0 ? f : null;
}

// 설강과목 업로드 — 교과목명 기준 upsert (교수·시간 변경 반영)
export async function uploadCourses(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const file = getFile(formData);
  if (!file) return { ok: false, message: "설강과목 파일을 선택해 주세요." };

  const survey = await getSurveyBySlug(slug);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };

  let parsed;
  try {
    parsed = parseCoursesXls(await file.arrayBuffer());
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "파일을 읽을 수 없습니다." };
  }

  for (const c of parsed) {
    await prisma.course.upsert({
      where: { surveyId_name: { surveyId: survey.id, name: c.name } },
      create: {
        surveyId: survey.id,
        orderNo: c.orderNo,
        name: c.name,
        professor: c.professor,
        schedule: c.schedule,
        dayNight: c.dayNight,
      },
      update: {
        orderNo: c.orderNo,
        professor: c.professor,
        schedule: c.schedule,
        dayNight: c.dayNight,
      },
    });
  }

  revalidatePath(`/admin/s/${slug}/upload`);
  return { ok: true, message: `설강과목 ${parsed.length}건을 저장했습니다.` };
}

// 수강생 명단 업로드 — 교과목명으로 course를 연결해 enrollment 추가(병합).
// createMany(skipDuplicates)로 기존 행(응답 표시 포함)은 보존하고 신규만 추가한다.
export async function uploadEnrollments(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const file = getFile(formData);
  if (!file) return { ok: false, message: "수강생 명단 파일을 선택해 주세요." };

  const survey = await getSurveyBySlug(slug);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };

  let parsed;
  try {
    parsed = parseEnrollmentsXls(await file.arrayBuffer());
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "파일을 읽을 수 없습니다." };
  }

  const courseCount = await prisma.course.count({ where: { surveyId: survey.id } });
  if (courseCount === 0) {
    return {
      ok: false,
      message: "먼저 설강과목 파일을 업로드해 주세요. (교과목명으로 강좌를 연결합니다)",
    };
  }

  const r = await applyEnrollments(survey.id, parsed);

  revalidateRoster(slug);
  let message = `수강생 명단 반영 완료 — 신규 ${r.created}건 추가, 정보 갱신 ${r.updated}건 (조인 ${r.total}건).`;
  if (r.missingCourses.length > 0) {
    message += ` 설강과목에 없는 교과목 ${r.missingCourses.length}종은 제외했습니다.`;
  }
  return { ok: true, message, missingCourses: r.missingCourses };
}

export type RosterActionState = { ok: boolean; message: string } | null;

// 응답자 관리 후 영향받는 화면 캐시를 무효화한다.
function revalidateRoster(slug: string): void {
  revalidatePath(`/admin/s/${slug}/upload`);
  revalidatePath(`/admin/s/${slug}`);
  revalidatePath(`/admin/s/${slug}/courses`);
  revalidatePath(`/admin/s/${slug}/comments`);
}

// 개별 리셋 — 응답(Response+Answer)을 삭제하고 완료 표시를 해제해 재응답을 허용한다(명단 유지).
export async function resetEnrollment(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  if (!enrollmentId) return { ok: false, message: "대상이 없습니다." };

  await prisma.$transaction([
    prisma.response.deleteMany({ where: { enrollmentId } }),
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { respondedAt: null },
    }),
  ]);

  revalidateRoster(slug);
  return { ok: true, message: "응답을 초기화했습니다(재응답 가능)." };
}

// 개별 삭제 — 응답을 삭제하고 수강생을 명단(enrollment)에서 제거한다.
export async function deleteEnrollment(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  if (!enrollmentId) return { ok: false, message: "대상이 없습니다." };

  await prisma.$transaction([
    prisma.response.deleteMany({ where: { enrollmentId } }),
    prisma.enrollment.delete({ where: { id: enrollmentId } }),
  ]);

  revalidateRoster(slug);
  return { ok: true, message: "명단에서 제거했습니다." };
}

// 전체 응답 초기화 — 설문의 모든 응답을 삭제하고 완료 표시를 해제한다(명단 유지).
export async function resetAllResponses(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const survey = await getSurveyBySlug(slug);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };

  const [deleted] = await prisma.$transaction([
    prisma.response.deleteMany({ where: { surveyId: survey.id } }),
    prisma.enrollment.updateMany({
      where: { surveyId: survey.id },
      data: { respondedAt: null },
    }),
  ]);

  revalidateRoster(slug);
  return {
    ok: true,
    message: `전체 응답 ${deleted.count}건을 삭제하고 초기화했습니다.`,
  };
}
