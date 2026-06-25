// 관리자 명단 관리 — 설문별 설강과목·수강생 업로드 + 현재 등록 현황

import { prisma } from "@/lib/prisma";
import { getSurveyBySlug } from "@/lib/survey-data";
import { UploadForms } from "./UploadForms";
import { RosterList } from "./RosterList";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
    </div>
  );
}

export default async function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);

  // 제출 실패 기록이 있는 enrollment(아직 미완료) — 명단에 '제출 실패'로 표시
  const failedSet = survey
    ? new Set(
        (
          await prisma.failedSubmission.findMany({
            where: { surveyId: survey.id, enrollmentId: { not: null } },
            select: { enrollmentId: true },
          })
        ).map((f) => f.enrollmentId as string),
      )
    : new Set<string>();

  const roster = survey
    ? (
        await prisma.enrollment.findMany({
          where: { surveyId: survey.id },
          include: { course: { select: { name: true, professor: true } } },
          orderBy: [{ course: { orderNo: "asc" } }, { name: "asc" }],
        })
      ).map((e) => ({
        id: e.id,
        name: e.name,
        phone: e.phone,
        gender: e.gender,
        courseName: e.course.name,
        professor: e.course.professor,
        responded: e.respondedAt != null,
        failed: e.respondedAt == null && failedSet.has(e.id),
      }))
    : [];

  const stats = {
    enrollments: roster.length,
    responded: roster.filter((r) => r.responded).length,
    failed: roster.filter((r) => r.failed).length,
  };

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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="등록된 수강생" value={stats.enrollments} />
        <StatCard label="응답 완료" value={stats.responded} />
        <StatCard
          label="미응답"
          value={stats.enrollments - stats.responded - stats.failed}
        />
        <StatCard label="제출 실패" value={stats.failed} />
      </section>

      <section>
        <UploadForms slug={slug} />
      </section>

      <section>
        <RosterList slug={slug} roster={roster} />
      </section>

      <p className="text-sm text-ink-soft">
        업로드 후에는 응답자가 <code className="rounded bg-surface px-1">/s/{slug}</code>{" "}
        에서 이름·휴대폰 번호로 본인 확인 후 수강 강좌를 선택해 응답합니다.
      </p>
    </div>
  );
}
