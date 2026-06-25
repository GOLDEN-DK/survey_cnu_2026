// 실시간 제출 현황 — 최근 제출(성공·실패)을 JSON으로 반환 (관리자 대시보드 위젯이 주기적으로 폴링)
// /api/admin은 middleware 매처 밖이므로 여기서 세션을 직접 검증한다.

import { type NextRequest } from "next/server";
import { getRecentSubmissions } from "@/lib/admin-stats";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("survey") ?? "";
  const rows = await getRecentSubmissions(slug);
  return Response.json(rows);
}
