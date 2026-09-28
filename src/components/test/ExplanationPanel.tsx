"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { StructuredExplanation, QuestionType } from "@/types/database";
import { useAIAssistant } from "@/components/ai/AIAssistantContext";

interface ExplanationPanelProps {
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: StructuredExplanation;
  isUserCorrect?: boolean;
  userAnswer?: "A" | "B" | "C" | "D" | null;
  type?: QuestionType;
  sourceYear?: number | null;
  questionText?: string;
  options?: { A: string; B: string; C: string; D: string };
}

export function ExplanationPanel({
  correctAnswer,
  explanation,
  isUserCorrect,
  userAnswer,
  questionText,
  options,
}: ExplanationPanelProps) {
  const { updateExamContext, openAssistant } = useAIAssistant();

  const userCorrect =
    isUserCorrect !== undefined
      ? isUserCorrect
      : userAnswer
      ? userAnswer === correctAnswer
      : true;

  const handleAskAI = () => {
    updateExamContext({
      ...(questionText ? { questionText } : {}),
      ...(options ? { options } : {}),
      userAnswer: userAnswer || null,
      correctAnswer,
      explanation: `${explanation.why} (${explanation.concept})`,
    });
    openAssistant(
      userCorrect
        ? "Summarize the key exam takeaway and why the other options are incorrect"
        : "Explain why my selected answer is wrong and how to eliminate the distractors"
    );
  };

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
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--foreground)]">
            Official Key: Option {correctAnswer}
          </span>
          <button
            type="button"
            onClick={handleAskAI}
            className="inline-flex items-center gap-1 rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Ask AI Mentor</span>
          </button>
        </div>
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
