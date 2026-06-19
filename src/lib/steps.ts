// 설문 단계 분할 — 문항에 존재하는 섹션을 정렬해 한 섹션=한 단계로 구성한다.

import type { QuestionDTO } from "./survey-types";

export const SECTION_TITLES: Record<string, string> = {
  A: "응답자 기본 정보",
  B: "강의·강사",
  C: "교육환경·운영",
  D: "종합 만족·재수강",
  E: "자유의견 (선택)",
};

export type Step = {
  index: number; // 0-based
  sections: string[];
  title: string;
  questions: QuestionDTO[];
};

export function buildSteps(questions: QuestionDTO[]): Step[] {
  // 문항에 실제로 존재하는 섹션을 정렬해 한 섹션=한 단계로 구성한다.
  const sections = [...new Set(questions.map((q) => q.section))].sort();
  return sections
    .map((section, index) => ({
      index,
      sections: [section],
      title: SECTION_TITLES[section] ?? section,
      questions: questions
        .filter((q) => q.section === section)
        .sort((a, b) => a.orderNo - b.orderNo),
    }))
    .filter((step) => step.questions.length > 0);
}
