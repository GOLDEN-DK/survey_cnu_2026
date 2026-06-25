-- 제출 실패 보관 테이블 — 최종 제출이 예외로 실패했을 때 작성 답변(JSON)을 보존(복원·재입력용)
CREATE TABLE "failed_submission" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "enrollment_id" TEXT,
    "respondent_name" TEXT,
    "course_name" TEXT,
    "answers_json" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "failed_submission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "failed_submission_survey_id_idx" ON "failed_submission"("survey_id");
