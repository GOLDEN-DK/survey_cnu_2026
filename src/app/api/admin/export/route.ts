// 관리자 데이터 내보내기 — Excel(원자료+문항+집계) 또는 CSV(원자료)
// /api/admin은 middleware 매처 밖이므로 여기서 세션을 직접 검증한다.

import { type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSurveyBySlug } from "@/lib/survey-data";
import { getDashboardStats } from "@/lib/admin-stats";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const format =
    req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const slug = req.nextUrl.searchParams.get("survey") ?? "";

  const survey = await getSurveyBySlug(slug);
  if (!survey) return new Response("Survey not found", { status: 404 });

  const responses = await prisma.response.findMany({
    where: { surveyId: survey.id },
    include: {
      answers: true,
      course: { select: { name: true, professor: true, dayNight: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
  const questions = [...survey.questions].sort((a, b) => a.orderNo - b.orderNo);

  // 원자료 (행=응답). 응답자·강좌 정보 + 문항코드. 복수선택은 콤마로 합친다.
  const header = [
    "번호",
    "제출일시",
    "성함",
    "연락처",
    "성별",
    "강좌",
    "교수",
    "시간대",
    ...questions.map((q) => q.code),
  ];
  const rows: (string | number)[][] = responses.map((r, idx) => {
    const byQ = new Map<string, string[]>();
    for (const a of r.answers) {
      const v = a.valueNumber != null ? String(a.valueNumber) : a.valueText ?? "";
      const arr = byQ.get(a.questionId) ?? [];
      arr.push(v);
      byQ.set(a.questionId, arr);
    }
    return [
      idx + 1,
      r.submittedAt.toISOString().replace("T", " ").slice(0, 19),
      r.respondentName ?? "",
      r.respondentPhone ?? "",
      r.respondentGender ?? "",
      r.course?.name ?? "",
      r.course?.professor ?? "",
      r.course?.dayNight ?? "",
      ...questions.map((q) => (byQ.get(q.id) ?? []).join(", ")),
    ];
  });

  const ts = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      "﻿" +
      [header, ...rows].map((row) => row.map(esc).join(",")).join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="survey_raw_${ts}.csv"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();

  const ws1 = wb.addWorksheet("원자료");
  ws1.addRow(header);
  ws1.getRow(1).font = { bold: true };
  for (const row of rows) ws1.addRow(row);

  const wsQ = wb.addWorksheet("문항");
  wsQ.addRow(["코드", "문항", "유형"]);
  wsQ.getRow(1).font = { bold: true };
  for (const q of questions) wsQ.addRow([q.code, q.text, q.type]);

  const stats = await getDashboardStats(slug);
  const ws2 = wb.addWorksheet("집계");
  ws2.addRow(["총 응답 수", stats?.total ?? 0]);
  ws2.addRow(["전체 만족도 평균", Number((stats?.overallAvg ?? 0).toFixed(2))]);
  ws2.addRow([]);
  const distHeader = ws2.addRow(["문항", "평균", "①", "②", "③", "④", "⑤"]);
  distHeader.font = { bold: true };
  for (const s of stats?.scales ?? []) {
    ws2.addRow([`${s.code} ${s.text}`, Number(s.avg.toFixed(2)), ...s.dist]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="survey_${ts}.xlsx"`,
    },
  });
}
