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
  // Compute initial remaining seconds using server startedAt to persist across reloads
  const calculateInitialRemaining = (): number => {
    const totalSeconds = initialMinutes * 60;
    if (startedAt) {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold transition-all ${
        isLowTime
          ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 animate-pulse"
          : isWarningTime
          ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      } ${className}`}
    >
      {isLowTime ? (
        <AlertTriangle className="w-4 h-4 text-rose-500" aria-hidden="true" />
      ) : (
        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      )}
      <span>{timeString}</span>
    </div>
  );
}
