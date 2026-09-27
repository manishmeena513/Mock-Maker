"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ExamTimerProps {
  initialMinutes: number;
  startedAt?: string;
  onTimeUp?: () => void;
  className?: string;
}

export function ExamTimer({ initialMinutes, startedAt, onTimeUp, className = "" }: ExamTimerProps) {
  const calculateInitialRemaining = (): number => {
    const totalSeconds = initialMinutes * 60;
    if (startedAt) {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      );
      return Math.max(0, totalSeconds - elapsedSeconds);
    }
    return totalSeconds;
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateInitialRemaining);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, onTimeUp]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const isLowTime = secondsRemaining <= 300;
  const format = (num: number) => String(num).padStart(2, "0");
  const timeString = `${hours > 0 ? `${format(hours)}:` : ""}${format(minutes)}:${format(seconds)}`;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${timeString}`}
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border font-mono text-xs font-medium tabular-nums transition-colors ${
        isLowTime
          ? "bg-rose-500/10 text-[var(--destructive)] border-rose-500/30"
          : "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]"
      } ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
      <span>{timeString}</span>
    </div>
  );
}
