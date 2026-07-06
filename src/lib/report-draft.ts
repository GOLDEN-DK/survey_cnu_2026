// 결과보고서 서술 초안 생성 — 정량 결과·자유의견 분류에서 규칙 기반 문단을 만든다(순수 함수).
// 초안은 관리자가 편집해 ReportNote로 저장할 수 있고, 저장본이 없으면 이 초안이 그대로 렌더된다.

// 편집 가능한 서술 섹션 키 — actions·EditableNote와 공유한다.
export const REPORT_SECTION_KEYS = [
  "improve_actions",
  "next_direction",
  "overall_opinion",
] as const;
export type ReportSectionKey = (typeof REPORT_SECTION_KEYS)[number];

export const REPORT_SECTION_TITLES: Record<ReportSectionKey, string> = {
  improve_actions: "불편사항 및 개선 반영 내용",
  next_direction: "2026학년도 2학기 운영 개선방향",
  overall_opinion: "종합 의견",
};

// 초안 생성에 필요한 최소 입력(ReportData를 직접 참조하지 않아 순환 의존을 피한다).
export type DraftContext = {
  overallAvg: number;
  scale: (code: string) => { avg: number; label: string } | null;
  improveCats: { name: string; count: number; samples: string[] }[];
  satisfyCats: { name: string; count: number }[];
  reviewCourseCount: number;
  reopenCount: number; // 개설 재검토로 분류된 강좌 수
  minScale: { label: string; avg: number; code: string } | null;
  topAgeBand: string | null;
  topPurposes: string[];
};

// 카테고리별 개선 방향 기본 문구 (prisma/_report-build.ts 대응 표현 재사용)
const IMPROVE_DIRECTION: Record<string, string> = {
  "강의실·기자재·시설 환경":
    "개강 전 강의실별 마이크·배터리·이젤·PC·네트워크·냉난방 상태를 체크리스트로 사전 점검",
  "강좌 구성·진도·수준 조정":
    "수준별 반 편성·커리큘럼 사전 공지, 자료 제공 방식 보완",
  "주차·출입·정산": "주차 정산 절차 개선 협의 및 안내 정비",
  "강사·수업 운영·관리": "강사 간 우수 운영사례 공유, 수업 준비·소통 방식 보완",
  "수강신청·결제·홈페이지·행정":
    "홈페이지·수강신청·결제·환불 안내를 시스템 개선 과제로 연계",
  "강좌 개설·운영방식 수요": "야간·주말·방학 중 운영과 연속·심화 과정 개설 검토",
};

const f2 = (n: number) => n.toFixed(2);

function draftImproveActions(ctx: DraftContext): string {
  const cats = ctx.improveCats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!cats.length)
    return "접수된 개선 의견이 없어 별도 개선 반영 내용을 두지 않는다.";
  const lines = cats.map((c) => {
    const sample = c.samples[0]
      ? ` 예: “${c.samples[0].replace(/\s+/g, " ").trim().slice(0, 60)}”`
      : "";
    const direction = IMPROVE_DIRECTION[c.name] ?? "운영 계획에 반영해 개선 검토";
    return `· ${c.name} (${c.count}건) — ${direction}.${sample}`;
  });
  return lines.join("\n");
}

function draftNextDirection(ctx: DraftContext): string {
  const env = ctx.scale("C1");
  const lines: string[] = [];
  lines.push(
    "· 우수 강좌 유지·확대 — 만족도가 높은 강좌는 동일 운영방식을 유지하고, 수요가 높은 강좌는 분반·심화반 개설을 검토한다.",
  );
  lines.push(
    `· 점검 강좌 보완 — 점검 필요로 분류된 ${ctx.reviewCourseCount}개 강좌(개설 재검토 ${ctx.reopenCount}개 포함)는 강의계획·진도·자료·소통 방식과 자유의견을 함께 검토한다.`,
  );
  lines.push(
    env
      ? `· 강의환경 개선 — 교육환경(C1)이 ${f2(env.avg)}점으로 가장 낮아, 개강 전 강의실 배정·마이크·이젤·전산장비 사전점검을 정례화한다.`
      : "· 강의환경 개선 — 강좌 특성에 맞는 강의실 배정과 기자재 사전점검을 정례화한다.",
  );
  lines.push(
    "· 행정서비스 개선 — 주차 정산, 홈페이지·수강신청·결제·환불 안내를 정비해 수강 편의와 민원을 함께 개선한다.",
  );
  lines.push(
    ctx.topAgeBand
      ? `· 중장년 친화 운영 — 응답자가 ${ctx.topAgeBand} 중심인 점을 고려해 안내문·문자·현장 응대와 수준별 과정을 강화한다.`
      : "· 중장년 친화 운영 — 수강생 연령 구성을 고려한 안내·수준별 과정 운영을 강화한다.",
  );
  return lines.join("\n");
}

function draftOverallOpinion(ctx: DraftContext): string {
  const b3 = ctx.scale("B3");
  const b6 = ctx.scale("B6");
  const d3 = ctx.scale("D3");
  const strong = [
    b3 && `강사 전문성(${f2(b3.avg)})`,
    b6 && `수업 준비(${f2(b6.avg)})`,
    d3 && `재수강 의향(${f2(d3.avg)})`,
  ]
    .filter(Boolean)
    .join(", ");
  const topImprove = [...ctx.improveCats]
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)[0];

  const p1 = `2026학년도 1학기 만족도 조사 결과, 전체 만족도는 ${f2(ctx.overallAvg)}점으로 높게 나타났으며 ${strong || "교육 품질 항목"}이(가) 우수하게 평가되었다. 이는 평생교육원의 교육 품질과 강좌 운영 신뢰도가 안정적으로 유지되고 있음을 보여준다.`;

  const p2 = ctx.minScale
    ? `다만 ${ctx.minScale.label}(${f2(ctx.minScale.avg)})이(가) 전체 문항 중 가장 낮고, 자유의견에서도 ${topImprove ? topImprove.name : "시설·환경"} 관련 요구가 반복 확인되었다. 따라서 차기 학기에는 해당 영역의 개선을 우선 추진할 필요가 있다.`
    : "자유의견에서 확인된 개선 요구를 차기 학기 운영 준비에 반영할 필요가 있다.";

  const p3 = `응답자는 ${ctx.topAgeBand ?? "중장년"} 비중이 높고 ${
    ctx.topPurposes.length
      ? `${ctx.topPurposes.join("·")} 목적`
      : "취미·자기계발 목적"
  }이 중심으로 나타난 만큼, 중장년·시니어 친화적 운영과 자기계발형 강좌 기획을 병행하면 만족도와 재등록률을 함께 높일 수 있을 것으로 판단된다.`;

  return [p1, p2, p3].join("\n\n");
}

// 섹션 키에 해당하는 규칙 기반 초안 텍스트를 만든다(줄 앞 "·"는 렌더 시 불릿 처리).
export function buildDraft(key: ReportSectionKey, ctx: DraftContext): string {
  switch (key) {
    case "improve_actions":
      return draftImproveActions(ctx);
    case "next_direction":
      return draftNextDirection(ctx);
    case "overall_opinion":
      return draftOverallOpinion(ctx);
  }
}
