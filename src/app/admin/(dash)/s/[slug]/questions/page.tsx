// 관리자 문항 편집 — 설문의 모든 문항을 추가/수정/삭제/순서변경한다.

import { getSurveyBySlug, toSurveyDTO } from "@/lib/survey-data";
import { prisma } from "@/lib/prisma";
import { QuestionsEditor } from "./QuestionsEditor";

export const dynamic = "force-dynamic";

export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surveyRow = await getSurveyBySlug(slug);
  if (!surveyRow) {
    return <p className="text-ink-soft">설문을 찾을 수 없습니다.</p>;
  }
  const survey = toSurveyDTO(surveyRow);

  // 문항별 응답 수 — 응답 있는 문항은 유형·코드 변경과 삭제를 막는다.
  const grouped = await prisma.answer.groupBy({
    by: ["questionId"],
    where: { question: { surveyId: surveyRow.id } },
    _count: true,
  });
  const answerCounts: Record<string, number> = {};
  for (const g of grouped) answerCounts[g.questionId] = g._count;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-1 text-xl font-bold text-ink">문항 편집</h2>
        <p className="text-sm text-ink-soft">
          척도 문항은 &lsquo;의견란 달기&rsquo;를 켜면 응답자가 만족·불만족을 고를 때 그
          아래에 의견을 적을 수 있습니다. 응답이 있는 문항은 유형·코드 변경과 삭제가
          제한됩니다.
        </p>
      </section>
      <QuestionsEditor
        slug={slug}
        questions={survey.questions}
        answerCounts={answerCounts}
      />
    </div>
  );
}
