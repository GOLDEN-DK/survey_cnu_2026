// 결과보고서 규칙 — 문항 라벨·핵심코드 매핑, 강좌 선별·관리방향, 인구 해석·집단 해설(순수 함수, prisma 비의존).

import type { CourseBreakdown, GroupStat, DistItem } from "./admin-stats";
import type { ClassifiedCat } from "./comment-classify";

// 문항 코드 → 보고서 표기용 축약 라벨 (prisma/_report-build.ts와 동일 기준)
export const REPORT_LABELS: Record<string, string> = {
  B1: "강의내용 부합",
  B2: "난이도·진도",
  B3: "강사 전문성",
  B4: "설명·소통·피드백",
  B5: "교재·자료·활동",
  B6: "수업 준비",
  C1: "교육환경",
  C2: "행정서비스",
  C3: "운영방식",
  D1: "수강료 대비",
  D2: "전반 만족",
  D3: "재수강 의향",
  D4: "추천 의향",
};

// 보고서에서 개별로 조명하는 핵심 지표 코드
export const CORE_CODES = {
  overall: "D2",
  retake: "D3",
  recommend: "D4",
  env: "C1",
  expertise: "B3",
  prep: "B6",
} as const;

// 문항 부재 시에도 깨지지 않도록 방어 렌더 — 라벨 맵에 없으면 원문 앞부분으로 대체.
export function labelOf(s: { code: string; text: string }): string {
  return REPORT_LABELS[s.code] ?? s.text.slice(0, 14);
}

// 강좌 척도에서 특정 코드의 평균을 뽑는다(문항 부재/무응답 시 null).
export function courseAvgOf(c: CourseBreakdown, code: string): number | null {
  const s = c.scales.find((x) => x.code === code);
  return s && s.count > 0 ? s.avg : null;
}

// 우수 강좌 — 응답 5명 이상, 전체 평균 내림차순 상위 N.
export function pickTopCourses(
  courses: CourseBreakdown[],
  limit = 10,
): CourseBreakdown[] {
  return courses
    .filter((c) => c.total >= 5 && c.name !== "(미지정)")
    .sort((a, b) => b.overallAvg - a.overallAvg)
    .slice(0, limit);
}

// 점검 필요 강좌 — 응답 3명 이상, 전체 평균 오름차순 하위 N.
export function pickReviewCourses(
  courses: CourseBreakdown[],
  limit = 10,
): CourseBreakdown[] {
  return courses
    .filter((c) => c.total >= 3 && c.name !== "(미지정)")
    .sort((a, b) => a.overallAvg - b.overallAvg)
    .slice(0, limit);
}

// 우수 강좌 관리방향 — 강좌명 키워드 first-match(운영 참고 문구).
export function topManageDirectionOf(name: string): string {
  if (/미술|그리|스케치|수채|색연필|캘리|유화|아크릴|한국화|드로잉|민화|문인화|소묘/.test(name))
    return "미술실·이젤 확보 후 유지·분반 검토";
  if (/수필|시창작|글쓰기|스토리|책|창작|낭송|인문|명상/.test(name))
    return "심화·작품 발표 연계 검토";
  if (/필라테스|걷기|운동|건강|요가|댄스|태극권|근감소|재활|명상/.test(name))
    return "건강관리 수요와 연계해 유지";
  if (/여행|사진|힐링|차와|문화|명리|타로|사주/.test(name))
    return "우수 운영방식 유지·확대 검토";
  return "동일 운영방식 유지, 수요 시 분반 검토";
}

// 점검 강좌 관리방향 4분류 — 전반(D2)·환경(C1) 평균과 강좌별 개선의견 유무로 판정.
export function manageDirectionOf(
  c: CourseBreakdown,
  courseImprove: ClassifiedCat[],
): string {
  const overall = courseAvgOf(c, CORE_CODES.overall);
  const env = courseAvgOf(c, CORE_CODES.env);
  const hasAnyImprove = courseImprove.some((x) => x.count > 0);
  const hasEnvImprove = courseImprove.some(
    (x) => x.name === "강의실·기자재·시설 환경" && x.count > 0,
  );
  if (overall != null && overall < 4.0) return "개설 재검토";
  if (env != null && env < 4.0 && hasEnvImprove) return "환경 보완 후 유지";
  if (hasAnyImprove) return "보완 후 유지";
  return "유지·모니터링";
}

// 개선의견 카테고리 → 점검사항 축약 표기
const INSPECT_SHORT: Record<string, string> = {
  "강의실·기자재·시설 환경": "강의실·실습환경",
  "강사·수업 운영·관리": "강의방식·수업준비",
  "주차·출입·정산": "주차·행정",
  "수강신청·결제·홈페이지·행정": "주차·행정",
  "강좌 구성·진도·수준 조정": "구성·진도·수준",
  "강좌 개설·운영방식 수요": "운영방식",
};

// 강좌별 개선의견 유형을 축약 점검사항으로 요약(없으면 모니터링 문구).
export function inspectionPointsOf(courseImprove: ClassifiedCat[]): string {
  const names = courseImprove
    .filter((x) => x.count > 0)
    .map((x) => INSPECT_SHORT[x.name] ?? x.name);
  const uniq = [...new Set(names)];
  return uniq.length ? uniq.join("·") : "추가 의견 모니터링";
}

// 성별 분포 → 행별 해석 포인트(최다 성별 비중 55% 이상이면 편중 문구).
export function genderInsights(
  items: DistItem[],
  total: number,
): Record<string, string> {
  const top = [...items].sort((a, b) => b.count - a.count)[0];
  const ratio = top && total ? top.count / total : 0;
  const msg =
    ratio >= 0.55
      ? `${top.name}성 수강생 비중이 높아 취미·자기계발형 강좌 수요와 연계`
      : "성별이 비교적 균형 있게 분포";
  return Object.fromEntries(items.map((it) => [it.name, msg]));
}

// 연령대 분포 → 행별 해석 포인트(상위 2개 밴드 합 50% 이상이면 중장년 친화 문구).
export function ageInsights(
  items: DistItem[],
  total: number,
): Record<string, string> {
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const top2 = sorted.slice(0, 2);
  const top2Sum = top2.reduce((s, x) => s + x.count, 0);
  const focus = total > 0 && top2Sum / total >= 0.5;
  const top2Names = top2.map((x) => x.name).join("·");
  const topSet = new Set(top2.map((x) => x.name));
  const map: Record<string, string> = {};
  for (const it of items) {
    map[it.name] =
      focus && topSet.has(it.name)
        ? `${top2Names} 중심의 중장년 친화 운영 필요`
        : "연령별 수요 참고";
  }
  return map;
}

// 지역 분포 → 행별 해석 포인트(누적 70%까지의 상위 지역은 생활권 중심 문구).
export function regionInsights(
  items: DistItem[],
  total: number,
): Record<string, string> {
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const coreSet = new Set<string>();
  let cum = 0;
  for (const it of sorted) {
    if (cum / (total || 1) < 0.7) {
      coreSet.add(it.name);
      cum += it.count;
    }
  }
  const coreLabel = [...coreSet].slice(0, 2).join("·");
  const map: Record<string, string> = {};
  for (const it of items) {
    map[it.name] = coreSet.has(it.name)
      ? `${coreLabel} 생활권 중심 홍보·편성 참고`
      : "지역 확장 수요 참고";
  }
  return map;
}

// 집단별 만족도 격차 해설 — 표본 10 미만 그룹은 비교에서 제외, gap 0.15 기준 문구.
export function groupGapCommentary(rows: GroupStat[], label: string): string {
  const valid = rows.filter((r) => r.count >= 10);
  const used = valid.length >= 2 ? valid : rows.filter((r) => r.count > 0);
  if (used.length < 2)
    return `${label}별 응답 표본이 적어 비교는 참고용으로만 활용한다.`;
  const sorted = [...used].sort((a, b) => b.avg - a.avg);
  const hi = sorted[0];
  const lo = sorted[sorted.length - 1];
  const gap = hi.avg - lo.avg;
  if (gap < 0.15)
    return `${label} 간 만족도 차이가 크지 않아(최고 ${hi.avg.toFixed(2)} ~ 최저 ${lo.avg.toFixed(2)}) 전 집단에서 고르게 만족하는 것으로 나타났다.`;
  return `${hi.name}(${hi.avg.toFixed(2)}점)가 가장 높고 ${lo.name}(${lo.avg.toFixed(2)}점)가 상대적으로 낮아, ${lo.name} 대상 수요·불편 요인 점검이 필요하다.`;
}

export type RateRow = {
  name: string;
  enrolled: number;
  responded: number;
  rate: number; // 응답률(%)
};

// 집단별 응답률 해설 — 전체 응답률 대비 ±5%p 이상 벗어난(명단 10명 이상) 집단을 짚는다.
export function responseRateCommentary(
  rows: RateRow[],
  overallRate: number,
): string {
  const notable = rows.filter(
    (r) => r.enrolled >= 10 && Math.abs(r.rate - overallRate) >= 5,
  );
  if (!notable.length) return "";
  const parts = notable.map((r) => `${r.name}(${r.rate.toFixed(1)}%)`);
  return `전체 응답률(${overallRate.toFixed(1)}%) 대비 ${parts.join(", ")} 집단의 응답률 편차가 커, 해당 집단 결과 해석 시 대표성에 유의할 필요가 있다.`;
}

// 집단 비교 색(성별·연령대·시간대) — dataviz 검증 통과(blue/aqua/violet).
// "use client"가 아닌 이 모듈에 두어 서버 컴포넌트(page)에서도 실제 값으로 import된다.
export const GROUP_COLORS = {
  gender: "#2a78d6",
  age: "#1baf7a",
  time: "#4a3aa7",
} as const;

// 집단 라벨 고정 순서(표시 일관성) — 성별·시간대는 count 정렬 대신 이 순서로 노출한다.
export const GENDER_ORDER = ["남", "여", "미상", "(미상)"] as const;
export const DAYNIGHT_ORDER = ["주간", "야간", "미상", "(미상)"] as const;

// GroupStat/RateRow류 배열을 고정 라벨 순서로 정렬한다(목록에 없는 라벨은 뒤로).
export function orderByLabels<T extends { name: string }>(
  rows: T[],
  order: readonly string[],
): T[] {
  const idx = (n: string) => {
    const i = order.indexOf(n);
    return i < 0 ? order.length : i;
  };
  return [...rows].sort((a, b) => idx(a.name) - idx(b.name));
}

// 지역 세분 라벨을 보고서 권역 버킷으로 묶는다.
export const REGION_GROUP_ORDER = [
  "대전 유성구",
  "대전 서구",
  "대전 기타(중구·대덕구·동구)",
  "세종",
  "충청권(충남·충북)",
  "기타 지역·미상",
] as const;

function regionBucket(name: string): string {
  if (name === "대전 유성구") return "대전 유성구";
  if (name === "대전 서구") return "대전 서구";
  if (/^대전/.test(name)) return "대전 기타(중구·대덕구·동구)";
  if (name === "세종") return "세종";
  if (name === "충남" || name === "충북") return "충청권(충남·충북)";
  return "기타 지역·미상";
}

// 지역 세분 분포를 6개 권역으로 합산한다(해석 포인트 표·차트용, 붙임2 세분은 유지).
export function groupRegions(items: DistItem[]): DistItem[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const b = regionBucket(it.name);
    map.set(b, (map.get(b) ?? 0) + it.count);
  }
  return REGION_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    name: g,
    count: map.get(g)!,
  }));
}
