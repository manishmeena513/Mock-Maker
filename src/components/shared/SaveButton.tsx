"use client";

import React, { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleBookmarkAction } from "@/app/actions/bookmark";

interface SaveButtonProps {
  questionId: string;
  initialSaved?: boolean;
  className?: string;
}

export function SaveButton({
  questionId,
  initialSaved = false,
  className = "",
}: SaveButtonProps) {
  const [saved, setSaved] = useState<boolean>(initialSaved);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const nextSaved = !saved;
    setSaved(nextSaved);

    startTransition(async () => {
      try {
        const res = await toggleBookmarkAction(questionId, "important");
        setSaved(res.saved);
      } catch (err) {
        console.error("Failed to toggle bookmark:", err);
        setSaved(saved);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
        saved
          ? "bg-amber-50/90 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
          : "bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
      } ${className}`}
      title={saved ? "Remove from Saved Questions" : "Save to Revision Library"}
    >
      <Bookmark
        className={`w-3.5 h-3.5 ${
          saved ? "fill-amber-500 text-amber-600 dark:text-amber-400" : "text-slate-400"
        }`}
      />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
