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

// 명단 매칭으로 확정된 응답자·과목 컨텍스트 (명단 기반 설문에서만 사용).
// enrollmentId만 서버에서 신뢰하고, 나머지(이름/전화/성별/과목)는 제출 시 서버가 재조회해 저장한다.
export type RespondentContext = {
  enrollmentId: string;
  courseName: string; // 시작 화면 표시용
  professor: string; // 시작 화면 표시용
  name: string; // 시작 화면 "○○○님" 표시용
};

// 본인확인 조회 결과 — IdentityGate(클라이언트)와 lookup 액션이 공유
export type LookupCourse = {
  enrollmentId: string;
  courseId: string;
  courseName: string;
  professor: string;
  schedule: string | null;
  responded: boolean; // 이미 이 과목에 응답함 → 재응답 차단
};

export type LookupResult =
  | { found: true; name: string; courses: LookupCourse[] }
  | { found: false };

// Server Action 제출 페이로드
export type SubmitPayload = {
  surveyId: string;
  respondent?: RespondentContext; // 명단 기반 설문이면 필수
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
