// 응답 완료 화면 — 큰 감사 메시지 + 체크 아이콘 (추가 조작 불필요)

import { COMPLETE_TEXT } from "@/constants/survey";

export default function CompletePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-screen-sm flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div
        aria-hidden
        className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-5xl text-on-brand"
      >
        ✓
      </div>
      <h1 className="text-question font-bold text-ink">
        응답이 완료되었습니다
      </h1>
      <p className="text-body leading-relaxed text-ink">{COMPLETE_TEXT}</p>
    </main>
  );
}
