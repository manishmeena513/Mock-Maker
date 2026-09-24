import React from "react";
import { QuestionType } from "@/types/database";
import { ShieldCheck, Sparkles } from "lucide-react";

interface QuestionTypeBadgeProps {
  type: QuestionType;
  examName?: string;
  sourceYear?: number | null;
  className?: string;
}

export function QuestionTypeBadge({
  type,
  examName,
  sourceYear,
  className = "",
}: QuestionTypeBadgeProps) {
  if (type === "PYQ") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>PYQ</span>
        {examName && <span className="opacity-40">•</span>}
        {examName && <span>{examName}</span>}
        {sourceYear && <span className="opacity-40">•</span>}
        {sourceYear && <span>{sourceYear}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
      <span>MODEL QUESTION</span>
      <span className="opacity-40">•</span>
      <span>AI Generated</span>
    </span>
  );
}
