"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MockTest, MockQuestion } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { QuestionPalette } from "./QuestionPalette";
import { ExamTimer } from "./ExamTimer";
import { ExplanationPanel } from "./ExplanationPanel";
import { submitAnswerAction, toggleReviewAction, finalizeMockAction } from "@/app/actions/mock";
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle,
  AlertTriangle,
  Menu,
  X,
  Send,
} from "lucide-react";

interface TestClientProps {
  mockTest: MockTest;
  initialQuestions: MockQuestion[];
}

export function TestClient({ mockTest, initialQuestions }: TestClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<MockQuestion[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSubmittingTest, startSubmitTransition] = useTransition();
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState<boolean>(false);

  const storageKey = `mockmaster_answers_${mockTest.id}`;

  // Restore answers from localStorage on reload (Reliability & Crash Protection)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<number, "A" | "B" | "C" | "D">;
        setQuestions((prev) =>
          prev.map((item) => {
            const savedAnswer = parsed[item.order_index];
            if (savedAnswer && !item.user_answer) {
              const isCorrect = item.question ? savedAnswer === item.question.correct_answer : null;
              return {
                ...item,
                user_answer: savedAnswer,
                is_correct: isCorrect,
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.warn("Could not read from local storage:", err);
    }
  }, [storageKey]);

  const currentMockQuestion = questions[currentIndex];
  const q = currentMockQuestion?.question;

  const isPracticeMode = mockTest.mode === "practice";
  const hasAnsweredCurrent = Boolean(currentMockQuestion?.user_answer);

  // Handle Option Click
  const handleSelectOption = async (option: "A" | "B" | "C" | "D") => {
    if (isPracticeMode && hasAnsweredCurrent) {
      // In practice mode, lock after first answer to ensure deliberate learning
      return;
    }

    const isCorrect = q ? option === q.correct_answer : false;

    // Optimistic update
    setQuestions((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex
          ? {
              ...item,
              user_answer: option,
              is_correct: isCorrect,
            }
          : item
      )
    );

    // Save to local storage for refresh recovery
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      saved[currentMockQuestion.order_index] = option;
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // local storage not available
    }

    try {
      await submitAnswerAction({
        mockId: mockTest.id,
        orderIndex: currentMockQuestion.order_index,
        selectedOption: option,
      });
    } catch (err) {
      console.error("Error submitting answer to server:", err);
    }
  };

  // Toggle Mark for Review
  const handleToggleReview = async () => {
    const newStatus = !currentMockQuestion.is_marked_for_review;
    setQuestions((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex
          ? { ...item, is_marked_for_review: newStatus }
          : item
      )
    );

    try {
      await toggleReviewAction({
        mockId: mockTest.id,
        orderIndex: currentMockQuestion.order_index,
      });
    } catch (err) {
      console.error("Error toggling review:", err);
    }
  };

  // Finish / Submit Mock Test (Idempotent & Double-submit protected)
  const handleFinalizeMock = () => {
    if (hasSubmitted || isSubmittingTest) return;
    setHasSubmitted(true);

    startSubmitTransition(async () => {
      try {
        await finalizeMockAction(mockTest.id);
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        router.push(`/results/${mockTest.id}`);
      } catch (err) {
        console.error("Error finalizing mock test:", err);
        router.push(`/results/${mockTest.id}`);
      }
    });
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!q) {
    return <div className="p-8 text-center text-slate-500">Question not found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">|</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">
              {mockTest.mode} Mode
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ExamTimer
              initialMinutes={mockTest.time_limit_minutes}
              startedAt={mockTest.started_at}
              onTimeUp={handleFinalizeMock}
            />

            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={hasSubmitted || isSubmittingTest}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{hasSubmitted ? "Submitting..." : "Submit Test"}</span>
            </button>

            {/* Mobile Palette Toggle */}
            <button
              onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Toggle question palette"
            >
              {mobilePaletteOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Warning if 80:20 ratio was adjusted */}
      {mockTest.ratio_warning && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 text-center">
          ⚠️ {mockTest.ratio_warning}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Question & Options Area (Col 1-3) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            {/* Question Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
              <QuestionTypeBadge
                type={q.type}
                sourceYear={q.source_year}
                examName={q.type === "PYQ" ? q.source_paper || "Previous Year" : undefined}
              />

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                  {q.difficulty}
                </span>
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold border transition ${
                    currentMockQuestion.is_marked_for_review
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700"
                      : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  aria-pressed={currentMockQuestion.is_marked_for_review}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      currentMockQuestion.is_marked_for_review
                        ? "fill-amber-500 text-amber-600"
                        : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {currentMockQuestion.is_marked_for_review ? "Marked for Review" : "Mark for Review"}
                  </span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="py-6">
              <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                {q.question_text}
              </div>
            </div>

            {/* Options List with accessibility role & 48px touch targets */}
            <div role="radiogroup" aria-label="Question options" className="space-y-3 pt-2">
              {(["A", "B", "C", "D"] as const).map((optKey) => {
                const optText =
                  optKey === "A"
                    ? q.option_a
                    : optKey === "B"
                    ? q.option_b
                    : optKey === "C"
                    ? q.option_c
                    : q.option_d;

                const isSelected = currentMockQuestion.user_answer === optKey;
                const isCorrectOption = q.correct_answer === optKey;

                let stateClass =
                  "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200";

                if (isPracticeMode && hasAnsweredCurrent) {
                  if (isCorrectOption) {
                    stateClass =
                      "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500";
                  } else if (isSelected && !isCorrectOption) {
                    stateClass =
                      "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500";
                  }
                } else if (isSelected) {
                  stateClass =
                    "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-semibold ring-2 ring-blue-500";
                }

                return (
                  <button
                    key={optKey}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(optKey)}
                    className={`w-full min-h-[48px] p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${stateClass}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {optKey}
                    </span>
                    <span className="text-sm font-normal pt-1 flex-1 leading-snug">
                      {optText}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* In Practice Mode: Immediate Structured Explanation */}
            {isPracticeMode && hasAnsweredCurrent && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <ExplanationPanel
                  explanation={q.explanation}
                  correctAnswer={q.correct_answer}
                  userAnswer={currentMockQuestion.user_answer}
                  type={q.type}
                  sourceYear={q.source_year}
                />
              </div>
            )}

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-3">
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/20"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    disabled={hasSubmitted || isSubmittingTest}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition shadow-sm shadow-emerald-500/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Finish Mock</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar (Col 4, Desktop) */}
        <div className="hidden lg:block lg:col-span-1 sticky top-22">
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            mode={mockTest.mode}
            onSelectIndex={(idx) => setCurrentIndex(idx)}
          />
        </div>
      </div>

      {/* Mobile Slide-Over Drawer for Palette */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-80 bg-white dark:bg-slate-900 h-full p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm">Question Navigation</span>
              <button
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close question palette"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-2">
              <QuestionPalette
                questions={questions}
                currentIndex={currentIndex}
                mode={mockTest.mode}
                onSelectIndex={(idx) => {
                  setCurrentIndex(idx);
                  setMobilePaletteOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit Test Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Submit Mock Test?
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              You have answered{" "}
              <strong className="text-slate-900 dark:text-white">
                {questions.filter((q) => q.user_answer).length}
              </strong>{" "}
              out of{" "}
              <strong className="text-slate-900 dark:text-white">
                {questions.length}
              </strong>{" "}
              questions. Are you sure you want to finalize this test and view your performance analytics?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={hasSubmitted || isSubmittingTest}
                onClick={handleFinalizeMock}
                className="px-5 py-2 min-h-[44px] rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition shadow-sm shadow-blue-500/25"
              >
                {hasSubmitted || isSubmittingTest ? "Calculating Score..." : "Yes, Submit Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
