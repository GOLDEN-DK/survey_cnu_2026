"use server";
// 관리자 설문 일정·공개 상태 설정 — 세션 재검증 후 survey의 기간/상태를 갱신한다.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ScheduleState = { ok: boolean; message: string } | null;

const STATUSES = ["draft", "open", "closed"] as const;
type Status = (typeof STATUSES)[number];

async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) throw new Error("Unauthorized");
}

export async function updateSchedule(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const startStr = String(formData.get("startAt") ?? "");
  const endStr = String(formData.get("endAt") ?? "");

  const status = STATUSES.find((s) => s === rawStatus);
  if (!status) {
    return { ok: false, message: "공개 상태 값이 올바르지 않습니다." };
  }

  // date 입력(YYYY-MM-DD)을 KST 기준 시작 00:00 / 종료 23:59:59로 저장한다.
  const startAt = startStr ? new Date(`${startStr}T00:00:00+09:00`) : null;
  const endAt = endStr ? new Date(`${endStr}T23:59:59+09:00`) : null;
  if (startAt && Number.isNaN(startAt.getTime())) {
    return { ok: false, message: "시작일 형식이 올바르지 않습니다." };
  }
  if (endAt && Number.isNaN(endAt.getTime())) {
    return { ok: false, message: "종료일 형식이 올바르지 않습니다." };
  }
  if (startAt && endAt && startAt > endAt) {
    return { ok: false, message: "시작일이 종료일보다 늦을 수 없습니다." };
  }

  await prisma.survey.update({
    where: { slug },
    data: { status: status as Status, startAt, endAt },
  });

  revalidatePath(`/admin/s/${slug}/settings`);
  revalidatePath(`/s/${slug}`);
  return { ok: true, message: "설문 일정을 저장했습니다." };
}
