"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sliders, Bookmark, Search, Sparkles } from "lucide-react";
import { useAIAssistant } from "@/components/ai/AIAssistantContext";

const WORKSPACE_PREFIXES = [
  "/dashboard",
  "/mock/configure",
  "/revision",
  "/search",
  "/exam/",
  "/results/",
];

/**
 * Clean, distraction-free editorial workspace shell.
 * Eliminates the duplicate desktop left sidebar that previously crowded the viewport,
 * while providing a subtle mobile bottom bar on small screens.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOpen: isAIOpen, toggleAssistant } = useAIAssistant();
  const isWorkspaceRoute = WORKSPACE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isWorkspaceRoute) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <div className="flex-1 flex flex-col w-full">
      <main className="flex-1 min-w-0 pb-14 md:pb-0">{children}</main>

      {/* Subtle Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-13 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] grid grid-cols-5 px-2"
      >
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            pathname.startsWith("/dashboard")
              ? "text-[var(--foreground)] font-semibold"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/mock/configure"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            pathname.startsWith("/mock/configure")
              ? "text-[var(--foreground)] font-semibold"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Practice</span>
        </Link>
        <Link
          href="/revision"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            pathname.startsWith("/revision")
              ? "text-[var(--foreground)] font-semibold"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Revision</span>
        </Link>
        <Link
          href="/search"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            pathname.startsWith("/search")
              ? "text-[var(--foreground)] font-semibold"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </Link>
        <button
          type="button"
          onClick={toggleAssistant}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            isAIOpen
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>AI Mentor</span>
        </button>
      </nav>
    </div>
  );
}
