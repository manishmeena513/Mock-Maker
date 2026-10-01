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
      } catch {
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
      className={`mm-btn-press inline-flex items-center gap-1.5 h-8 sm:h-7 px-2.5 rounded text-xs font-medium border cursor-pointer ${
        saved
          ? "bg-[var(--accent-soft)] text-[var(--foreground)] border-[var(--accent)]"
          : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-[var(--border)]"
      } ${className}`}
      title={saved ? "Remove from Saved Questions" : "Save to Revision Library"}
    >
      <Bookmark
        className={`w-3.5 h-3.5 sm:w-3 sm:h-3 transition-transform duration-150 ${
          saved ? "fill-[var(--accent)] text-[var(--accent)] scale-110" : ""
        }`}
      />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
