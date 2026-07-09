// 결과보고서 데이터 조립 — 기존 집계 재사용 + 자유의견 전량·집단 응답률·저장 서술을 한 번에 구성(서버 전용).

import { prisma } from "./prisma";
import { getSurveyBySlug } from "./survey-data";
import {
  getDashboardStats,
  getRosterDemographics,
  getCourseBreakdown,
  type DashboardStats,
  type RosterDemographics,
  type CourseBreakdown,
  type ScaleStat,
  type DistItem,
} from "./admin-stats";
import {
  classify,
  isMeaningful,
  SATISFY_CATS,
  IMPROVE_CATS,
  E3_CATS,
  type ClassifiedCat,
} from "./comment-classify";
import {
  pickTopCourses,
  pickReviewCourses,
  topManageDirectionOf,
  manageDirectionOf,
  inspectionPointsOf,
  courseAvgOf,
  labelOf,
  groupGapCommentary,
  responseRateCommentary,
  orderByLabels,
  groupRegions,
  GENDER_ORDER,
  DAYNIGHT_ORDER,
  CORE_CODES,
  type RateRow,
} from "./report-rules";
import {
  buildDraft,
  REPORT_SECTION_KEYS,
  type ReportSectionKey,
  type DraftContext,
} from "./report-draft";

// 강좌 표 1행 — 우수/점검/붙임 공용 (핵심지표·관리방향 계산 완료 상태로 담는다).
export type CourseRow = {
  name: string;
  professor: string | null;
  dayNight: string | null;
  total: number;
  overallAvg: number;
  core: {
    overall: number | null;
    retake: number | null;
    recommend: number | null;
    env: number | null;
  };
  manageDirection: string;
  inspectionPoints: string;
  tag: string; // 붙임1 비고
  smallSample: boolean;
};

export type NoteBundle = {
  key: ReportSectionKey;
  draft: string;
  saved: { content: string; updatedAt: string } | null;
};

export type ReportData = {
  survey: {
    slug: string;
    title: string;
    startAt: Date | null;
    endAt: Date | null;
  };
  stats: DashboardStats;
  roster: RosterDemographics | null;
  overallRate: number;
  scales: ScaleStat[];
  minScale: ScaleStat | null;
  topCourses: CourseRow[];
  reviewCourses: CourseRow[];
  allCourseRows: CourseRow[];
  satisfyCats: ClassifiedCat[];
  improveCats: ClassifiedCat[];
  e3Cats: ClassifiedCat[];
  commentCounts: { E1: number; E5: number; E2: number; E3: number; E4: number };
  e3Samples: string[];
  rateByGender: RateRow[];
  rateByAge: RateRow[];
  rateByTime: RateRow[];
  regionGrouped: DistItem[]; // 지역 6개 권역 묶음(인구 구성 표·차트용)
  gapCommentary: { gender: string; age: string; time: string };
  rateCommentary: string;
  notes: NoteBundle[];
};

// 명단 라벨과 응답 라벨을 맞추기 위한 정규화("(미상)" → "미상").
const norm = (s: string) => (s === "(미상)" ? "미상" : s);

// 명단 분포·응답 분포를 조인해 집단별 응답률 행을 만든다.
function buildRates(
  enrolled: { name: string; count: number }[],
  responded: { name: string; count: number }[],
): RateRow[] {
  const respMap = new Map(responded.map((r) => [norm(r.name), r.count]));
  return enrolled.map((e) => {
    const name = norm(e.name);
    const resp = respMap.get(name) ?? 0;
    return {
      name,
      enrolled: e.count,
      responded: resp,
      rate: e.count ? (resp / e.count) * 100 : 0,
    };
  });
}

export async function getReportData(slug: string): Promise<ReportData | null> {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return null;

  const [stats, roster, courses] = await Promise.all([
    getDashboardStats(slug),
    getRosterDemographics(slug),
    getCourseBreakdown(slug),
  ]);
  if (!stats) return null;

  // ── 자유의견 전량(E1~E5) 로드 — code별·강좌별로 유효 텍스트를 모은다 ──
  const longQs = survey.questions.filter((q) => q.type === "long_text");
  const longIds = longQs.map((q) => q.id);
  const codeById = new Map(longQs.map((q) => [q.id, q.code]));
  const answers = longIds.length
    ? await prisma.answer.findMany({
        where: { questionId: { in: longIds }, valueText: { not: null } },
        select: {
          questionId: true,
          valueText: true,
          response: { select: { course: { select: { name: true } } } },
        },
      })
    : [];

  const byCode = new Map<string, string[]>();
  const courseImproveTexts = new Map<string, string[]>(); // 강좌명 → E5+E2 유효 텍스트
  for (const a of answers) {
    const code = codeById.get(a.questionId);
    const text = (a.valueText ?? "").trim();
    if (!code || !isMeaningful(text)) continue;
    (byCode.get(code) ?? byCode.set(code, []).get(code)!).push(text);
    if (code === "E5" || code === "E2") {
      const cname = a.response.course?.name;
      if (cname) {
        (
          courseImproveTexts.get(cname) ??
          courseImproveTexts.set(cname, []).get(cname)!
        ).push(text);
      }
    }
  }
  const get = (code: string) => byCode.get(code) ?? [];
  const satisfyCats = classify(get("E1"), SATISFY_CATS);
  const improveCats = classify([...get("E5"), ...get("E2")], IMPROVE_CATS);
  const e3Cats = classify(get("E3"), E3_CATS);

  // 강좌별 개선의견 분류 결과 캐시(관리방향·점검사항 판정에 재사용).
  const courseImproveCache = new Map<string, ClassifiedCat[]>();
  const courseImprove = (name: string): ClassifiedCat[] => {
    let cached = courseImproveCache.get(name);
    if (!cached) {
      cached = classify(courseImproveTexts.get(name) ?? [], IMPROVE_CATS);
      courseImproveCache.set(name, cached);
    }
    return cached;
  };

  // ── 척도 ──
  const scales = stats.scales;
  const scored = scales.filter((s) => s.count > 0);
  const minScale =
    scored.length > 0
      ? scored.reduce((m, s) => (s.avg < m.avg ? s : m), scored[0])
      : null;

  // ── 강좌 행 조립 ──
  const topSet = new Set(pickTopCourses(courses).map((c) => c.name));
  const toRow = (c: CourseBreakdown, isTop: boolean): CourseRow => {
    const ci = courseImprove(c.name);
    return {
      name: c.name,
      professor: c.professor,
      dayNight: c.dayNight,
      total: c.total,
      overallAvg: c.overallAvg,
      core: {
        overall: courseAvgOf(c, CORE_CODES.overall),
        retake: courseAvgOf(c, CORE_CODES.retake),
        recommend: courseAvgOf(c, CORE_CODES.recommend),
        env: courseAvgOf(c, CORE_CODES.env),
      },
      manageDirection: isTop
        ? topManageDirectionOf(c.name)
        : manageDirectionOf(c, ci),
      inspectionPoints: inspectionPointsOf(ci),
      tag: isTop
        ? "우수·확대"
        : c.total < 3
          ? "표본 작음"
          : manageDirectionOf(c, ci),
      smallSample: c.total < 5,
    };
  };

  const topCourses = pickTopCourses(courses).map((c) => toRow(c, true));
  const reviewCourses = pickReviewCourses(courses).map((c) => toRow(c, false));
  const allCourseRows = [...courses]
    .filter((c) => c.name !== "(미지정)")
    .sort((a, b) => b.overallAvg - a.overallAvg)
    .map((c) => toRow(c, topSet.has(c.name)));

  const reopenCount = reviewCourses.filter(
    (r) => r.manageDirection === "개설 재검토",
  ).length;

  // ── 집단 라벨 고정 순서(성별 남→여, 시간대 주간→야간) ──
  stats.byGender = orderByLabels(stats.byGender, GENDER_ORDER);
  stats.byTime = orderByLabels(stats.byTime, DAYNIGHT_ORDER);

  // ── 집단 응답률 ──
  const overallRate = roster && roster.total ? (stats.total / roster.total) * 100 : 0;
  const rateByGender = roster
    ? orderByLabels(buildRates(roster.byGender, stats.byGender), GENDER_ORDER)
    : [];
  const rateByAge = roster ? buildRates(roster.byAgeBand, stats.byAgeBand) : [];

  // 주간/야간 명단 수는 강좌별 수강생 수를 dayNight로 합산해 구한다.
  const courseRows = await prisma.course.findMany({
    where: { surveyId: survey.id },
    select: { dayNight: true, _count: { select: { enrollments: true } } },
  });
  const enrolledByTime = new Map<string, number>();
  for (const c of courseRows) {
    const k = c.dayNight?.trim() || "(미상)";
    enrolledByTime.set(k, (enrolledByTime.get(k) ?? 0) + c._count.enrollments);
  }
  const rateByTime = orderByLabels(
    buildRates(
      [...enrolledByTime.entries()].map(([name, count]) => ({ name, count })),
      stats.byTime,
    ),
    DAYNIGHT_ORDER,
  );

  // 지역은 6개 권역으로 묶어 해석 포인트 표·차트에 쓴다(붙임2는 세분 유지).
  const regionGrouped = roster ? groupRegions(roster.byRegion) : [];

  // ── 집단 해설 ──
  const gapCommentary = {
    gender: groupGapCommentary(stats.byGender, "성별"),
    age: groupGapCommentary(stats.byAgeBand, "연령대"),
    time: groupGapCommentary(stats.byTime, "시간대"),
  };
  const rateCommentary = responseRateCommentary(
    [...rateByGender, ...rateByAge, ...rateByTime],
    overallRate,
  );

  // ── 서술 초안 + 저장본 ──
  const scaleByCode = new Map(scales.map((s) => [s.code, s]));
  const topAgeBand =
    roster && roster.byAgeBand.length
      ? [...roster.byAgeBand].sort((a, b) => b.count - a.count)[0].name
      : null;
  const topPurposes = (stats.choices[0]?.options ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((o) => o.label);

  const draftCtx: DraftContext = {
    overallAvg: stats.overallAvg,
    scale: (code) => {
      const s = scaleByCode.get(code);
      return s ? { avg: s.avg, label: labelOf(s) } : null;
    },
    improveCats,
    satisfyCats,
    reviewCourseCount: reviewCourses.length,
    reopenCount,
    minScale: minScale
      ? { label: labelOf(minScale), avg: minScale.avg, code: minScale.code }
      : null,
    topAgeBand,
    topPurposes,
  };

  const savedNotes = await prisma.reportNote.findMany({
    where: { surveyId: survey.id },
  });
  const savedMap = new Map(savedNotes.map((n) => [n.sectionKey, n]));
  const notes: NoteBundle[] = REPORT_SECTION_KEYS.map((key) => {
    const saved = savedMap.get(key);
    return {
      key,
      draft: buildDraft(key, draftCtx),
      saved: saved
        ? {
            content: saved.content,
            updatedAt: saved.updatedAt.toLocaleDateString("ko-KR", {
              timeZone: "Asia/Seoul",
            }),
          }
        : null,
    };
  });

  return {
    survey: {
      slug: survey.slug,
      title: survey.title,
      startAt: survey.startAt,
      endAt: survey.endAt,
    },
    stats,
    roster,
    overallRate,
    scales,
    minScale,
    topCourses,
    reviewCourses,
    allCourseRows,
    satisfyCats,
    improveCats,
    e3Cats,
    commentCounts: {
      E1: get("E1").length,
      E5: get("E5").length,
      E2: get("E2").length,
      E3: get("E3").length,
      E4: get("E4").length,
    },
    e3Samples: get("E3")
      .filter((t) => t.length >= 6 && t.length <= 80)
      .slice(0, 12),
    rateByGender,
    rateByAge,
    rateByTime,
    regionGrouped,
    gapCommentary,
    rateCommentary,
    notes,
  };
}
