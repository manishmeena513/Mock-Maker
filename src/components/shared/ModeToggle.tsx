"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="h-8 w-[88px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60"
        aria-hidden="true"
      />
    );
  }

  const activeMode = theme === "system" ? "system" : resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className="inline-flex items-center p-0.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0f172a] text-slate-600 dark:text-slate-400"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        aria-pressed={activeMode === "light"}
        title="Light mode"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
          activeMode === "light"
            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
            : "hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden xl:inline">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        aria-pressed={activeMode === "dark"}
        title="Dark mode"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
          activeMode === "dark"
            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
            : "hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <Moon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
        <span className="hidden xl:inline">Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        aria-label="System theme"
        aria-pressed={activeMode === "system"}
        title="System preference"
        className={`inline-flex items-center justify-center px-1.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
          activeMode === "system"
            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
            : "hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
