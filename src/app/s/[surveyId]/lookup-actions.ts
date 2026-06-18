"use server";
// 응답자 본인확인 — 이름+연락처로 수강 과목을 조회한다 (응답자용 공개 액션).

import { lookupEnrollments } from "@/lib/enrollment-data";
import type { LookupResult } from "@/lib/survey-types";

export async function lookupAction(
  surveyId: string,
  name: string,
  phone: string,
): Promise<LookupResult> {
  return lookupEnrollments(surveyId, name, phone);
}
