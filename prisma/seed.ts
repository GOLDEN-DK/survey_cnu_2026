// 만족도 설문(2026-1) 시드 — survey 1건 + 문항 + 선택지를 멱등하게 삽입한다.
// 강좌명(A1)·시간대(A3)는 명단 본인확인으로 확정되므로 설문 문항에서 제외한다.
// 여러 번 실행해도 중복 없이 최신 내용으로 갱신되며, QUESTIONS에서 빠진 기존 문항은 정리된다.
// 실행: npx tsx prisma/seed.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  SURVEY_SLUG,
  SURVEY_TITLE,
  START_TEXT,
  SCALE_LABELS,
  type ScaleSet,
} from "../src/constants/survey";

const prisma = new PrismaClient();

type QType =
  | "short_text"
  | "single_choice"
  | "multi_choice"
  | "scale_5"
  | "long_text";

type QDef = {
  code: string;
  section: string;
  text: string;
  type: QType;
  required: boolean;
  guide?: string;
  scaleSet?: ScaleSet;
  choices?: string[];
};

const QUESTIONS: QDef[] = [
  // A. 응답자 기본 정보
  // 강좌명·시간대는 명단 본인확인으로 확정, 과정구분(생활교양/전문자격)은 응답자가
  // 알기 어려워 모두 문항에서 제외한다. 수강 목적(A4)만 남긴다.
  {
    code: "A4",
    section: "A",
    type: "multi_choice",
    required: false,
    text: "수강하게 된 주된 목적을 선택해 주세요.",
    guide: "여러 개 선택 가능",
    choices: [
      "취미·여가",
      "건강관리",
      "자기계발",
      "자격취득",
      "재취업·창업",
      "지인추천",
      "기타",
    ],
  },
  // B. 강의·강사 (5점 척도)
  {
    code: "B1",
    section: "B",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "강의 내용은 수강 목적과 기대에 부합했다.",
  },
  {
    code: "B2",
    section: "B",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "강의 난이도와 진도는 적절했다.",
  },
  {
    code: "B3",
    section: "B",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "강사는 해당 분야의 전문성과 준비성을 갖추었다.",
  },
  {
    code: "B4",
    section: "B",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "강사의 설명·소통·피드백은 수업 이해에 도움이 되었다.",
  },
  {
    code: "B5",
    section: "B",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "교재·자료·실습/활동 구성은 학습에 도움이 되었다.",
  },
  // C. 교육환경·운영 (5점 척도)
  {
    code: "C1",
    section: "C",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "강의실·기자재 등 교육환경은 수업에 적절했다.",
  },
  {
    code: "C2",
    section: "C",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "수강신청·등록·안내 등 행정서비스에 만족했다.",
  },
  {
    code: "C3",
    section: "C",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "교육기간·수업시간·운영방식은 적절했다.",
  },
  // D. 종합 만족·재수강 (5점 척도)
  {
    code: "D1",
    section: "D",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "수강료 대비 교육 내용·운영에 만족했다.",
  },
  {
    code: "D2",
    section: "D",
    type: "scale_5",
    required: true,
    scaleSet: "satisfaction",
    text: "전반적으로 이번 학기 강좌에 만족한다.",
  },
  {
    code: "D3",
    section: "D",
    type: "scale_5",
    required: true,
    scaleSet: "intention",
    text: "향후 평생교육원 강좌를 재수강할 의향이 있다.",
  },
  {
    code: "D4",
    section: "D",
    type: "scale_5",
    required: true,
    scaleSet: "intention",
    text: "평생교육원 강좌를 지인에게 추천할 의향이 있다.",
  },
  // E. 자유의견 (장문형, 모두 선택)
  {
    code: "E1",
    section: "E",
    type: "long_text",
    required: false,
    text: "이번 학기 수업에서 가장 만족스러웠던 점은 무엇입니까?",
    guide: "강의 내용, 강사, 분위기, 운영 등 자유롭게 작성",
  },
  {
    code: "E2",
    section: "E",
    type: "long_text",
    required: false,
    text: "개선이 필요하다고 생각되는 점은 무엇입니까?",
    guide: "시설, 시간, 강좌 구성, 안내, 등록 절차 등 자유롭게 작성",
  },
  {
    code: "E3",
    section: "E",
    type: "long_text",
    required: false,
    text: "2026학년도 2학기에 개설되었으면 하는 강좌나 희망 운영방식이 있다면 작성해 주세요.",
    guide: "희망 강좌, 요일·시간대, 온·오프라인 운영방식 등",
  },
  {
    code: "E4",
    section: "E",
    type: "long_text",
    required: false,
    text: "평생교육원에 추가로 전하고 싶은 의견이 있다면 작성해 주세요.",
    guide: "기타 의견",
  },
];

function buildOptions(q: QDef): {
  orderNo: number;
  label: string;
  value: number | null;
}[] {
  if (q.type === "scale_5" && q.scaleSet) {
    return SCALE_LABELS[q.scaleSet].map((o) => ({
      orderNo: o.value,
      label: o.label,
      value: o.value,
    }));
  }
  if (
    (q.type === "single_choice" || q.type === "multi_choice") &&
    q.choices
  ) {
    return q.choices.map((label, idx) => ({
      orderNo: idx + 1,
      label,
      value: null,
    }));
  }
  return [];
}

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

      for (let i = 0; i < QUESTIONS.length; i++) {
        const q = QUESTIONS[i];
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
    },
    { timeout: 30000 },
  );
}

main()
  .then(async () => {
    console.log(`✅ 시드 완료: ${QUESTIONS.length}문항 (${SURVEY_SLUG})`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ 시드 실패:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
