-- CreateEnum
CREATE TYPE "QuestionVisibility" AS ENUM ('always', 'if_any_unsatisfied');

-- AlterTable
ALTER TABLE "question" ADD COLUMN     "visibility" "QuestionVisibility" NOT NULL DEFAULT 'always';
