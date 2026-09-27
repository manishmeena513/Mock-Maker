"use client";

import React from "react";
import { MockQuestion, TestMode } from "@/types/database";

interface QuestionPaletteProps {
  questions: MockQuestion[];
  currentIndex: number;
  mode: TestMode;
  onSelectIndex: (index: number) => void;
  className?: string;
}

export function QuestionPalette({
  questions,
  currentIndex,
  mode,
  onSelectIndex,
  className = "",
}: QuestionPaletteProps) {
  let correctCount = 0;
  let incorrectCount = 0;
  let answeredCount = 0;
  let reviewCount = 0;
  let unattemptedCount = 0;

  questions.forEach((q) => {
    if (q.is_marked_for_review) reviewCount++;
    if (!q.user_answer) {
      unattemptedCount++;
    } else {
      answeredCount++;
      if (mode === "practice") {
        if (q.is_correct) correctCount++;
        else incorrectCount++;
      }
    }
  });

  return (
    <nav
      aria-label="Question Navigation Palette"
      className={`rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--foreground)] font-semibold">
          Palette
        </h3>
        <span className="text-xs font-mono text-[var(--muted-foreground)]">
          {answeredCount}/{questions.length}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 max-h-[320px] overflow-y-auto py-3 pr-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          let btnClass =
            "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]";
          let statusText = "Unattempted";

          if (q.is_marked_for_review) {
            btnClass =
              "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] font-semibold";
            statusText = "Marked for review";
          } else if (q.user_answer) {
            if (mode === "practice") {
              if (q.is_correct) {
                btnClass = "bg-[var(--sage)] text-white border-[var(--sage)] font-semibold";
                statusText = "Answered correctly";
              } else {
                btnClass =
                  "bg-[var(--destructive)] text-white border-[var(--destructive)] font-semibold";
                statusText = "Answered incorrectly";
              }
            } else {
              btnClass =
                "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] font-semibold";
              statusText = "Answered";
            }
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              aria-label={`Question ${idx + 1}: ${statusText}`}
              aria-current={isCurrent ? "true" : undefined}
              className={`h-8 rounded border font-mono text-xs flex items-center justify-center transition-colors cursor-pointer ${btnClass} ${
                isCurrent ? "ring-1.5 ring-[var(--accent)] ring-offset-1" : ""
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-[11px] font-mono text-[var(--muted-foreground)]">
        {mode === "practice" ? (
          <>
            <span>Correct: {correctCount}</span>
            <span>Wrong: {incorrectCount}</span>
          </>
        ) : (
          <span className="col-span-2">Answered: {answeredCount}</span>
        )}
        <span>Review: {reviewCount}</span>
        <span>Left: {unattemptedCount}</span>
      </div>
    </nav>
  );
}
