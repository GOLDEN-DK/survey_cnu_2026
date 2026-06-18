// 관리자 명단 관리 — 설문별 설강과목·수강생 업로드 + 현재 등록 현황

import { prisma } from "@/lib/prisma";
import { getSurveyBySlug } from "@/lib/survey-data";
import { SURVEY_SLUG } from "@/constants/survey";
import { UploadForms } from "./UploadForms";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
    </div>
  );
}

export default async function UploadPage() {
  const survey = await getSurveyBySlug(SURVEY_SLUG);

  const stats = survey
    ? {
        courses: await prisma.course.count({ where: { surveyId: survey.id } }),
        enrollments: await prisma.enrollment.count({
          where: { surveyId: survey.id },
        }),
        responded: await prisma.enrollment.count({
          where: { surveyId: survey.id, respondedAt: { not: null } },
        }),
      }
    : { courses: 0, enrollments: 0, responded: 0 };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-1 text-xl font-bold text-ink">명단 관리</h2>
        <p className="text-sm text-ink-soft">
          대상 설문 ·{" "}
          <span className="font-semibold text-ink">
            {survey?.title ?? "(설문 없음)"}
          </span>
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="등록된 설강과목" value={stats.courses} />
        <StatCard label="등록된 수강생" value={stats.enrollments} />
        <StatCard label="응답 완료" value={stats.responded} />
      </section>

      <section>
        <UploadForms />
      </section>

      <p className="text-sm text-ink-soft">
        업로드 후에는 응답자가 <code className="rounded bg-surface px-1">/s/{SURVEY_SLUG}</code>{" "}
        에서 이름·휴대폰 번호로 본인 확인 후 수강 강좌를 선택해 응답합니다.
      </p>
    </div>
  );
}
