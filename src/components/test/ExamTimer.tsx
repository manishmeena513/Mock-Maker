"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

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

  const isLowTime = secondsRemaining <= 300; // < 5 mins
  const isWarningTime = secondsRemaining <= 600 && !isLowTime; // < 10 mins

  const format = (num: number) => String(num).padStart(2, "0");
  const timeString = `${hours > 0 ? `${format(hours)}:` : ""}${format(minutes)}:${format(seconds)}`;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${timeString}`}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border font-mono text-xs sm:text-sm font-bold tracking-tight transition-colors ${
        isLowTime
          ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
          : isWarningTime
          ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
          : "bg-slate-100/90 text-slate-800 border-slate-200 dark:bg-[#131c2e] dark:text-slate-100 dark:border-slate-800"
      } ${className}`}
    >
      {isLowTime ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      )}
      <span>{timeString}</span>
    </div>
  );
}
