"use client";
// 단답형 입력 — 큰 입력칸 (높이 56px+, 큰 글씨, 예시 placeholder)

type Props = {
  id: string;
  value: string;
  placeholder?: string;
  labelledBy: string;
  onChange: (value: string) => void;
};

export function ShortText({
  id,
  value,
  placeholder,
  labelledBy,
  onChange,
}: Props) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      aria-labelledby={labelledBy}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-touch w-full rounded-xl border-2 border-line bg-bg px-4 py-3 text-body text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none"
    />
  );
}
