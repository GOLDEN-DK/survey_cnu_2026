// 진행 표시 — "전체 N단계 중 K단계" + 막대 (상단 고정)

type Props = {
  current: number; // 1-based
  total: number;
  title: string;
};

export function ProgressBar({ current, total, title }: Props) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-body font-bold text-ink">{title}</span>
        <span className="shrink-0 text-help text-ink-soft">
          전체 {total}단계 중 {current}단계
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
