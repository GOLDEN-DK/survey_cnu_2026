// 명단(course·enrollment) 조회·본인확인 매칭 (서버 전용 — prisma 사용)

import { prisma } from "./prisma";
import { normalizePhone } from "./xlsx-import";
import type { LookupResult } from "./survey-types";

// 설문이 명단 기반인지(설강과목이 업로드됐는지) 판정한다.
export async function surveyHasRoster(surveyId: string): Promise<boolean> {
  const n = await prisma.course.count({ where: { surveyId } });
  return n > 0;
}

// 이름+연락처로 수강 과목을 조회한다. 못 찾으면 found:false (진행 차단).
export async function lookupEnrollments(
  surveyId: string,
  rawName: string,
  rawPhone: string,
): Promise<LookupResult> {
  const name = rawName.trim();
  const phone = normalizePhone(rawPhone);
  if (!name || phone.length < 9) return { found: false };

  const rows = await prisma.enrollment.findMany({
    where: { surveyId, name, phone },
    include: { course: true },
    orderBy: { course: { orderNo: "asc" } },
  });
  if (rows.length === 0) return { found: false };

  return {
    found: true,
    name,
    courses: rows.map((e) => ({
      enrollmentId: e.id,
      courseId: e.courseId,
      courseName: e.course.name,
      professor: e.course.professor,
      schedule: e.course.schedule,
      responded: e.respondedAt != null,
    })),
  };
}
