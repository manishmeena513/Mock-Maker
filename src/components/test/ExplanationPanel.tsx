import React from "react";
import { StructuredExplanation, QuestionType } from "@/types/database";
import { CheckCircle2, Lightbulb, BookOpen, BookmarkCheck, ArrowRightCircle } from "lucide-react";

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
  type,
  sourceYear,
}: ExplanationPanelProps) {
  const userCorrect = isUserCorrect !== undefined ? isUserCorrect : (userAnswer ? userAnswer === correctAnswer : true);

  return (
    <div
      className={`mt-6 rounded-xl border p-5 transition-all animate-in fade-in-50 duration-300 ${
        userCorrect
          ? "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20"
          : "border-rose-200 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/20"
      }`}
    >
      {/* Header status */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {userCorrect ? (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Correct Answer: Option {correctAnswer}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>Incorrect ({userAnswer ? `Your answer: ${userAnswer}` : "Not attempted"})</span>
              <span className="text-slate-400 dark:text-slate-500 font-normal">|</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Correct: Option {correctAnswer}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Structured Sections */}
      <div className="mt-4 space-y-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
        {/* Why? */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Why this is correct</span>
          </h4>
          <p className="pl-5 text-slate-700 dark:text-slate-300 font-medium">
            {explanation.why}
          </p>
        </div>

        {/* Concept */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Core Concept</span>
          </h4>
          <p className="pl-5 text-slate-600 dark:text-slate-300">
            {explanation.concept}
          </p>
        </div>

        {/* Exam Perspective */}
        {explanation.exam_perspective && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              <BookmarkCheck className="w-4 h-4 text-purple-500" />
              <span>Exam Perspective</span>
            </h4>
            <p className="pl-5 text-slate-600 dark:text-slate-300">
              {explanation.exam_perspective}
            </p>
          </div>
        )}

        {/* Remember */}
        {explanation.remember && (
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3">
            <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
              ⚡ Key Memory Hook:
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
              {explanation.remember}
            </p>
          </div>
        )}

        {/* Related Concept */}
        {explanation.related_concept && (
          <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ArrowRightCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Related Topics: </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {explanation.related_concept}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
