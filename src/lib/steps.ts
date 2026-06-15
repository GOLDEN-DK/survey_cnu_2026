// 설문 단계 분할 — 섹션 A~E를 5단계로 묶는다. 분할을 바꾸려면 STEP_GROUPS만 수정한다.

import type { QuestionDTO } from "./survey-types";

// 한 단계에 포함할 섹션 묶음. 예: B를 둘로 나누려면 [["A"],["B","B"]]가 아니라 별도 키 도입.
export const STEP_GROUPS: string[][] = [["A"], ["B"], ["C"], ["D"], ["E"]];

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
  return STEP_GROUPS.map((sections, index) => ({
    index,
    sections,
    title: sections.map((s) => SECTION_TITLES[s] ?? s).join(" / "),
    questions: questions
      .filter((q) => sections.includes(q.section))
      .sort((a, b) => a.orderNo - b.orderNo),
  })).filter((step) => step.questions.length > 0);
}

export const TOTAL_STEPS = STEP_GROUPS.length;
