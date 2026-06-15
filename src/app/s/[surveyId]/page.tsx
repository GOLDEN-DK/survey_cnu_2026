// 응답자 설문 페이지 — survey 로드 후 상태/기간을 서버에서 판정하고 진행 화면을 렌더한다.

import { notFound } from "next/navigation";
import {
  getSurveyBySlug,
  toSurveyDTO,
  getOpenState,
} from "@/lib/survey-data";
import { SurveyRunner } from "./SurveyRunner";

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const survey = await getSurveyBySlug(surveyId);
  if (!survey) notFound();

  const openState = getOpenState(survey);

  if (openState !== "open") {
    const message =
      openState === "before"
        ? "아직 응답 기간이 아닙니다."
        : openState === "after"
          ? "응답 기간이 종료되었습니다."
          : "현재 응답을 받지 않습니다.";
    return (
      <main className="mx-auto flex min-h-full max-w-screen-sm flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-question font-bold text-ink">{survey.title}</h1>
        <p className="text-body text-ink-soft">{message}</p>
        {survey.startAt && survey.endAt && (
          <p className="text-help text-ink-soft">
            응답 기간: {formatDate(survey.startAt)} ~ {formatDate(survey.endAt)}
          </p>
        )}
      </main>
    );
  }

  const dto = toSurveyDTO(survey);
  return (
    <main className="mx-auto flex min-h-full max-w-screen-sm flex-col px-4 py-6">
      <SurveyRunner survey={dto} />
    </main>
  );
}
