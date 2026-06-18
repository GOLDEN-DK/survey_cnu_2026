// 만족도 설문의 공유 상수 — 척도 라벨셋, 안내 문구, 설문 슬러그 (응답 화면과 시드가 공유)

export const SURVEY_SLUG = "satisfaction-2026-1";

export const SURVEY_TITLE = "2026학년도 1학기 평생교육원 수강생 만족도 조사";

export type ScaleSet = "satisfaction" | "intention";

export type ScaleOption = { value: number; label: string; emoji: string };

// 5점 척도 라벨셋. value는 1~5로 고정, 화면에서는 5(위)→1(아래) 순으로 표시한다.
export const SCALE_LABELS: Record<ScaleSet, ScaleOption[]> = {
  satisfaction: [
    { value: 1, label: "매우 불만족", emoji: "😟" },
    { value: 2, label: "불만족", emoji: "🙁" },
    { value: 3, label: "보통", emoji: "😐" },
    { value: 4, label: "만족", emoji: "🙂" },
    { value: 5, label: "매우 만족", emoji: "😀" },
  ],
  intention: [
    { value: 1, label: "전혀 없음", emoji: "😟" },
    { value: 2, label: "별로 없음", emoji: "🙁" },
    { value: 3, label: "보통", emoji: "😐" },
    { value: 4, label: "약간 있음", emoji: "🙂" },
    { value: 5, label: "매우 있음", emoji: "😀" },
  ],
};

export const START_TEXT =
  "안녕하십니까? 충남대학교 평생교육원입니다. 2026학년도 1학기 수강생 여러분의 의견을 듣고, 교육과정 운영 개선 및 2학기 교육계획 수립에 반영하고자 만족도 조사를 실시합니다. 응답 결과는 교육과정 개선을 위한 통계 목적으로만 활용됩니다. 본인 확인을 위해 입력하신 성함·연락처는 응답 관리 용도로만 사용되며 외부에 제공하지 않습니다. 잠시만 시간을 내어 참여해 주시면 감사하겠습니다.";

export const COMPLETE_TEXT =
  "소중한 의견을 남겨주셔서 감사합니다. 응답 내용은 2026학년도 1학기 성과 점검 및 2학기 교육과정 개선에 적극 활용하겠습니다.";
