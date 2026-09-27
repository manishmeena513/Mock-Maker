import React from "react";
import { QuestionType } from "@/types/database";

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
  const paddingClass = compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]";

  if (type === "PYQ") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded font-medium tracking-tight bg-[var(--sage-soft)] text-[var(--sage)] border border-[var(--sage-border)] ${paddingClass} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--sage)] shrink-0" />
        <span className="uppercase tracking-[0.06em] font-semibold">
          {compact ? "PYQ" : "Verified PYQ"}
        </span>
        {examName && <span className="opacity-40">·</span>}
        {examName && <span>{examName}</span>}
        {sourceYear && <span className="opacity-40">·</span>}
        {sourceYear && <span className="font-mono font-semibold">{sourceYear}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-medium tracking-tight bg-[var(--plum-soft)] text-[var(--plum)] border border-[var(--plum-border)] ${paddingClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--plum)] shrink-0" />
      <span className="uppercase tracking-[0.06em] font-semibold">
        {compact ? "Model" : "Model Question"}
      </span>
      {examName && (
        <>
          <span className="opacity-40">·</span>
          <span>{examName}</span>
        </>
      )}
    </span>
  );
}
