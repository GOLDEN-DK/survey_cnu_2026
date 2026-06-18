// 관리자 설문 목록 — 설문 카드(상태·응답·강좌·수강생 수) + 새 설문 생성

import Link from "next/link";
import { listSurveys, getOpenState } from "@/lib/survey-data";
import { NewSurveyForm } from "./NewSurveyForm";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<string, string> = {
  open: "진행 중",
  before: "시작 전",
  after: "종료됨",
  closed: "마감",
};

export default async function SurveyListPage() {
  const surveys = await listSurveys();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-xl font-bold text-ink">설문 목록</h2>
        {surveys.length === 0 ? (
          <p className="text-ink-soft">
            아직 설문이 없습니다. 아래에서 새 설문을 만들어 주세요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {surveys.map((s) => {
              const state = getOpenState(s);
              return (
                <Link
                  key={s.id}
                  href={`/admin/s/${s.slug}`}
                  className="rounded-xl border border-line bg-white p-4 hover:border-brand"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{s.title}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-soft">
                      {STATE_LABEL[state] ?? state}
                    </span>
                    <span className="ml-auto text-xs text-ink-soft">
                      /s/{s.slug}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-ink-soft">
                    <span>응답 {s._count.responses}</span>
                    <span>강좌 {s._count.courses}</span>
                    <span>수강생 {s._count.enrollments}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold text-ink">새 설문 만들기</h3>
        <NewSurveyForm />
      </section>
    </div>
  );
}
