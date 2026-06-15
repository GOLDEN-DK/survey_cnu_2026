"use client";
// 객관식 단일 선택 — 세로로 쌓은 큰 버튼 (선택한 라벨을 그대로 저장)

import type { OptionDTO } from "@/lib/survey-types";

type Props = {
  options: OptionDTO[];
  value: string | undefined;
  labelledBy: string;
  onChange: (label: string) => void;
};

export function SingleChoice({ options, value, labelledBy, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-3"
    >
      {options.map((o) => {
        const selected = value === o.label;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.label)}
            className={[
              "flex min-h-touch-lg w-full items-center gap-3 rounded-xl border-2 px-5 py-3 text-label transition-colors",
              selected
                ? "border-brand-strong bg-brand font-bold text-on-brand"
                : "border-line bg-bg text-ink hover:border-brand",
            ].join(" ")}
          >
            <span className="flex-1 text-left">{o.label}</span>
            <span
              aria-hidden
              className={`text-2xl ${selected ? "opacity-100" : "opacity-0"}`}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
