"use client";

import React from "react";
import { MockQuestion, TestMode } from "@/types/database";
import { Check, X, Bookmark, HelpCircle } from "lucide-react";

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
  // Compute counts for summary
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
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Question Palette
        </h3>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {answeredCount}/{questions.length} Attempted
        </span>
      </div>

      {/* Legend with Icons & Labels (Never color alone) */}
      <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
        {mode === "practice" ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
              <span>Correct ({correctCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-500 flex items-center justify-center text-white text-[9px] font-bold">✕</span>
              <span>Incorrect ({incorrectCount})</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-3.5 h-3.5 rounded bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">●</span>
            <span>Answered ({answeredCount})</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-400 flex items-center justify-center text-slate-900 text-[9px] font-bold">★</span>
          <span>Review ({reviewCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-500">○</span>
          <span>Unattempted ({unattemptedCount})</span>
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto p-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          let btnClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
          let statusText = "Unattempted";
          let badgeSymbol = "";

          if (q.is_marked_for_review) {
            btnClass = "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-600 font-bold";
            statusText = "Marked for review";
            badgeSymbol = "★";
          } else if (q.user_answer) {
            if (mode === "practice") {
              if (q.is_correct) {
                btnClass = "bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs";
                statusText = "Answered correctly";
                badgeSymbol = "✓";
              } else {
                btnClass = "bg-rose-500 text-white border-rose-600 font-bold shadow-xs";
                statusText = "Answered incorrectly";
                badgeSymbol = "✕";
              }
            } else {
              // Exam Mode: blue, does not reveal right/wrong before submission
              btnClass = "bg-blue-600 text-white border-blue-700 font-bold shadow-xs";
              statusText = "Answered";
              badgeSymbol = "●";
            }
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              aria-label={`Question ${idx + 1}: ${statusText}${isCurrent ? " (Current Question)" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
              className={`h-9 rounded-lg border text-xs font-semibold flex items-center justify-center relative transition-all ${btnClass} ${
                isCurrent
                  ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10"
                  : "hover:opacity-90"
              }`}
            >
              <span>{idx + 1}</span>
              {badgeSymbol && (
                <span className="absolute top-0.5 right-0.5 text-[8px] font-black opacity-80" aria-hidden="true">
                  {badgeSymbol}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
