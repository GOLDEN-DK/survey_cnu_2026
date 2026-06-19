// 관리자 집계 — 응답 데이터를 로드해 정량 통계를 계산한다 (서버 전용).

import { prisma } from "./prisma";
import { getSurveyBySlug } from "./survey-data";

export type ScaleStat = {
  code: string;
  text: string;
  scaleSet: string | null;
  count: number;
  avg: number;
  dist: number[]; // dist[0..4] = 값 1..5 응답 수
};

export type ChoiceStat = {
  code: string;
  text: string;
  options: { label: string; count: number }[];
};

export type GroupStat = { name: string; count: number; avg: number };

export type DashboardStats = {
  total: number;
  byDate: { date: string; count: number }[];
  overallAvg: number;
  scales: ScaleStat[];
  choices: ChoiceStat[];
  byTime: GroupStat[]; // 명단 기반 시간대(주간/야간)
  byGender: GroupStat[]; // 명단 기반 성별 분포·만족도
  byCourseEnrolled: GroupStat[]; // 명단 기반 정확한 강좌별 만족도
  byProfessor: GroupStat[]; // 교수별 만족도
};

type ResponseWithAnswers = {
  submittedAt: Date;
  respondentGender: string | null;
  course: { name: string; professor: string; dayNight: string | null } | null;
  answers: { questionId: string; valueText: string | null; valueNumber: number | null }[];
};

// 응답을 임의 키(성별/강좌/교수/시간대 등)로 묶어 응답 수와 척도 전체 평균을 낸다.
function groupBy(
  responses: ResponseWithAnswers[],
  keyOf: (r: ResponseWithAnswers) => string,
  scaleIds: Set<string>,
): GroupStat[] {
  const map = new Map<string, { count: number; sum: number; n: number }>();
  for (const r of responses) {
    const name = keyOf(r);
    const e = map.get(name) ?? { count: 0, sum: 0, n: 0 };
    e.count++;
    for (const a of r.answers) {
      if (scaleIds.has(a.questionId) && a.valueNumber != null) {
        e.sum += a.valueNumber;
        e.n++;
      }
    }
    map.set(name, e);
  }
  return [...map.entries()]
    .map(([name, e]) => ({ name, count: e.count, avg: e.n ? e.sum / e.n : 0 }))
    .sort((a, b) => b.count - a.count);
}

export async function getDashboardStats(
  slug: string,
): Promise<DashboardStats | null> {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return null;

  const responses = await prisma.response.findMany({
    where: { surveyId: survey.id },
    include: {
      answers: true,
      course: { select: { name: true, professor: true, dayNight: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const total = responses.length;
  const scaleIds = new Set(
    survey.questions.filter((q) => q.type === "scale_5").map((q) => q.id),
  );

  // 일자별 추이
  const dateMap = new Map<string, number>();
  for (const r of responses) {
    const d = r.submittedAt.toISOString().slice(0, 10);
    dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
  }
  const byDate = [...dateMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 척도 문항별 평균·분포
  const scales: ScaleStat[] = survey.questions
    .filter((q) => q.type === "scale_5")
    .map((q) => {
      const dist = [0, 0, 0, 0, 0];
      let sum = 0;
      let count = 0;
      for (const r of responses) {
        for (const a of r.answers) {
          if (a.questionId === q.id && a.valueNumber != null) {
            const v = a.valueNumber;
            if (v >= 1 && v <= 5) {
              dist[v - 1]++;
              sum += v;
              count++;
            }
          }
        }
      }
      return {
        code: q.code,
        text: q.text,
        scaleSet: q.scaleSet,
        count,
        avg: count ? sum / count : 0,
        dist,
      };
    });

  const allSum = scales.reduce((s, x) => s + x.avg * x.count, 0);
  const allCount = scales.reduce((s, x) => s + x.count, 0);
  const overallAvg = allCount ? allSum / allCount : 0;

  // 객관식 분포 (A4 수강 목적)
  const choices: ChoiceStat[] = [];
  for (const code of ["A4"]) {
    const q = survey.questions.find((x) => x.code === code);
    if (!q) continue;
    const counter = new Map<string, number>();
    for (const r of responses) {
      for (const a of r.answers) {
        if (a.questionId === q.id && a.valueText) {
          counter.set(a.valueText, (counter.get(a.valueText) ?? 0) + 1);
        }
      }
    }
    choices.push({
      code: q.code,
      text: q.text,
      options: q.options.map((o) => ({
        label: o.label,
        count: counter.get(o.label) ?? 0,
      })),
    });
  }

  // 명단 기반 집계 (성별 / 시간대 / 강좌 / 교수)
  const byGender = groupBy(
    responses,
    (r) => r.respondentGender?.trim() || "(미상)",
    scaleIds,
  );
  const byTime = groupBy(
    responses,
    (r) => r.course?.dayNight?.trim() || "(미상)",
    scaleIds,
  );
  const byCourseEnrolled = groupBy(
    responses,
    (r) => r.course?.name ?? "(미지정)",
    scaleIds,
  );
  const byProfessor = groupBy(
    responses,
    (r) => r.course?.professor ?? "(미지정)",
    scaleIds,
  );

  return {
    total,
    byDate,
    overallAvg,
    scales,
    choices,
    byTime,
    byGender,
    byCourseEnrolled,
    byProfessor,
  };
}

export type Comment = {
  responseId: string;
  submittedAt: string;
  code: string;
  question: string;
  text: string;
};

// 정성(장문) 응답 목록 — 검색어가 있으면 본문에 포함되는 것만.
export async function getComments(
  slug: string,
  search?: string,
): Promise<Comment[]> {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return [];

  const longIds = survey.questions
    .filter(
      (q) => q.type === "long_text" || (q.type === "scale_5" && q.commentMode),
    )
    .map((q) => q.id);
  if (longIds.length === 0) return [];

  const answers = await prisma.answer.findMany({
    where: {
      questionId: { in: longIds },
      valueText: search
        ? { contains: search, mode: "insensitive" }
        : { not: null },
    },
    include: { question: true, response: true },
    orderBy: { response: { submittedAt: "desc" } },
    take: 500,
  });

  return answers
    .filter((a) => a.valueText && a.valueText.trim().length > 0)
    .map((a) => ({
      responseId: a.responseId,
      submittedAt: a.response.submittedAt.toISOString().slice(0, 10),
      code: a.question.code,
      question: a.question.text,
      text: a.valueText as string,
    }));
}
