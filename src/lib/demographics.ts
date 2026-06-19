// 생년월일·주소 원본을 통계용 연령대·지역 라벨로 변환하는 순수 유틸 (서버/클라 공용).

export const AGE_BAND_ORDER = [
  "30세 미만",
  "30대",
  "40대",
  "50대",
  "60대",
  "70세 이상",
  "미상",
] as const;

// 대전 자치구 (유성구·서구·중구·대덕구·동구). 유성구를 먼저 검사해 서구 오분류를 막는다.
const DAEJEON_GU = ["유성", "서", "중", "대덕", "동"] as const;

export const REGION_ORDER = [
  "대전 유성구",
  "대전 서구",
  "대전 중구",
  "대전 대덕구",
  "대전 동구",
  "대전 기타",
  "세종",
  "충남",
  "충북",
  "서울",
  "경기",
  "광주",
  "부산",
  "전북",
  "전남",
  "기타",
  "미상",
] as const;

// YYYYMMDD → 연령대(연 나이 = 기준연도 − 출생연도). 유효하지 않으면 "미상".
export function ageBandOf(
  birth: string | null | undefined,
  baseYear = 2026,
): string {
  const digits = (birth ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "미상";
  const year = Number(digits.slice(0, 4));
  if (!year) return "미상";
  const age = baseYear - year;
  if (age < 0 || age > 120) return "미상";
  if (age < 30) return "30세 미만";
  if (age < 40) return "30대";
  if (age < 50) return "40대";
  if (age < 60) return "50대";
  if (age < 70) return "60대";
  return "70세 이상";
}

// 주소 원본 → 지역 라벨. 대전은 구 단위로 세분하고, 그 외 시도는 표기를 정규화한다.
// (대전광역시 / 대전광역시시(오타) / 대전, 충청남도 / 충남 등 혼용을 흡수)
export function regionOf(address: string | null | undefined): string {
  const a = (address ?? "").trim();
  if (!a) return "미상";
  if (a.startsWith("대전")) {
    for (const g of DAEJEON_GU) {
      if (a.includes(`${g}구`)) return `대전 ${g}구`;
    }
    return "대전 기타";
  }
  if (a.startsWith("세종")) return "세종";
  if (a.startsWith("충청남도") || a.startsWith("충남")) return "충남";
  if (a.startsWith("충청북도") || a.startsWith("충북")) return "충북";
  if (a.startsWith("서울")) return "서울";
  if (a.startsWith("경기")) return "경기";
  if (a.startsWith("광주")) return "광주";
  if (a.startsWith("부산")) return "부산";
  if (a.startsWith("전북") || a.startsWith("전라북도")) return "전북";
  if (a.startsWith("전라남도") || a.startsWith("전남")) return "전남";
  return "기타";
}
