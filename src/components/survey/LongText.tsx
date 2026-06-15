"use client";
// 장문형 입력 — 큰 텍스트 영역 (선택 사항)

type Props = {
  id: string;
  value: string;
  placeholder?: string;
  labelledBy: string;
  onChange: (value: string) => void;
};

export function LongText({
  id,
  value,
  placeholder,
  labelledBy,
  onChange,
}: Props) {
  return (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      rows={4}
      aria-labelledby={labelledBy}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border-2 border-line bg-bg px-4 py-3 text-body text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none"
    />
  );
}
