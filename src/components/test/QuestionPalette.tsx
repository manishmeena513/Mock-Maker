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
      className={`rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-4 flex flex-col shadow-2xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
          Question Palette
        </h3>
        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
          {answeredCount}/{questions.length} Answered
        </span>
      </div>

      {/* Question Number Grid */}
      <div className="grid grid-cols-5 gap-2 max-h-[340px] overflow-y-auto py-3.5 pr-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          let btnClass =
            "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700";
          let statusText = "Unattempted";
          let badgeSymbol = "";

          if (q.is_marked_for_review) {
            btnClass =
              "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700 font-bold";
            statusText = "Marked for review";
            badgeSymbol = "★";
          } else if (q.user_answer) {
            if (mode === "practice") {
              if (q.is_correct) {
                btnClass =
                  "bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-500 font-bold";
                statusText = "Answered correctly";
                badgeSymbol = "✓";
              } else {
                btnClass =
                  "bg-rose-600 dark:bg-rose-600 text-white border-rose-700 dark:border-rose-500 font-bold";
                statusText = "Answered incorrectly";
                badgeSymbol = "✕";
              }
            } else {
              btnClass =
                "bg-blue-700 dark:bg-blue-600 text-white border-blue-800 dark:border-blue-500 font-bold";
              statusText = "Answered";
              badgeSymbol = "●";
            }
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              aria-label={`Question ${idx + 1}: ${statusText}${isCurrent ? " (Current Question)" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
              className={`h-9 rounded-lg border font-mono text-xs font-semibold flex items-center justify-center relative transition-colors cursor-pointer ${btnClass} ${
                isCurrent
                  ? "ring-2 ring-blue-600 dark:ring-blue-400 ring-offset-2 dark:ring-offset-[#131c2e] z-10"
                  : ""
              }`}
            >
              <span>{idx + 1}</span>
              {badgeSymbol && (
                <span
                  className="absolute top-0.5 right-1 text-[8px] font-bold opacity-85"
                  aria-hidden="true"
                >
                  {badgeSymbol}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Accessible Legend (Symbols + Color) */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Status Legend
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {mode === "practice" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  ✓
                </span>
                <span>Correct ({correctCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-rose-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  ✕
                </span>
                <span>Incorrect ({incorrectCount})</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 col-span-2">
              <span className="w-4 h-4 rounded bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                ●
              </span>
              <span>Answered ({answeredCount})</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-400 dark:border-amber-700 flex items-center justify-center text-amber-800 dark:text-amber-300 text-[9px] font-bold shrink-0">
              ★
            </span>
            <span>Review ({reviewCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center text-[9px] text-slate-400 shrink-0">
              ○
            </span>
            <span>Unanswered ({unattemptedCount})</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
