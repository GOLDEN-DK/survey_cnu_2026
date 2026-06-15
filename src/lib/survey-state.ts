// 응답 중간 저장 — sessionStorage에 답변을 보관/복원한다.
// 새로고침·뒤로가기에는 유지되고, 탭/세션 종료 시 자동 소멸한다(공용기기 사생활 보호).

import type { AnswerMap } from "./survey-types";

const answersKey = (surveyId: string) => `survey:answers:${surveyId}`;
const doneKey = (surveyId: string) => `survey:done:${surveyId}`;

export function loadAnswers(surveyId: string): AnswerMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(answersKey(surveyId));
    return raw ? (JSON.parse(raw) as AnswerMap) : {};
  } catch {
    return {};
  }
}

export function saveAnswers(surveyId: string, answers: AnswerMap): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(answersKey(surveyId), JSON.stringify(answers));
  } catch {
    // 저장 실패(용량 초과·프라이빗 모드)는 무시한다.
  }
}

export function clearAnswers(surveyId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(answersKey(surveyId));
  } catch {
    // noop
  }
}

// 완료 여부는 재접속 시에도 안내해야 하므로 localStorage에 1-bit 플래그만 저장한다.
export function markDone(surveyId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(doneKey(surveyId), "1");
  } catch {
    // noop
  }
}

export function isDone(surveyId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(doneKey(surveyId)) === "1";
  } catch {
    return false;
  }
}

export function clearDone(surveyId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(doneKey(surveyId));
  } catch {
    // noop
  }
}
