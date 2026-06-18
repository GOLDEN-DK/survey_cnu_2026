// 관리자 설문 설정 — 응답 기간·공개 상태 확인 및 변경

import { getSurveyBySlug, getOpenState } from "@/lib/survey-data";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

// 저장된 시각(UTC)을 KST 기준 YYYY-MM-DD로 변환해 date 입력 기본값으로 쓴다.
function toKSTDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

const STATE_LABEL: Record<string, string> = {
  open: "응답 받는 중",
  before: "아직 시작 전 (응답자에게 닫힘)",
  after: "기간 종료됨 (응답자에게 닫힘)",
  closed: "마감됨",
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);
  if (!survey) {
    return <p className="text-ink-soft">설문을 찾을 수 없습니다.</p>;
  }

  const openState = getOpenState(survey);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-1 text-xl font-bold text-ink">설문 설정</h2>
        <p className="text-sm text-ink-soft">
          대상 설문 ·{" "}
          <span className="font-semibold text-ink">{survey.title}</span>
        </p>
      </section>

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="text-sm text-ink-soft">응답자에게 현재</div>
        <div className="mt-1 text-2xl font-bold text-ink">
          {STATE_LABEL[openState] ?? openState}
        </div>
      </div>

      <SettingsForm
        slug={slug}
        status={survey.status}
        startAt={toKSTDate(survey.startAt)}
        endAt={toKSTDate(survey.endAt)}
        description={survey.description ?? ""}
      />
    </div>
  );
}
