-- 수강생 인구통계 컬럼(생년월일·주소·이메일) + 응답 스냅샷(생년월일·주소) 추가
ALTER TABLE "enrollment" ADD COLUMN     "birth_date" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "email" TEXT;

ALTER TABLE "response" ADD COLUMN     "respondent_birth" TEXT,
ADD COLUMN     "respondent_address" TEXT;
