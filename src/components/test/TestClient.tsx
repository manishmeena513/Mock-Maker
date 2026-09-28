"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MockTest, MockQuestion } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { SaveButton } from "@/components/shared/SaveButton";
import { ModeToggle } from "@/components/shared/ModeToggle";
import { BrandLogo } from "@/components/shared/BrandLogo";
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
  LayoutGrid,
  X,
  Sparkles,
} from "lucide-react";
import { useAIAssistant } from "@/components/ai/AIAssistantContext";

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
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const { setExamContext, toggleAssistant, isOpen: isAIOpen } = useAIAssistant();

  const storageKey = `mockmaster_answers_${mockTest.id}`;

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
    } catch {
      // ignore local storage read errors
    }
  }, [storageKey]);

  const currentMockQuestion = questions[currentIndex];
  const q = currentMockQuestion?.question;

  const isPracticeMode = mockTest.mode === "practice";
  const hasAnsweredCurrent = Boolean(currentMockQuestion?.user_answer);

  useEffect(() => {
    if (!q) return;
    setExamContext({
      exam: mockTest.exam_id,
      subject: q.subject_id,
      topic: q.explanation?.concept || q.topic_id,
      questionText: q.question_text,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      },
      userAnswer: currentMockQuestion?.user_answer || null,
      correctAnswer: isPracticeMode ? q.correct_answer : null,
      explanation: isPracticeMode ? q.explanation?.why || null : null,
      mode: mockTest.mode,
      page: "test",
    });
  }, [
    q,
    currentMockQuestion?.user_answer,
    isPracticeMode,
    mockTest.exam_id,
    mockTest.mode,
    setExamContext,
  ]);

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
      } catch {
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
      <div className="min-h-screen flex items-center justify-center p-8 text-center text-xs text-[var(--muted-foreground)]">
        Question data could not be loaded.
      </div>
    );
  }

  const answeredCount = questions.filter((item) => item.user_answer).length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Section 11: Minimal Top Examination Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Left: Brand Mark + Mode */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" title="Exit to Dashboard" className="focus:outline-none">
              <BrandLogo variant="mark" size="sm" />
            </Link>
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {isPracticeMode ? "Practice Mode" : "Exam Mode"}
            </span>
          </div>

          {/* Center: Question Counter */}
          <div className="font-mono text-xs sm:text-sm font-medium text-[var(--foreground)] tabular-nums">
            <span className="text-[var(--muted-foreground)]">Question </span>
            <span className="font-semibold text-[var(--accent)]">{currentIndex + 1}</span>
            <span className="text-[var(--muted-foreground)]"> / {questions.length}</span>
          </div>

          {/* Right: Timer, AI Assistant, Collapsible Palette Trigger & Submit */}
          <div className="flex items-center gap-2">
            <ExamTimer
              initialMinutes={mockTest.time_limit_minutes}
              startedAt={mockTest.started_at}
              onTimeUp={handleFinalizeMock}
            />

            <button
              type="button"
              onClick={toggleAssistant}
              aria-label="Toggle AI Assistant"
              title="Ask MockMaster AI"
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                isAIOpen
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent-border)]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">AI</span>
            </button>

            <div className="hidden md:block">
              <ModeToggle />
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen((prev) => !prev)}
              aria-expanded={paletteOpen}
              aria-label="Toggle question palette"
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                paletteOpen
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[11px]">
                {answeredCount}/{questions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={hasSubmitted || isSubmittingTest}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              <span>{hasSubmitted ? "Submitting..." : "Submit"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ratio Notice (if applicable) */}
      {mockTest.ratio_warning && (
        <div className="bg-[var(--accent-soft)] border-b border-[var(--accent-border)] px-4 py-1.5 text-[11px] text-[var(--foreground)] text-center">
          {mockTest.ratio_warning}
        </div>
      )}

      {/* Main Question-First Workspace */}
      <div className="flex-1 max-w-[1320px] mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Question Reading Canvas */}
        <div className="w-full max-w-3xl mx-auto space-y-8">
          {/* Metadata Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--muted-foreground)]">
                #{String(currentIndex + 1).padStart(2, "0")}
              </span>
              <QuestionTypeBadge
                type={q.type}
                sourceYear={q.source_year}
                examName={q.type === "PYQ" ? q.source_paper || "Official Paper" : undefined}
              />
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--muted)] text-[var(--muted-foreground)]">
                {q.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <SaveButton questionId={q.id} />
              <span className="text-[11px] font-mono text-[var(--muted-foreground)] hidden sm:inline">
                +{mockTest.marking_scheme.correct} / {mockTest.marking_scheme.wrong}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="py-2">
            <div className="question-prose text-[var(--foreground)] whitespace-pre-line">
              {q.question_text}
            </div>
          </div>

          {/* Options List — Instant Tactile Selection */}
          <div role="radiogroup" aria-label="Answer options" className="space-y-2.5">
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

              let rowStyle =
                "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/50 text-[var(--foreground)]";
              let keyStyle =
                "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]";

              if (isPracticeMode && hasAnsweredCurrent) {
                if (isCorrectOption) {
                  rowStyle =
                    "border-[var(--sage)] bg-[var(--sage-soft)] text-[var(--foreground)] font-medium";
                  keyStyle = "border-[var(--sage)] bg-[var(--sage)] text-white";
                } else if (isSelected && !isCorrectOption) {
                  rowStyle =
                    "border-[var(--destructive)] bg-rose-500/10 text-[var(--foreground)] font-medium";
                  keyStyle = "border-[var(--destructive)] bg-[var(--destructive)] text-white";
                }
              } else if (isSelected) {
                rowStyle =
                  "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] font-medium";
                keyStyle = "border-[var(--accent)] bg-[var(--accent)] text-white";
              }

              return (
                <button
                  key={optKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectOption(optKey)}
                  className={`w-full p-4 rounded-md border text-left flex items-start gap-3.5 transition-colors duration-100 cursor-pointer ${rowStyle}`}
                >
                  <span
                    className={`w-6 h-6 rounded border font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${keyStyle}`}
                  >
                    {optKey}
                  </span>
                  <span className="text-sm sm:text-[15px] leading-relaxed flex-1">
                    {optText}
                  </span>
                  {isPracticeMode && hasAnsweredCurrent && isCorrectOption && (
                    <span className="text-xs font-mono font-semibold text-[var(--sage)] shrink-0 self-center">
                      Correct
                    </span>
                  )}
                  {isPracticeMode && hasAnsweredCurrent && isSelected && !isCorrectOption && (
                    <span className="text-xs font-mono font-semibold text-[var(--destructive)] shrink-0 self-center">
                      Incorrect
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Practice Mode Immediate Explanation */}
          {isPracticeMode && hasAnsweredCurrent && (
            <div className="pt-4">
              <ExplanationPanel
                explanation={q.explanation}
                correctAnswer={q.correct_answer}
                userAnswer={currentMockQuestion.user_answer}
                type={q.type}
                sourceYear={q.source_year}
                questionText={q.question_text}
                options={{
                  A: q.option_a,
                  B: q.option_b,
                  C: q.option_c,
                  D: q.option_d,
                }}
              />
            </div>
          )}

          {/* Bottom Controls: Previous | Mark for review | Next */}
          <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleToggleReview}
              aria-pressed={currentMockQuestion.is_marked_for_review}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                currentMockQuestion.is_marked_for_review
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  currentMockQuestion.is_marked_for_review ? "fill-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              />
              <span>
                {currentMockQuestion.is_marked_for_review ? "Marked for review" : "Mark for review"}
              </span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={hasSubmitted || isSubmittingTest}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-xs font-medium bg-[var(--sage)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Finish &amp; Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Side Palette (Only rendered when toggled open) */}
        {paletteOpen && (
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 animate-editorial">
            <div className="flex items-center justify-between mb-2 lg:hidden">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                Question Palette
              </span>
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <QuestionPalette
              questions={questions}
              currentIndex={currentIndex}
              mode={mockTest.mode}
              onSelectIndex={(idx) => {
                setCurrentIndex(idx);
              }}
            />
          </aside>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-md w-full p-6 shadow-xl space-y-5 animate-editorial">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 id="submit-modal-title" className="font-semibold text-base text-[var(--foreground)]">
                  Submit examination paper?
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                  Review your attempt summary before locking your responses and computing net commission marks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-center">
              <div>
                <div className="text-lg font-mono font-semibold text-[var(--foreground)]">
                  {answeredCount}
                </div>
                <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                  Answered
                </div>
              </div>
              <div className="border-x border-[var(--border)]">
                <div className="text-lg font-mono font-semibold text-[var(--muted-foreground)]">
                  {questions.length - answeredCount}
                </div>
                <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                  Unanswered
                </div>
              </div>
              <div>
                <div className="text-lg font-mono font-semibold text-[var(--accent)]">
                  {questions.filter((item) => item.is_marked_for_review).length}
                </div>
                <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                  Review
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="h-9 px-4 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Return to Paper
              </button>
              <button
                type="button"
                disabled={hasSubmitted || isSubmittingTest}
                onClick={handleFinalizeMock}
                className="h-9 px-5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
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
