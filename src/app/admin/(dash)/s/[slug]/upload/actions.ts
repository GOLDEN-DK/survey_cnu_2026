"use server";
// 관리자 명단 업로드 — 설강과목/수강생 .xls를 파싱해 설문별로 저장한다.
// Server Function은 직접 POST로도 호출 가능하므로 액션 내부에서 세션을 재검증한다.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSurveyBySlug } from "@/lib/survey-data";
import { parseCoursesXls, parseEnrollmentsXls } from "@/lib/xlsx-import";

export type UploadState = { ok: boolean; message: string } | null;

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

  const courses = await prisma.course.findMany({
    where: { surveyId: survey.id },
    select: { id: true, name: true },
  });
  if (courses.length === 0) {
    return {
      ok: false,
      message: "먼저 설강과목 파일을 업로드해 주세요. (교과목명으로 강좌를 연결합니다)",
    };
  }
  const courseByName = new Map(courses.map((c) => [c.name, c.id]));

  const data: {
    surveyId: string;
    courseId: string;
    name: string;
    phone: string;
    gender: string | null;
  }[] = [];
  const missing = new Set<string>();
  for (const e of parsed) {
    const courseId = courseByName.get(e.courseName);
    if (!courseId) {
      missing.add(e.courseName);
      continue;
    }
    data.push({
      surveyId: survey.id,
      courseId,
      name: e.name,
      phone: e.phone,
      gender: e.gender,
    });
  }

  const result = await prisma.enrollment.createMany({
    data,
    skipDuplicates: true,
  });

  revalidatePath(`/admin/s/${slug}/upload`);
  let message = `수강생 명단 처리 완료 — 신규 ${result.count}건 추가 (전체 ${data.length}건 중 기존 ${data.length - result.count}건은 유지).`;
  if (missing.size > 0) {
    message += ` 설강과목에 없는 교과목 ${missing.size}종은 제외했습니다.`;
  }
  return { ok: true, message };
}
