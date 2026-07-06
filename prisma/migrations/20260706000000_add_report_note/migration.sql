-- 결과보고서 서술 저장 테이블 — 설문×섹션 키별 관리자 수정본 보관(자동 초안 대체)
CREATE TABLE "report_note" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "report_note_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_note_survey_id_section_key_key" ON "report_note"("survey_id", "section_key");

ALTER TABLE "report_note" ADD CONSTRAINT "report_note_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
