"use client";
// 복수 선택 — 큰 체크 카드 (여러 개 선택 가능, 선택한 라벨 배열을 저장)

import type { OptionDTO } from "@/lib/survey-types";

type Props = {
  options: OptionDTO[];
  value: string[];
  labelledBy: string;
  onChange: (labels: string[]) => void;
};

export function MultiChoice({ options, value, labelledBy, onChange }: Props) {
  const toggle = (label: string) => {
    onChange(
      value.includes(label)
        ? value.filter((v) => v !== label)
        : [...value, label],
    );
  };

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-col gap-3">
      {options.map((o) => {
        const checked = value.includes(o.label);
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => toggle(o.label)}
            className={[
              "flex min-h-touch-lg w-full items-center gap-3 rounded-xl border-2 px-5 py-3 text-label transition-colors",
              checked
                ? "border-brand-strong bg-brand font-bold text-on-brand"
                : "border-line bg-bg text-ink hover:border-brand",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 text-base",
                checked
                  ? "border-on-brand bg-on-brand text-brand"
                  : "border-line",
              ].join(" ")}
            >
              {checked ? "✓" : ""}
            </span>
            <span className="flex-1 text-left">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
