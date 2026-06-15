# 충남대학교 평생교육원 설문 시스템 (survey_cnu_2026)

시니어 수강생이 모바일에서 쉽게 응답하는 온라인 설문 시스템. 1차 적용 대상은 **2026학년도 1학기 평생교육원 수강생 만족도 조사**(20문항).

기획·설계 문서는 [`기획서.md`](기획서.md), [`docs/design-guide.md`](docs/design-guide.md) 참고.

## 기술 스택

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (시니어 디자인 토큰은 `src/app/globals.css`의 `@theme`)
- **Prisma 6** + **PostgreSQL** (Railway 관리형)
- 응답 저장은 **Server Action**(`src/app/s/[surveyId]/actions.ts`)

## 디렉토리 개요

```
prisma/
  schema.prisma        # survey → question → option → response → answer
  seed.ts              # 만족도 설문 1건 + 20문항 시드 (멱등)
src/
  app/
    s/[surveyId]/      # 응답자 설문 페이지 + 진행 컨트롤러 + 제출 Action
    page.tsx           # 루트 안내
  components/survey/    # Scale5, SingleChoice, MultiChoice, ShortText, LongText 등
  lib/                 # prisma 싱글톤, 타입, 단계 분할, 검증, 중간저장
  constants/survey.ts  # 척도 라벨셋, 안내 문구, 설문 슬러그
```

## 로컬 실행

```bash
# 1) 환경변수: Railway Postgres 서비스의 DATABASE_PUBLIC_URL을 .env의 DATABASE_URL로 설정
cp .env.example .env   # 이후 실제 값 입력

# 2) DB 마이그레이션 + 문항 시드
npx prisma migrate dev
npx tsx prisma/seed.ts

# 3) 개발 서버
npm run dev
# 응답 화면: http://localhost:3000/s/satisfaction-2026-1
```

> 응답기간은 2026-06-22 ~ 2026-06-30으로 시드된다. 그 기간 밖에서는 "응답 기간이 아닙니다" 안내가 표시되는 것이 정상이다.

## 운영 메모

- 시드의 `status`는 로컬 편의상 `open`이다. 실제 운영은 응답기간에 맞춰 관리자가 상태를 관리한다(2차 관리자 기능).
- 개인식별정보는 수집하지 않는다(`response`는 제출 시각·user_agent만 저장).
- **운영 오픈 전, 로컬 검증으로 생성된 테스트 응답을 정리할 것**(현재 응답 1건 존재 가능).

## 2차 예정 (이번 범위 미포함)

관리자 대시보드(정량·정성 집계), Excel/CSV 내보내기, GitHub + Railway 자동 배포, 중복 응답 방지 토큰.
