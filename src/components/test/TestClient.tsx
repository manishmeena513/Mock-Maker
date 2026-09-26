"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MockTest, MockQuestion } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { SaveButton } from "@/components/shared/SaveButton";
import { ModeToggle } from "@/components/shared/ModeToggle";
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
  Award,
  Check,
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
      return;
    }

    const isCorrect = q ? option === q.correct_answer : false;

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

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      saved[currentMockQuestion.order_index] = option;
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // ignore
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
        idx === currentIndex ? { ...item, is_marked_for_review: newStatus } : item
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

  // Finish / Submit Mock Test
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
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center text-sm text-slate-500">
        Question data could not be loaded.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0b0f17]">
      {/* Distraction-Free Examination Top Bar */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#131c2e] border-b border-slate-200/90 dark:border-slate-800/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Left: Brand + Mode Badge */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white"
              title="Exit to Dashboard"
            >
              <div className="w-7 h-7 rounded-md bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white">
                <Award className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline">MockMaster</span>
            </Link>

            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              |
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border ${
                isPracticeMode
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              }`}
            >
              {isPracticeMode ? "PRACTICE MODE" : "EXAM MODE"}
            </span>
          </div>

          {/* Center: Question Progress Counter */}
          <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Question <span className="text-blue-700 dark:text-blue-400">{currentIndex + 1}</span> /{" "}
            {questions.length}
          </div>

          {/* Right: Timer, Theme Toggle & Submit */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ExamTimer
              initialMinutes={mockTest.time_limit_minutes}
              startedAt={mockTest.started_at}
              onTimeUp={handleFinalizeMock}
            />

            <div className="hidden md:block">
              <ModeToggle />
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={hasSubmitted || isSubmittingTest}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {hasSubmitted ? "Submitting..." : "Submit Test"}
              </span>
              <span className="sm:hidden">Submit</span>
            </button>

            {/* Mobile Palette Trigger */}
            <button
              type="button"
              onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Open question palette"
            >
              {mobilePaletteOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Ratio Adjustment Notice */}
      {mockTest.ratio_warning && (
        <div className="bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/80 px-4 py-2 text-xs font-medium text-amber-900 dark:text-amber-300 text-center">
          {mockTest.ratio_warning}
        </div>
      )}

      {/* Main Two-Column Examination Workspace */}
      <div className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question & Answer Canvas (8 cols on lg, 9 cols on xl) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-8 shadow-2xs">
            {/* Question Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Q.{currentIndex + 1}
                </span>
                <QuestionTypeBadge
                  type={q.type}
                  sourceYear={q.source_year}
                  examName={q.type === "PYQ" ? q.source_paper || "Official Paper" : undefined}
                />
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  {q.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <SaveButton questionId={q.id} />

                <button
                  type="button"
                  onClick={handleToggleReview}
                  aria-pressed={currentMockQuestion.is_marked_for_review}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    currentMockQuestion.is_marked_for_review
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      : "bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      currentMockQuestion.is_marked_for_review
                        ? "fill-amber-500 text-amber-600 dark:text-amber-400"
                        : "text-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {currentMockQuestion.is_marked_for_review
                      ? "Marked for Review"
                      : "Mark for Review"}
                  </span>
                </button>
              </div>
            </div>

            {/* Question Prose */}
            <div className="py-6">
              <div className="question-prose font-normal text-slate-900 dark:text-slate-100 whitespace-pre-line">
                {q.question_text}
              </div>
            </div>

            {/* Options List */}
            <div role="radiogroup" aria-label="Answer options" className="space-y-3 pt-1">
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

                let cardStyle =
                  "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200";
                let badgeStyle =
                  "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300";

                if (isPracticeMode && hasAnsweredCurrent) {
                  if (isCorrectOption) {
                    cardStyle =
                      "border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-medium";
                    badgeStyle = "bg-emerald-600 border-emerald-600 text-white";
                  } else if (isSelected && !isCorrectOption) {
                    cardStyle =
                      "border-rose-600 dark:border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-medium";
                    badgeStyle = "bg-rose-600 border-rose-600 text-white";
                  }
                } else if (isSelected) {
                  cardStyle =
                    "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white font-medium ring-1 ring-blue-600/30";
                  badgeStyle = "bg-blue-700 dark:bg-blue-600 border-blue-700 dark:border-blue-500 text-white";
                }

                return (
                  <button
                    key={optKey}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(optKey)}
                    className={`w-full min-h-[54px] p-4 rounded-xl border text-left flex items-start gap-3.5 transition-colors cursor-pointer ${cardStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg border font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                    >
                      {optKey}
                    </span>
                    <span className="text-sm sm:text-[15px] leading-relaxed flex-1 pt-0.5">
                      {optText}
                    </span>
                    {isPracticeMode && hasAnsweredCurrent && isCorrectOption && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0 self-center">
                        ✓ Correct
                      </span>
                    )}
                    {isPracticeMode && hasAnsweredCurrent && isSelected && !isCorrectOption && (
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-400 shrink-0 self-center">
                        ✕ Your Choice
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Practice Mode Immediate Structured Explanation */}
            {isPracticeMode && hasAnsweredCurrent && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <ExplanationPanel
                  explanation={q.explanation}
                  correctAnswer={q.correct_answer}
                  userAnswer={currentMockQuestion.user_answer}
                  type={q.type}
                  sourceYear={q.source_year}
                />
              </div>
            )}

            {/* Bottom Question Navigation Bar */}
            <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>
                    {currentMockQuestion.is_marked_for_review ? "Unmark Review" : "Mark for Review"}
                  </span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    disabled={hasSubmitted || isSubmittingTest}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors shadow-2xs cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Finish & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Question Palette & Marking Summary */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-22 space-y-4">
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            mode={mockTest.mode}
            onSelectIndex={(idx) => setCurrentIndex(idx)}
          />

          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-4 space-y-2.5 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Official Marking Rules
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Correct Answer</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{mockTest.marking_scheme.correct}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Negative Marking</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {mockTest.marking_scheme.wrong}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Unattempted</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                0.0
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Question Palette Drawer */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 backdrop-blur-[2px] flex justify-end">
          <div className="w-80 max-w-[85vw] bg-white dark:bg-[#131c2e] h-full p-4 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Question Palette
              </span>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close question palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-3">
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

      {/* Submit Test Confirmation Dialog */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3
                  id="submit-modal-title"
                  className="font-bold text-base text-slate-900 dark:text-white"
                >
                  Finalize and Submit Mock Test?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Please verify your attempt summary before generating final scores and diagnostics.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 text-center">
              <div>
                <div className="text-lg font-mono font-bold text-blue-700 dark:text-blue-400">
                  {questions.filter((item) => item.user_answer).length}
                </div>
                <div className="text-[10px] font-semibold uppercase text-slate-500">Answered</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                  {questions.filter((item) => !item.user_answer).length}
                </div>
                <div className="text-[10px] font-semibold uppercase text-slate-500">Unanswered</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                  {questions.filter((item) => item.is_marked_for_review).length}
                </div>
                <div className="text-[10px] font-semibold uppercase text-slate-500">For Review</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="h-9 px-4 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Return to Paper
              </button>
              <button
                type="button"
                disabled={hasSubmitted || isSubmittingTest}
                onClick={handleFinalizeMock}
                className="h-9 px-5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white transition-colors shadow-2xs cursor-pointer"
              >
                {hasSubmitted || isSubmittingTest ? "Scoring..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
