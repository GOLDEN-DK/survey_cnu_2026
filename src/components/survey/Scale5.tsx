"use client";
// 5점 척도 입력 — 세로로 쌓은 큰 버튼 5개 (숫자+라벨+표정, 색만으로 의미 전달하지 않음)

import { SCALE_LABELS, type ScaleSet } from "@/constants/survey";

type Props = {
  scaleSet: ScaleSet;
  value: number | undefined;
  labelledBy: string;
  onChange: (value: number) => void;
};

export function Scale5({ scaleSet, value, labelledBy, onChange }: Props) {
  const options = [...SCALE_LABELS[scaleSet]].reverse(); // 5(위) → 1(아래)
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-3"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={[
              "flex min-h-touch-lg w-full items-center gap-4 rounded-xl border-2 px-5 py-3 text-label transition-colors",
              selected
                ? "border-brand-strong bg-brand font-bold text-on-brand"
                : "border-line bg-bg text-ink hover:border-brand",
            ].join(" ")}
          >
            <span aria-hidden className="shrink-0 text-[28px] leading-none">
              {o.emoji}
            </span>
            <span className="min-w-0 flex-1 break-keep text-left">
              <span className="mr-2 font-bold">{o.value}</span>
              {o.label}
            </span>
            <span
              aria-hidden
              className={`shrink-0 text-2xl ${selected ? "opacity-100" : "opacity-0"}`}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
