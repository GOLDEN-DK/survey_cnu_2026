-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('short_text', 'single_choice', 'multi_choice', 'scale_5', 'long_text');

-- CreateTable
CREATE TABLE "survey" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'draft',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "order_no" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "guide" TEXT,
    "scale_set" TEXT,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order_no" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER,

    CONSTRAINT "option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value_text" TEXT,
    "value_number" INTEGER,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_slug_key" ON "survey"("slug");

-- CreateIndex
CREATE INDEX "question_survey_id_order_no_idx" ON "question"("survey_id", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "question_survey_id_code_key" ON "question"("survey_id", "code");

-- CreateIndex
CREATE INDEX "option_question_id_order_no_idx" ON "option"("question_id", "order_no");

-- CreateIndex
CREATE INDEX "response_survey_id_idx" ON "response"("survey_id");

-- CreateIndex
CREATE INDEX "answer_response_id_idx" ON "answer"("response_id");

-- CreateIndex
CREATE INDEX "answer_question_id_idx" ON "answer"("question_id");

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option" ADD CONSTRAINT "option_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response" ADD CONSTRAINT "response_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
