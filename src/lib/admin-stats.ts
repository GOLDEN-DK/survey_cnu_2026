// 관리자 집계 — 응답 데이터를 로드해 정량 통계를 계산한다 (서버 전용).

import { prisma } from "./prisma";
import { getSurveyBySlug } from "./survey-data";
import {
  ageBandOf,
  regionOf,
  AGE_BAND_ORDER,
  REGION_ORDER,
} from "./demographics";

export type ScaleStat = {
  no: number; // 코드 순 정렬 후 부여하는 1..N 일련번호 (화면 표시용)
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
  byAgeBand: GroupStat[]; // 응답자 연령대별 만족도
  byRegion: GroupStat[]; // 응답자 지역별 만족도
  byCourseEnrolled: GroupStat[]; // 명단 기반 정확한 강좌별 만족도
  byProfessor: GroupStat[]; // 교수별 만족도
};

type ResponseWithAnswers = {
  submittedAt: Date;
  respondentGender: string | null;
  respondentBirth: string | null;
  respondentAddress: string | null;
  course: { name: string; professor: string; dayNight: string | null } | null;
  answers: { questionId: string; valueText: string | null; valueNumber: number | null }[];
};

// GroupStat 배열을 지정된 라벨 순서로 정렬한다(연령대·지역 고정 순서 표시용).
function sortByOrder(stats: GroupStat[], order: readonly string[]): GroupStat[] {
  const idx = (n: string) => {
    const i = order.indexOf(n);
    return i < 0 ? order.length : i;
  };
  return [...stats].sort((a, b) => idx(a.name) - idx(b.name));
}

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

// 코드(B1·C2…)를 [섹션문자, 숫자]로 분해 — 코드 순 자연정렬용("B10" → ["B", 10]).
function scaleOrderKey(code: string): [string, number] {
  const m = /^([A-Za-z]+)(\d+)$/.exec(code);
  return m ? [m[1], Number(m[2])] : [code, 0];
}

// 척도(scale_5) 문항별 평균·분포를 계산하고, 코드 순으로 정렬해 1..N 일련번호를 부여한다.
function computeScales(
  questions: {
    id: string;
    code: string;
    text: string;
    scaleSet: string | null;
    type: string;
  }[],
  responses: { answers: { questionId: string; valueNumber: number | null }[] }[],
): ScaleStat[] {
  const scales: ScaleStat[] = questions
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
        no: 0,
        code: q.code,
        text: q.text,
        scaleSet: q.scaleSet,
        count,
        avg: count ? sum / count : 0,
        dist,
      };
    });
  scales.sort((a, b) => {
    const [sa, na] = scaleOrderKey(a.code);
    const [sb, nb] = scaleOrderKey(b.code);
    return sa !== sb ? (sa < sb ? -1 : 1) : na - nb;
  });
  scales.forEach((s, i) => {
    s.no = i + 1;
  });
  return scales;
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

  // 척도 문항별 평균·분포 (코드 순 정렬 + 일련번호)
  const scales = computeScales(survey.questions, responses);

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
  const byAgeBand = sortByOrder(
    groupBy(responses, (r) => ageBandOf(r.respondentBirth), scaleIds),
    AGE_BAND_ORDER,
  );
  const byRegion = sortByOrder(
    groupBy(responses, (r) => regionOf(r.respondentAddress), scaleIds),
    REGION_ORDER,
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
    byAgeBand,
    byRegion,
    byCourseEnrolled,
    byProfessor,
  };
}

export type CourseBreakdown = {
  name: string;
  professor: string | null;
  total: number;
  overallAvg: number;
  scales: ScaleStat[];
};

// 강좌(course)별 문항 만족도 — 강좌마다 척도 문항별 평균·분포를 따로 집계한다.
// 모든 강좌 통계를 한 번에 계산해 반환하면, 화면에서는 드롭다운으로 즉시 전환할 수 있다.
export async function getCourseBreakdown(
  slug: string,
): Promise<CourseBreakdown[]> {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return [];

  const responses = await prisma.response.findMany({
    where: { surveyId: survey.id },
    include: {
      answers: true,
      course: { select: { name: true, professor: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const groups = new Map<
    string,
    { professor: string | null; rows: typeof responses }
  >();
  for (const r of responses) {
    const name = r.course?.name ?? "(미지정)";
    const g = groups.get(name) ?? {
      professor: r.course?.professor ?? null,
      rows: [],
    };
    g.rows.push(r);
    groups.set(name, g);
  }

  const result: CourseBreakdown[] = [...groups.entries()].map(([name, g]) => {
    const scales = computeScales(survey.questions, g.rows);
    const allSum = scales.reduce((s, x) => s + x.avg * x.count, 0);
    const allCount = scales.reduce((s, x) => s + x.count, 0);
    return {
      name,
      professor: g.professor,
      total: g.rows.length,
      overallAvg: allCount ? allSum / allCount : 0,
      scales,
    };
  });

  result.sort((a, b) => b.total - a.total);
  return result;
}

export type DistItem = { name: string; count: number };

export type GenderAgeMatrix = {
  rowLabels: string[]; // 성별 (남/여/미상)
  colLabels: string[]; // 연령대
  counts: number[][]; // [성별][연령대]
  rowTotals: number[];
  colTotals: number[];
};

export type RosterDemographics = {
  total: number;
  byGender: DistItem[];
  byAgeBand: DistItem[];
  byRegion: DistItem[];
  genderAge: GenderAgeMatrix;
};

const GENDER_ORDER = ["남", "여", "미상"] as const;

// 전체 수강생 명단(응답 여부 무관)의 인구 구성 — 성별·연령대·지역 분포 + 성별×연령대 교차.
export async function getRosterDemographics(
  slug: string,
): Promise<RosterDemographics | null> {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { surveyId: survey.id },
    select: { gender: true, birthDate: true, address: true },
  });

  const genderMap = new Map<string, number>();
  const ageMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const cross = new Map<string, number>(); // `${성별}|${연령대}`

  for (const e of enrollments) {
    const g = e.gender?.trim() || "미상";
    const ab = ageBandOf(e.birthDate);
    const rg = regionOf(e.address);
    genderMap.set(g, (genderMap.get(g) ?? 0) + 1);
    ageMap.set(ab, (ageMap.get(ab) ?? 0) + 1);
    regionMap.set(rg, (regionMap.get(rg) ?? 0) + 1);
    const k = `${g}|${ab}`;
    cross.set(k, (cross.get(k) ?? 0) + 1);
  }

  const toDist = (map: Map<string, number>, order: readonly string[]): DistItem[] =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const ia = order.indexOf(a.name);
        const ib = order.indexOf(b.name);
        return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
      });

  const rowLabels = GENDER_ORDER.filter((g) => genderMap.has(g));
  const colLabels = AGE_BAND_ORDER.filter((a) => ageMap.has(a));
  const counts = rowLabels.map((r) =>
    colLabels.map((c) => cross.get(`${r}|${c}`) ?? 0),
  );
  const rowTotals = counts.map((row) => row.reduce((s, n) => s + n, 0));
  const colTotals = colLabels.map((_, j) =>
    counts.reduce((s, row) => s + row[j], 0),
  );

  return {
    total: enrollments.length,
    byGender: toDist(genderMap, GENDER_ORDER),
    byAgeBand: toDist(ageMap, AGE_BAND_ORDER),
    byRegion: toDist(regionMap, REGION_ORDER),
    genderAge: { rowLabels: [...rowLabels], colLabels: [...colLabels], counts, rowTotals, colTotals },
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
