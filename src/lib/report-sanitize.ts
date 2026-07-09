// 서술 노트 HTML의 서버측 정화 — 저장 시 허용 태그/속성만 남긴다.
// 서버 전용(sanitize-html은 Node 모듈). 클라이언트 컴포넌트에서 import 금지.

import sanitizeHtml from "sanitize-html";

// 리치 에디터(TipTap)가 낼 수 있는 구조 태그만 허용하고 style/script/on* 는 전부 제거한다.
export function sanitizeNoteHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "colgroup",
      "col",
    ],
    allowedAttributes: {
      table: ["data-density", "data-colgap"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      col: ["span"],
    },
    allowedStyles: {},
    disallowedTagsMode: "discard",
  });
}

// 태그를 제거한 실제 텍스트가 비어 있고 표도 없으면 "빈 내용"으로 간주한다(초안 복귀 판단용).
export function isEmptyNoteHtml(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
  return text === "" && !/<table\b/i.test(html);
}
