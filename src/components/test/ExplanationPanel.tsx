import React from "react";
import { StructuredExplanation, QuestionType } from "@/types/database";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  BookOpen,
  Compass,
  BookmarkCheck,
  ArrowRightCircle,
} from "lucide-react";

interface ExplanationPanelProps {
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: StructuredExplanation;
  isUserCorrect?: boolean;
  userAnswer?: "A" | "B" | "C" | "D" | null;
  type?: QuestionType;
  sourceYear?: number | null;
}

export function ExplanationPanel({
  correctAnswer,
  explanation,
  isUserCorrect,
  userAnswer,
}: ExplanationPanelProps) {
  const userCorrect =
    isUserCorrect !== undefined
      ? isUserCorrect
      : userAnswer
      ? userAnswer === correctAnswer
      : true;

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] overflow-hidden">
      {/* Top Status Banner */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          userCorrect
            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60"
            : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60"
        }`}
      >
        <div className="flex items-center gap-2">
          {userCorrect ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>✓ Correct</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>✕ Incorrect {userAnswer ? `(Selected ${userAnswer})` : "(Unattempted)"}</span>
            </span>
          )}
        </div>

        <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
          Official Key: <span className="text-emerald-700 dark:text-emerald-400">Option {correctAnswer}</span>
        </div>
      </div>

      {/* Structured Academic Explanation Blocks */}
      <div className="p-5 space-y-4 text-sm leading-relaxed">
        {/* 1. Why */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Why</span>
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-medium pl-5">
            {explanation.why}
          </p>
        </div>

        {/* 2. Concept */}
        <div className="space-y-1 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Core Concept</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 pl-5">
            {explanation.concept}
          </p>
        </div>

        {/* 3. Exam Perspective */}
        {explanation.exam_perspective && (
          <div className="space-y-1 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Exam Perspective</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 pl-5">
              {explanation.exam_perspective}
            </p>
          </div>
        )}

        {/* 4. Remember */}
        {explanation.remember && (
          <div className="rounded-lg border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Remember</span>
            </div>
            <p className="text-xs font-semibold text-amber-950 dark:text-amber-200">
              {explanation.remember}
            </p>
          </div>
        )}

        {/* 5. Related Concept */}
        {explanation.related_concept && (
          <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ArrowRightCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Related Concept:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {explanation.related_concept}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
