import React from "react";
import { QuestionType } from "@/types/database";
import { ShieldCheck, Sparkles } from "lucide-react";

interface QuestionTypeBadgeProps {
  type: QuestionType;
  examName?: string;
  sourceYear?: number | null;
  compact?: boolean;
  className?: string;
}

export function QuestionTypeBadge({
  type,
  examName,
  sourceYear,
  compact = false,
  className = "",
}: QuestionTypeBadgeProps) {
  const paddingClass = compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  if (type === "PYQ") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-tight bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80 ${paddingClass} ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="uppercase tracking-wider font-bold">
          {compact ? "PYQ" : "VERIFIED PYQ"}
        </span>
        {examName && <span className="opacity-40">•</span>}
        {examName && <span className="font-medium">{examName}</span>}
        {sourceYear && <span className="opacity-40">•</span>}
        {sourceYear && <span className="font-mono font-bold">{sourceYear}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-tight bg-indigo-50/90 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 ${paddingClass} ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      <span className="uppercase tracking-wider font-bold">
        {compact ? "MODEL" : "MODEL QUESTION"}
      </span>
      {examName && (
        <>
          <span className="opacity-40">•</span>
          <span className="font-medium">{examName}</span>
        </>
      )}
    </span>
  );
}
