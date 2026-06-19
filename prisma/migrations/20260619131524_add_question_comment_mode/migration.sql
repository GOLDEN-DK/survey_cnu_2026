-- 척도 문항 아래 인라인 의견란 노출 옵션(comment_mode) 추가
ALTER TABLE "question" ADD COLUMN "comment_mode" BOOLEAN NOT NULL DEFAULT false;
