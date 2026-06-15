// 설문 화면·API가 공유하는 직렬화 가능한 DTO와 응답 상태 타입

import type { ScaleSet } from "@/constants/survey";

export type QuestionType =
  | "short_text"
  | "single_choice"
  | "multi_choice"
  | "scale_5"
  | "long_text";

export type OptionDTO = {
  id: string;
  orderNo: number;
  label: string;
  value: number | null;
};

export type QuestionDTO = {
  id: string;
  section: string;
  orderNo: number;
  code: string;
  text: string;
  type: QuestionType;
  required: boolean;
  guide: string | null;
  scaleSet: ScaleSet | null;
  options: OptionDTO[];
};

export type SurveyDTO = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  questions: QuestionDTO[];
};

// 한 문항의 응답값 (유형에 따라 사용하는 필드가 다름)
export type AnswerValue = {
  text?: string; // short_text / long_text / single_choice 라벨
  number?: number; // scale_5 값 (1~5)
  multi?: string[]; // multi_choice 선택 라벨 배열
};

// 문항 code → 응답값
export type AnswerMap = Record<string, AnswerValue>;

// Server Action 제출 페이로드
export type SubmitPayload = {
  surveyId: string;
  answers: Array<{
    code: string;
    valueText?: string;
    valueNumber?: number;
    multi?: string[];
  }>;
};

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; errors?: Record<string, string> };
