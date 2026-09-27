import React from "react";
import { StructuredExplanation, QuestionType } from "@/types/database";

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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
          userCorrect
            ? "bg-[var(--sage-soft)] border-[var(--sage-border)] text-[var(--sage)]"
            : "bg-rose-500/10 border-rose-500/25 text-[var(--destructive)]"
        }`}
      >
        <span className="font-semibold uppercase tracking-wider">
          {userCorrect
            ? "Correct Response"
            : `Incorrect ${userAnswer ? `(Selected ${userAnswer})` : "(Unattempted)"}`}
        </span>
        <span className="font-semibold text-[var(--foreground)]">
          Official Key: Option {correctAnswer}
        </span>
      </div>

      <div className="p-5 space-y-4 text-xs sm:text-sm leading-relaxed">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
            Rationale
          </div>
          <p className="text-[var(--foreground)]">{explanation.why}</p>
        </div>

        <div className="space-y-1 pt-3 border-t border-[var(--border-subtle)]">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Core Concept
          </div>
          <p className="text-[var(--muted-foreground)]">{explanation.concept}</p>
        </div>

        {explanation.exam_perspective && (
          <div className="space-y-1 pt-3 border-t border-[var(--border-subtle)]">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Exam Perspective
            </div>
            <p className="text-[var(--muted-foreground)]">{explanation.exam_perspective}</p>
          </div>
        )}

        {explanation.remember && (
          <div className="p-3 rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] text-xs text-[var(--foreground)]">
            <span className="font-mono uppercase text-[10px] tracking-wider text-[var(--accent)] block mb-0.5">
              Key Takeaway
            </span>
            {explanation.remember}
          </div>
        )}
      </div>
    </div>
  );
}
