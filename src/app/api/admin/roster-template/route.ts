// 명단 업로드용 빈 템플릿(.xlsx) 다운로드 — ?type=enrollment(수강생) | course(설강과목)
// /api/admin은 middleware 매처 밖이므로 여기서 세션을 직접 검증한다.

import { type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TEMPLATES = {
  enrollment: {
    sheet: "수강생명단",
    file: "수강생명단_템플릿",
    header: ["과목명", "성명", "ID", "성별", "핸드폰번호", "생년월일", "주소", "이메일"],
    example: [
      "행복한 미술교실",
      "홍길동",
      "honggd",
      "남",
      "010-1234-5678",
      "19700101",
      "대전광역시 유성구 대학로 99",
      "hong@example.com",
    ],
  },
  course: {
    sheet: "설강과목",
    file: "설강과목_템플릿",
    header: ["번호", "교과목명", "주/야", "담당교수 : 강의시간", "수강료"],
    example: ["1", "행복한 미술교실", "주간", "홍길동 : \n(월10:00~12:00)", "200000"],
  },
} as const;

export async function GET(req: NextRequest) {
  if (!(await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const type =
    req.nextUrl.searchParams.get("type") === "course" ? "course" : "enrollment";
  const t = TEMPLATES[type];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t.sheet);
  ws.addRow([...t.header]);
  ws.getRow(1).font = { bold: true };
  ws.addRow([...t.example]);
  t.header.forEach((_, i) => {
    ws.getColumn(i + 1).width = 22;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fname = encodeURIComponent(`${t.file}.xlsx`);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${fname}`,
    },
  });
}
