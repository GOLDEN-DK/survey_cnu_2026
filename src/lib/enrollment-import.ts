// 파싱된 수강생 명단을 DB에 반영한다 — 신규는 추가, 기존은 정보(성별·생년월일·주소·이메일)만 갱신.
// 응답 완료 표시(respondedAt)는 절대 건드리지 않는다. 업로드 액션과 데이터 갱신 스크립트가 공유한다.

import { prisma } from "./prisma";
import type { ParsedEnrollment } from "./xlsx-import";

export type ApplyEnrollmentsResult = {
  total: number; // 설강과목 조인에 성공한 행 수(중복 제거)
  created: number; // 신규 추가
  updated: number; // 정보 갱신(기존 행)
  missingCourses: string[]; // 설강과목 미등록으로 제외된 교과목명
};

const CHUNK = 50;

const keyOf = (courseId: string, name: string, phone: string) =>
  `${courseId}|${name}|${phone}`;

export async function applyEnrollments(
  surveyId: string,
  parsed: ParsedEnrollment[],
): Promise<ApplyEnrollmentsResult> {
  const courses = await prisma.course.findMany({
    where: { surveyId },
    select: { id: true, name: true },
  });
  const courseByName = new Map(courses.map((c) => [c.name, c.id]));

  const existing = await prisma.enrollment.findMany({
    where: { surveyId },
    select: {
      id: true,
      courseId: true,
      name: true,
      phone: true,
      gender: true,
      birthDate: true,
      address: true,
      email: true,
    },
  });
  const existingByKey = new Map(
    existing.map((e) => [keyOf(e.courseId, e.name, e.phone), e]),
  );

  type CreateRow = {
    surveyId: string;
    courseId: string;
    name: string;
    phone: string;
    gender: string | null;
    birthDate: string | null;
    address: string | null;
    email: string | null;
  };
  const toCreate: CreateRow[] = [];
  const toUpdate: {
    id: string;
    gender: string | null;
    birthDate: string | null;
    address: string | null;
    email: string | null;
  }[] = [];
  const missing = new Set<string>();
  const seen = new Set<string>(); // 같은 파일 내 중복 행 방지

  for (const e of parsed) {
    const courseId = courseByName.get(e.courseName);
    if (!courseId) {
      missing.add(e.courseName);
      continue;
    }
    const key = keyOf(courseId, e.name, e.phone);
    if (seen.has(key)) continue;
    seen.add(key);

    const cur = existingByKey.get(key);
    if (!cur) {
      toCreate.push({
        surveyId,
        courseId,
        name: e.name,
        phone: e.phone,
        gender: e.gender,
        birthDate: e.birthDate,
        address: e.address,
        email: e.email,
      });
    } else if (
      cur.gender !== e.gender ||
      cur.birthDate !== e.birthDate ||
      cur.address !== e.address ||
      cur.email !== e.email
    ) {
      toUpdate.push({
        id: cur.id,
        gender: e.gender,
        birthDate: e.birthDate,
        address: e.address,
        email: e.email,
      });
    }
  }

  let created = 0;
  if (toCreate.length > 0) {
    const r = await prisma.enrollment.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    created = r.count;
  }

  // 변경분만, 청크 단위 병렬 update (respondedAt은 미포함 → 보존)
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const slice = toUpdate.slice(i, i + CHUNK);
    await Promise.all(
      slice.map((u) =>
        prisma.enrollment.update({
          where: { id: u.id },
          data: {
            gender: u.gender,
            birthDate: u.birthDate,
            address: u.address,
            email: u.email,
          },
        }),
      ),
    );
  }

  return {
    total: seen.size,
    created,
    updated: toUpdate.length,
    missingCourses: [...missing],
  };
}
