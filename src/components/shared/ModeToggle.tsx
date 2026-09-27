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
        className="h-8 w-[84px] rounded-md border border-[var(--border)] bg-[var(--muted)]/50"
        aria-hidden="true"
      />
    );
  }

  const activeMode = theme === "system" ? "system" : resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className="inline-flex items-center p-0.5 rounded-md border border-[var(--border)] bg-[var(--muted)]/70 text-[var(--muted-foreground)]"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        aria-pressed={activeMode === "light"}
        title="Light mode"
        className={`inline-flex items-center justify-center px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
          activeMode === "light"
            ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
            : "hover:text-[var(--foreground)]"
        }`}
      >
        <Sun className="w-3.5 h-3.5 text-[var(--accent)]" />
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        aria-pressed={activeMode === "dark"}
        title="Dark mode"
        className={`inline-flex items-center justify-center px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
          activeMode === "dark"
            ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
            : "hover:text-[var(--foreground)]"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        aria-label="System theme"
        aria-pressed={activeMode === "system"}
        title="System preference"
        className={`inline-flex items-center justify-center px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
          activeMode === "system"
            ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
            : "hover:text-[var(--foreground)]"
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
