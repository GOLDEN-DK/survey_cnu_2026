"use client";
// 하단 이동 버튼 — [이전](보조) / [다음·제출](주 강조), 화면 하단 고정

type Props = {
  isFirst: boolean;
  isLast: boolean;
  pending?: boolean;
  hidden?: boolean; // 모바일 폰에서 입력 중일 때만 숨김(태블릿·데스크탑은 항상 표시)
  onPrev: () => void;
  onNext: () => void;
};

export function NavButtons({
  isFirst,
  isLast,
  pending,
  hidden,
  onPrev,
  onNext,
}: Props) {
  return (
    <div
      className={`sticky bottom-0 z-10 mt-8 ${hidden ? "hidden md:flex" : "flex"} gap-3 border-t border-line bg-surface/95 px-1 py-4 backdrop-blur`}
    >
      {!isFirst && (
        <button
          type="button"
          onClick={onPrev}
          disabled={pending}
          className="min-h-touch flex-1 rounded-xl border-2 border-line bg-bg text-label font-semibold text-ink disabled:opacity-50"
        >
          이전
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="min-h-touch flex-[2] rounded-xl bg-brand text-label font-bold text-on-brand disabled:opacity-60"
      >
        {pending ? "제출 중…" : isLast ? "제출하기" : "다음"}
      </button>
    </div>
  );
}
