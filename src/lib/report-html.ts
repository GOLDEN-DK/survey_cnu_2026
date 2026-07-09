// 결과보고서 서술 노트의 HTML 변환·판별 유틸 (서버·클라이언트 공용 순수 함수, 외부 의존성 없음).

// HTML 특수문자 이스케이프 — 평문을 HTML 본문에 안전하게 삽입한다.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 저장본이 (리치 에디터가 낸) HTML인지 평문(레거시 저장본·자동 초안)인지 판별한다.
export function isHtml(content: string): boolean {
  return /<(p|ul|ol|li|table|thead|tbody|tr|th|td|h[1-6]|br|strong|em|b|i|u|s)\b/i.test(
    content,
  );
}

// 레거시 평문/자동 초안을 기존 렌더 규약 그대로 HTML로 변환한다.
// - 빈 줄 2개(\n{2,})로 문단 분리
// - 블록의 모든 줄이 ·/- 로 시작하면 <ul><li>, 아니면 <p>
// - 블록 내 단일 개행은 공백으로 결합(기존 RenderContent와 동일 결과)
// - 모든 텍스트는 이스케이프한다.
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) return "";
      const isList = lines.every((l) => /^[·\-]/.test(l));
      if (isList) {
        const items = lines
          .map((l) => `<li>${escapeHtml(l.replace(/^[·\-]\s*/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(lines.join(" "))}</p>`;
    })
    .filter((b) => b.length > 0)
    .join("");
}

// 렌더/에디터 seed의 단일 진입점 — HTML이면 그대로, 평문이면 변환한다.
// HTML 분기는 저장 시 서버에서 이미 정화된 값이라는 전제(actions.ts)로 신뢰한다.
export function noteToHtml(content: string): string {
  const trimmed = content?.trim() ?? "";
  if (!trimmed) return "";
  return isHtml(trimmed) ? trimmed : plainTextToHtml(trimmed);
}
