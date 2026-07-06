"use client";
// 브라우저 인쇄(PDF 저장) 트리거 버튼 — 인쇄물에는 노출되지 않는다.

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 print:hidden"
    >
      PDF로 저장 · 인쇄
    </button>
  );
}
