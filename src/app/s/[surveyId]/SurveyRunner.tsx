"use client";
// 설문 진행 컨트롤러 — 단계 이동, 중간저장(sessionStorage), 친절한 필수 검증, 제출

import { useActionState, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  SurveyDTO,
  AnswerMap,
  AnswerValue,
  SubmitPayload,
  RespondentContext,
} from "@/lib/survey-types";
import { buildSteps } from "@/lib/steps";
import { findFirstError } from "@/lib/validate";
import {
  loadAnswers,
  saveAnswers,
  clearAnswers,
  markDone,
  isDone,
  clearDone,
} from "@/lib/survey-state";
import { ProgressBar } from "@/components/survey/ProgressBar";
import { NavButtons } from "@/components/survey/NavButtons";
import { QuestionRenderer } from "@/components/survey/QuestionRenderer";
import { submitResponse } from "./actions";

type Props = { survey: SurveyDTO; respondent: RespondentContext | null };

// 입력 요소(단답·장문) 포커스 판별 — 모바일 키보드 표시 중 하단 고정 버튼을 숨기기 위함
const isTextInput = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement &&
  (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

export function SurveyRunner({ survey, respondent }: Props) {
  const router = useRouter();
  const steps = buildSteps(survey.questions);
  // 중간저장·중복 표시는 과목(enrollment)별로 분리한다.
  const storageKey = respondent
    ? `${survey.id}:${respondent.enrollmentId}`
    : survey.id;

  // step 0 = 시작 화면, 1..steps.length = 각 단계
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [typing, setTyping] = useState(false); // 입력 포커스 중(모바일 키보드) 하단 버튼 숨김
  const [state, submitAction, pending] = useActionState(submitResponse, null);

  // 마운트 시 중간저장 복원
  useEffect(() => {
    setAnswers(loadAnswers(storageKey));
    setAlreadyDone(isDone(storageKey));
    setHydrated(true);
  }, [storageKey]);

  // 답변 변경 시 자동 저장
  useEffect(() => {
    if (hydrated) saveAnswers(storageKey, answers);
  }, [answers, hydrated, storageKey]);

  // 제출 결과 처리
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      clearAnswers(storageKey);
      markDone(storageKey);
      router.push(`/s/${survey.slug}/complete`);
    } else if (state.errors) {
      setErrors(state.errors);
    }
  }, [state, router, storageKey, survey.slug]);

  const setAnswer = (code: string, v: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [code]: v }));
    setErrors((prev) => {
      if (!(code in prev)) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  const scrollToError = (code: string) => {
    document
      .getElementById(`q-${code}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = () => {
    const allErr = findFirstError(survey.questions, answers);
    if (allErr) {
      setErrors((prev) => ({ ...prev, [allErr.code]: allErr.message }));
      const idx = steps.findIndex((s) =>
        s.questions.some((q) => q.code === allErr.code),
      );
      if (idx >= 0) setStep(idx + 1);
      window.setTimeout(() => scrollToError(allErr.code), 60);
      return;
    }
    if (!window.confirm("응답을 제출하시겠습니까?")) return;

    const payload: SubmitPayload = {
      surveyId: survey.id,
      respondent: respondent ?? undefined,
      answers: survey.questions.map((q) => {
        const a = answers[q.code] ?? {};
        return {
          code: q.code,
          valueText: a.text,
          valueNumber: a.number,
          multi: a.multi,
        };
      }),
    };
    startTransition(() => submitAction(payload));
  };

  const goNext = () => {
    if (step === 0) {
      setStep(1);
      window.scrollTo({ top: 0 });
      return;
    }
    const current = steps[step - 1];
    const firstErr = findFirstError(current.questions, answers);
    if (firstErr) {
      setErrors((prev) => ({ ...prev, [firstErr.code]: firstErr.message }));
      scrollToError(firstErr.code);
      return;
    }
    if (step < steps.length) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
    } else {
      submit();
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0 });
    }
  };

  // 이미 응답한 경우 (소프트 중복 방지)
  if (hydrated && alreadyDone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
        <p className="text-question font-semibold text-ink">
          이미 이 설문에 응답하셨습니다.
        </p>
        <p className="text-body text-ink-soft">참여해 주셔서 감사합니다.</p>
        <button
          type="button"
          onClick={() => {
            clearDone(storageKey);
            clearAnswers(storageKey);
            setAnswers({});
            setAlreadyDone(false);
            setStep(0);
          }}
          className="min-h-touch rounded-xl border-2 border-line bg-bg px-6 text-label font-semibold text-ink"
        >
          다시 응답하기
        </button>
      </div>
    );
  }

  // 시작 화면
  if (step === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 py-6">
        <h1 className="text-question font-bold text-ink">{survey.title}</h1>
        {respondent && (
          <div className="rounded-xl border-2 border-brand/30 bg-brand/5 p-4">
            <p className="text-help text-ink-soft">선택하신 강좌</p>
            <p className="mt-1 text-label font-bold text-ink">
              {respondent.courseName}
            </p>
            <p className="text-help text-ink-soft">{respondent.professor} 교수</p>
          </div>
        )}
        <p className="text-help text-ink-soft">
          약 3분 정도 걸립니다 · 총 {survey.questions.length}개 문항
        </p>
        <button
          type="button"
          onClick={goNext}
          className="mt-2 min-h-touch-lg w-full rounded-xl bg-brand text-label font-bold text-on-brand"
        >
          설문 시작하기
        </button>
      </div>
    );
  }

  const current = steps[step - 1];
  return (
    <div
      className="flex flex-1 flex-col"
      onFocus={(e) => {
        if (isTextInput(e.target)) setTyping(true);
      }}
      onBlur={(e) => {
        if (isTextInput(e.target) && !isTextInput(e.relatedTarget)) setTyping(false);
      }}
    >
      <ProgressBar current={step} total={steps.length} title={current.title} />
      <div className="flex flex-col gap-4">
        {current.questions.map((q) => (
          <QuestionRenderer
            key={q.code}
            question={q}
            value={answers[q.code]}
            error={errors[q.code]}
            onChange={(v) => setAnswer(q.code, v)}
          />
        ))}
      </div>
      {state && !state.ok && !state.errors && (
        <p role="alert" className="mt-4 text-body font-semibold text-danger">
          ⚠ {state.message}
        </p>
      )}
      {!typing && (
        <NavButtons
          isFirst={false}
          isLast={step === steps.length}
          pending={pending}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}
