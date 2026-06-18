"use client";
// 응답자 진입 래퍼 — 명단 기반 설문이면 본인확인 게이트를 먼저 거친 뒤 설문 진행 화면으로 넘긴다.

import { useState } from "react";
import type { SurveyDTO, RespondentContext } from "@/lib/survey-types";
import { SurveyRunner } from "./SurveyRunner";
import { IdentityGate } from "./IdentityGate";

type Props = { survey: SurveyDTO; requireIdentity: boolean };

export function SurveyEntry({ survey, requireIdentity }: Props) {
  const [respondent, setRespondent] = useState<RespondentContext | null>(null);

  if (requireIdentity && !respondent) {
    return (
      <IdentityGate
        surveyId={survey.id}
        title={survey.title}
        description={survey.description}
        onSelect={setRespondent}
      />
    );
  }

  return <SurveyRunner survey={survey} respondent={respondent} />;
}
