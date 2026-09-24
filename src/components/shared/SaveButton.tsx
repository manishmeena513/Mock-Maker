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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
        saved
          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700"
          : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
      } ${className}`}
      title={saved ? "Remove from Saved Questions" : "Save for Revision"}
    >
      <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-amber-500 text-amber-600" : ""}`} />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
