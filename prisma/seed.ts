// 만족도 설문(2026-1) 기본 시드 — survey 1건 + 표준 문항을 멱등하게 삽입한다.
// 문항 정의는 src/lib/survey-template.ts를 공유한다(새 설문 생성 액션과 동일 소스).
// QUESTIONS에서 빠진 기존 문항(answer·option 포함)은 정리한다. 실행: npx tsx prisma/seed.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { SURVEY_SLUG, SURVEY_TITLE, START_TEXT } from "../src/constants/survey";
import { SATISFACTION_QUESTIONS, buildOptions } from "../src/lib/survey-template";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(
    async (tx) => {
      const survey = await tx.survey.upsert({
        where: { slug: SURVEY_SLUG },
        update: {
          title: SURVEY_TITLE,
          description: START_TEXT,
          status: "open", // 로컬 테스트 편의. 운영 시 관리자가 전환한다.
          startAt: new Date("2026-06-22T00:00:00+09:00"),
          endAt: new Date("2026-06-30T23:59:59+09:00"),
        },
        create: {
          slug: SURVEY_SLUG,
          title: SURVEY_TITLE,
          description: START_TEXT,
          status: "open",
          startAt: new Date("2026-06-22T00:00:00+09:00"),
          endAt: new Date("2026-06-30T23:59:59+09:00"),
        },
      });

      for (let i = 0; i < SATISFACTION_QUESTIONS.length; i++) {
        const q = SATISFACTION_QUESTIONS[i];
        const question = await tx.question.upsert({
          where: { surveyId_code: { surveyId: survey.id, code: q.code } },
          update: {
            section: q.section,
            orderNo: i + 1,
            text: q.text,
            type: q.type,
            required: q.required,
            guide: q.guide ?? null,
            scaleSet: q.scaleSet ?? null,
          },
          create: {
            surveyId: survey.id,
            section: q.section,
            orderNo: i + 1,
            code: q.code,
            text: q.text,
            type: q.type,
            required: q.required,
            guide: q.guide ?? null,
            scaleSet: q.scaleSet ?? null,
          },
        });

        // 선택지는 매번 재구성한다 (라벨/순서 변경을 안전하게 반영).
        await tx.option.deleteMany({ where: { questionId: question.id } });
        const opts = buildOptions(q);
        if (opts.length > 0) {
          await tx.option.createMany({
            data: opts.map((o) => ({ questionId: question.id, ...o })),
          });
        }
      }

      // QUESTIONS에서 빠진 기존 문항(제거된 A1·A2·A3 등)과 응답·선택지를 정리한다.
      const keepCodes = SATISFACTION_QUESTIONS.map((q) => q.code);
      const stale = await tx.question.findMany({
        where: { surveyId: survey.id, code: { notIn: keepCodes } },
        select: { id: true },
      });
      for (const sq of stale) {
        await tx.answer.deleteMany({ where: { questionId: sq.id } });
        await tx.option.deleteMany({ where: { questionId: sq.id } });
        await tx.question.delete({ where: { id: sq.id } });
      }
    },
    { timeout: 30000 },
  );
}

main()
  .then(async () => {
    console.log(`✅ 시드 완료: ${SATISFACTION_QUESTIONS.length}문항 (${SURVEY_SLUG})`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ 시드 실패:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
