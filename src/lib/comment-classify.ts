// 자유의견 키워드 분류 — 무의미 응답을 걸러내고 만족/개선 유형으로 나눈다(순수 함수, prisma 비의존).
// prisma/_report-comments.ts의 1회성 로직을 보고서 페이지에서도 재사용하도록 공통 모듈로 추출했다.

// 의미 없는 응답(무응답·단순 부정/긍정 한 단어)
export const MEANINGLESS =
  /^(없음|없습니다|없다|없어요|없으|무|특별히\s*없|딱히\s*없|x+|X+|[.\-ㅡ~]+|글쎄|모름|좋음|좋아요|좋았어요|만족|만족합니다|good|굿|없슴|업음|없읍니다)\s*[.!]*$/;

export type CommentCat = { name: string; kw: RegExp };

// 개선/불만 유형 (E5 불만족 + E2 개선) — 중복 분류 허용
export const IMPROVE_CATS: CommentCat[] = [
  {
    name: "강의실·기자재·시설 환경",
    kw: /강의실|기자재|마이크|이젤|의자|책상|빔|프로젝터|스크린|냉난방|에어컨|난방|온도|덥|추웠|추워|청결|화장실|PC|컴퓨터|노트북|네트워크|와이?파이|wi-?fi|인터넷|음향|스피커|소리|시설|환경|공간|조명|좁/i,
  },
  {
    name: "강좌 구성·진도·수준 조정",
    kw: /진도|난이도|수준|커리큘럼|구성|심화|기초|초급|중급|고급|교재|교안|자료|수업\s*시간|시간이|분량|속도|진행\s*속도|반\s*편성|레벨/i,
  },
  { name: "주차·출입·정산", kw: /주차|출차|정산|차량|주차장/i },
  {
    name: "강사·수업 운영·관리",
    kw: /강사|교수|선생|강의자|보강|휴강|결강|출석|지각|대강|결석/i,
  },
  {
    name: "수강신청·결제·홈페이지·행정",
    kw: /홈페이지|홈페|사이트|수강\s*신청|신청|결제|환불|등록|접수|안내|공지|문자|행정|민원|전화\s*연결/i,
  },
  {
    name: "강좌 개설·운영방식 수요",
    kw: /개설|야간|주말|토요일|일요일|평일|온라인|비대면|연속|직장인|추가\s*개설|개강|시간대|기간\s*연장|연장/i,
  },
];

// 개설 희망(E3) 유형 — 어떤 분야/운영방식 강좌를 원하는지 중복 분류
export const E3_CATS: CommentCat[] = [
  {
    name: "AI·디지털",
    kw: /AI|인공지능|디지털|컴퓨터|스마트폰|유튜브|영상|canva|캔바|코딩|프로그램|엑셀|chatgpt|gpt/i,
  },
  {
    name: "어학",
    kw: /영어|일본어|일어|중국어|중국문화|외국어|회화|어학|스페인|프랑스|독일어/i,
  },
  {
    name: "미술·공예·캘리",
    kw: /미술|그림|그리기|드로잉|스케치|수채|유화|색연필|캘리|서예|공예|도예|민화|한국화|보태니컬|일러스트|캔들|가죽/i,
  },
  {
    name: "음악·악기",
    kw: /음악|악기|기타|피아노|우쿨렐레|하모니카|노래|가곡|성악|드럼|색소폰|난타|오카리나/i,
  },
  {
    name: "건강·운동",
    kw: /요가|필라테스|운동|건강|체조|댄스|스트레칭|태극권|걷기|등산|골프|재활|근력|라인댄스/i,
  },
  {
    name: "인문·글쓰기·상담",
    kw: /인문|글쓰기|문학|시창작|시낭송|수필|역사|철학|심리|상담|사주|명리|타로|명상|스토리|책출간|자서전/i,
  },
  {
    name: "운영방식(야간·주말·방학·심화)",
    kw: /야간|저녁|주말|토요일|일요일|방학|연속|심화|중급|고급|단계|시간대|연장|오전|오후/i,
  },
];

// 만족 유형 (E1) — 중복 분류 허용
export const SATISFY_CATS: CommentCat[] = [
  {
    name: "강사 전문성·열정·준비",
    kw: /전문|열정|친절|성실|준비|열심|최고|훌륭|실력|박식|꼼꼼|정성/i,
  },
  {
    name: "강의 유익성·실무 활용",
    kw: /유익|실무|실습|도움|활용|배울|배워|유용|실생활|적용|응용|체험|현장/i,
  },
  {
    name: "수업 분위기·즐거움",
    kw: /분위기|즐겁|즐거|재미|재밌|편안|활기|행복|화목|웃음|화기애애|소통\s*분위기/i,
  },
  {
    name: "소통·피드백·눈높이",
    kw: /소통|피드백|질문|설명|눈높이|이해|개별|세심|친근|응대|질의/i,
  },
];

// 무응답·단순 한 단어 등 분석 가치가 없는 텍스트를 걸러낸다.
export function isMeaningful(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && !MEANINGLESS.test(t);
}

export type ClassifiedCat = { name: string; count: number; samples: string[] };

// 유효 텍스트 목록을 카테고리별 건수·대표의견으로 분류한다(대표의견 후보는 12~90자).
export function classify(texts: string[], cats: CommentCat[]): ClassifiedCat[] {
  const counts = new Map<string, number>();
  const samples = new Map<string, string[]>();
  for (const t of texts) {
    for (const c of cats) {
      if (c.kw.test(t)) {
        counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
        const arr = samples.get(c.name) ?? [];
        if (arr.length < 8 && t.length >= 12 && t.length <= 90) arr.push(t);
        samples.set(c.name, arr);
      }
    }
  }
  return cats.map((c) => ({
    name: c.name,
    count: counts.get(c.name) ?? 0,
    samples: samples.get(c.name) ?? [],
  }));
}
