// 루트 — 1차에서는 간단 안내만 제공한다 (설문은 /s/<슬러그>로 접속).

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-screen-sm flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-question font-bold text-ink">
        충남대학교 평생교육원 설문
      </h1>
      <p className="text-body text-ink-soft">
        문자로 안내받은 링크로 접속해 주세요.
      </p>
    </main>
  );
}
