-- AlterTable
ALTER TABLE "response" ADD COLUMN     "course_id" TEXT,
ADD COLUMN     "enrollment_id" TEXT,
ADD COLUMN     "respondent_gender" TEXT,
ADD COLUMN     "respondent_name" TEXT,
ADD COLUMN     "respondent_phone" TEXT;
-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "order_no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "professor" TEXT NOT NULL,
    "schedule" TEXT,
    "day_night" TEXT,
    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "enrollment" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT,
    "responded_at" TIMESTAMP(3),
    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "course_survey_id_order_no_idx" ON "course"("survey_id", "order_no");
-- CreateIndex
CREATE UNIQUE INDEX "course_survey_id_name_key" ON "course"("survey_id", "name");
-- CreateIndex
CREATE INDEX "enrollment_survey_id_name_phone_idx" ON "enrollment"("survey_id", "name", "phone");
-- CreateIndex
CREATE INDEX "enrollment_course_id_idx" ON "enrollment"("course_id");
-- CreateIndex
CREATE UNIQUE INDEX "enrollment_survey_id_course_id_name_phone_key" ON "enrollment"("survey_id", "course_id", "name", "phone");
-- CreateIndex
CREATE UNIQUE INDEX "response_enrollment_id_key" ON "response"("enrollment_id");
-- CreateIndex
CREATE INDEX "response_course_id_idx" ON "response"("course_id");
-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "response" ADD CONSTRAINT "response_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "response" ADD CONSTRAINT "response_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
