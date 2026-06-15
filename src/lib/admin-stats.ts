// 관리자 집계 — 응답 데이터를 로드해 정량 통계를 계산한다 (서버 전용).

import { prisma } from "./prisma";
import { getSurveyBySlug } from "./survey-data";
import { SURVEY_SLUG } from "@/constants/survey";

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
  byCourse: GroupStat[];
  byProcess: GroupStat[];
  byTime: GroupStat[];
};

type ResponseWithAnswers = {
  submittedAt: Date;
  answers: { questionId: string; valueText: string | null; valueNumber: number | null }[];
};

// 그룹 문항(A1/A2/A3) 값별로 묶어 척도 전체 평균을 계산한다.
function groupScaleAvg(
  responses: ResponseWithAnswers[],
  groupQuestionId: string,
  scaleIds: Set<string>,
): GroupStat[] {
  const map = new Map<string, { count: number; sum: number; n: number }>();
  for (const r of responses) {
    const groupAns = r.answers.find((a) => a.questionId === groupQuestionId);
    const name = groupAns?.valueText?.trim() || "(미응답)";
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

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const survey = await getSurveyBySlug(SURVEY_SLUG);
  if (!survey) return null;

  const responses = await prisma.response.findMany({
    where: { surveyId: survey.id },
    include: { answers: true },
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

  // 객관식 분포 (A2, A3, A4)
  const choices: ChoiceStat[] = [];
  for (const code of ["A2", "A3", "A4"]) {
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

  // 그룹별 척도 평균 (강좌 A1 / 과정 A2 / 시간대 A3)
  const a1 = survey.questions.find((q) => q.code === "A1");
  const a2 = survey.questions.find((q) => q.code === "A2");
  const a3 = survey.questions.find((q) => q.code === "A3");
  const byCourse = a1 ? groupScaleAvg(responses, a1.id, scaleIds) : [];
  const byProcess = a2 ? groupScaleAvg(responses, a2.id, scaleIds) : [];
  const byTime = a3 ? groupScaleAvg(responses, a3.id, scaleIds) : [];

  return {
    total,
    byDate,
    overallAvg,
    scales,
    choices,
    byCourse,
    byProcess,
    byTime,
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
export async function getComments(search?: string): Promise<Comment[]> {
  const survey = await getSurveyBySlug(SURVEY_SLUG);
  if (!survey) return [];

  const longIds = survey.questions
    .filter((q) => q.type === "long_text")
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
