// 설문 데이터 로드·DTO 변환·기간 판정 (서버 전용 — prisma 사용)

import { prisma } from "./prisma";
import type { SurveyDTO, QuestionDTO, QuestionType } from "./survey-types";
import type { ScaleSet } from "@/constants/survey";

const includeQuestions = {
  questions: {
    include: { options: { orderBy: { orderNo: "asc" as const } } },
    orderBy: { orderNo: "asc" as const },
  },
};

export function getSurveyBySlug(slug: string) {
  return prisma.survey.findUnique({ where: { slug }, include: includeQuestions });
}

export function getSurveyById(id: string) {
  return prisma.survey.findUnique({ where: { id }, include: includeQuestions });
}

// 관리자 설문 목록 — 응답·강좌·수강생 수를 함께 센다 (최신 생성순).
export function listSurveys() {
  return prisma.survey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { responses: true, courses: true, enrollments: true } },
    },
  });
}

type SurveyWithQuestions = NonNullable<
  Awaited<ReturnType<typeof getSurveyBySlug>>
>;
type QuestionRow = SurveyWithQuestions["questions"][number];

export function toQuestionDTO(q: QuestionRow): QuestionDTO {
  return {
    id: q.id,
    section: q.section,
    orderNo: q.orderNo,
    code: q.code,
    text: q.text,
    type: q.type as QuestionType,
    required: q.required,
    guide: q.guide,
    scaleSet: (q.scaleSet ?? null) as ScaleSet | null,
    options: q.options.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      label: o.label,
      value: o.value,
    })),
  };
}

export function toSurveyDTO(survey: SurveyWithQuestions): SurveyDTO {
  return {
    id: survey.id,
    slug: survey.slug,
    title: survey.title,
    description: survey.description,
    questions: survey.questions.map(toQuestionDTO),
  };
}

export type OpenState = "open" | "before" | "after" | "closed";

export function getOpenState(
  survey: { status: string; startAt: Date | null; endAt: Date | null },
  now: Date = new Date(),
): OpenState {
  if (survey.status === "closed") return "closed";
  if (survey.status === "draft") return "before";
  if (survey.startAt && now < survey.startAt) return "before";
  if (survey.endAt && now > survey.endAt) return "after";
  return "open";
}
