import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "충남대학교 평생교육원 만족도 조사",
  description: "2026학년도 1학기 평생교육원 수강생 만족도 조사",
};

// 모바일 우선 + 시니어 확대 허용 (텍스트 줌을 차단하지 않는다)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
