"use server";
// 관리자 문항 편집 — 추가/수정/삭제/순서변경. Server Function은 직접 호출 가능하므로 세션을 재검증한다.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSurveyBySlug } from "@/lib/survey-data";
import { SCALE_LABELS, type ScaleSet } from "@/constants/survey";

export type QuestionState = { ok: boolean; message: string } | null;

const TYPES = [
  "short_text",
  "single_choice",
  "multi_choice",
  "scale_5",
  "long_text",
] as const;
type QType = (typeof TYPES)[number];

async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) throw new Error("Unauthorized");
}

type Parsed = {
  section: string;
  code: string;
  text: string;
  type: QType;
  required: boolean;
  guide: string;
  scaleSet: ScaleSet | null;
  commentMode: boolean;
  choices: string[];
};

// 폼 입력을 검증한다. 유효하면 Parsed, 아니면 안내 메시지(string)를 반환한다.
function parseForm(formData: FormData): Parsed | string {
  const section = String(formData.get("section") ?? "").trim().toUpperCase();
  const code = String(formData.get("code") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const rawType = String(formData.get("type") ?? "");
  const required = formData.get("required") === "on";
  const guide = String(formData.get("guide") ?? "").trim();
  const rawScale = String(formData.get("scaleSet") ?? "");
  const commentMode = formData.get("commentMode") === "on";
  const choices = formData
    .getAll("choice")
    .map((c) => String(c).trim())
    .filter((c) => c.length > 0);

  if (!/^[A-Z]$/.test(section)) return "섹션은 영문 한 글자(A~Z)로 입력해 주세요.";
  if (!/^[A-Za-z0-9]{1,10}$/.test(code))
    return "문항 코드는 영문·숫자 1~10자로 입력해 주세요.";
  if (!text) return "문항 내용을 입력해 주세요.";
  const type = TYPES.find((t) => t === rawType);
  if (!type) return "문항 유형이 올바르지 않습니다.";

  let scaleSet: ScaleSet | null = null;
  if (type === "scale_5") {
    if (rawScale !== "satisfaction" && rawScale !== "intention")
      return "척도 유형(만족도/의향)을 선택해 주세요.";
    scaleSet = rawScale;
  }
  if (
    (type === "single_choice" || type === "multi_choice") &&
    choices.length < 2
  )
    return "객관식 보기를 2개 이상 입력해 주세요.";

  return {
    section,
    code,
    text,
    type,
    required,
    guide,
    scaleSet,
    commentMode,
    choices,
  };
}

// 문항 유형별 보기 행(척도=라벨셋, 객관식=입력 보기). 텍스트형은 빈 배열.
function optionRows(
  p: Parsed,
): { orderNo: number; label: string; value: number | null }[] {
  if (p.type === "scale_5" && p.scaleSet) {
    return SCALE_LABELS[p.scaleSet].map((o) => ({
      orderNo: o.value,
      label: o.label,
      value: o.value,
    }));
  }
  if (p.type === "single_choice" || p.type === "multi_choice") {
    return p.choices.map((label, i) => ({ orderNo: i + 1, label, value: null }));
  }
  return [];
}

export async function createQuestion(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const survey = await getSurveyBySlug(slug);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };

  const p = parseForm(formData);
  if (typeof p === "string") return { ok: false, message: p };

  if (survey.questions.some((q) => q.code === p.code))
    return { ok: false, message: `이미 존재하는 코드입니다: ${p.code}` };

  const maxOrder = survey.questions.reduce((m, q) => Math.max(m, q.orderNo), 0);

  await prisma.$transaction(async (tx) => {
    const q = await tx.question.create({
      data: {
        surveyId: survey.id,
        section: p.section,
        orderNo: maxOrder + 1,
        code: p.code,
        text: p.text,
        type: p.type,
        required: p.required,
        guide: p.guide || null,
        scaleSet: p.scaleSet,
        commentMode: p.type === "scale_5" ? p.commentMode : false,
      },
    });
    const opts = optionRows(p);
    if (opts.length > 0)
      await tx.option.createMany({
        data: opts.map((o) => ({ questionId: q.id, ...o })),
      });
  });

  revalidatePath(`/admin/s/${slug}/questions`);
  revalidatePath(`/s/${slug}`);
  return { ok: true, message: `문항 ${p.code}을(를) 추가했습니다.` };
}

export async function updateQuestion(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const survey = await getSurveyBySlug(slug);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };
  const current = survey.questions.find((q) => q.id === id);
  if (!current) return { ok: false, message: "문항을 찾을 수 없습니다." };

  const p = parseForm(formData);
  if (typeof p === "string") return { ok: false, message: p };

  if (survey.questions.some((q) => q.code === p.code && q.id !== id))
    return { ok: false, message: `이미 존재하는 코드입니다: ${p.code}` };

  // 응답이 있는 문항은 코드·유형 변경을 막는다(기존 답변 해석이 깨짐).
  const answerCount = await prisma.answer.count({ where: { questionId: id } });
  if (answerCount > 0) {
    if (p.code !== current.code)
      return { ok: false, message: "응답이 있는 문항의 코드는 바꿀 수 없습니다." };
    if (p.type !== current.type)
      return { ok: false, message: "응답이 있는 문항의 유형은 바꿀 수 없습니다." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: {
        section: p.section,
        code: p.code,
        text: p.text,
        type: p.type,
        required: p.required,
        guide: p.guide || null,
        scaleSet: p.scaleSet,
        commentMode: p.type === "scale_5" ? p.commentMode : false,
      },
    });
    // 보기 재구성. 답변은 라벨 텍스트/숫자로 저장되어 보기 행 교체에 영향받지 않는다.
    await tx.option.deleteMany({ where: { questionId: id } });
    const opts = optionRows(p);
    if (opts.length > 0)
      await tx.option.createMany({
        data: opts.map((o) => ({ questionId: id, ...o })),
      });
  });

  revalidatePath(`/admin/s/${slug}/questions`);
  revalidatePath(`/s/${slug}`);
  return { ok: true, message: `문항 ${p.code}을(를) 저장했습니다.` };
}

export async function deleteQuestion(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");

  const answerCount = await prisma.answer.count({ where: { questionId: id } });
  if (answerCount > 0)
    return { ok: false, message: "응답이 있는 문항은 삭제할 수 없습니다." };

  try {
    await prisma.question.delete({ where: { id } });
  } catch {
    return { ok: false, message: "문항을 삭제할 수 없습니다." };
  }

  revalidatePath(`/admin/s/${slug}/questions`);
  revalidatePath(`/s/${slug}`);
  return { ok: true, message: "문항을 삭제했습니다." };
}

export async function moveQuestion(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const survey = await getSurveyBySlug(slug);
  if (!survey) return { ok: false, message: "설문을 찾을 수 없습니다." };

  const ordered = [...survey.questions].sort((a, b) => a.orderNo - b.orderNo);
  const idx = ordered.findIndex((q) => q.id === id);
  if (idx < 0) return { ok: false, message: "문항을 찾을 수 없습니다." };
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= ordered.length) return { ok: true, message: "" };

  const a = ordered[idx];
  const b = ordered[swap];
  await prisma.$transaction([
    prisma.question.update({ where: { id: a.id }, data: { orderNo: b.orderNo } }),
    prisma.question.update({ where: { id: b.id }, data: { orderNo: a.orderNo } }),
  ]);

  revalidatePath(`/admin/s/${slug}/questions`);
  revalidatePath(`/s/${slug}`);
  return { ok: true, message: "" };
}
