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
 * while providing a safe-area-aware mobile bottom bar on small screens.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOpen: isAIOpen, toggleAssistant } = useAIAssistant();
  const isWorkspaceRoute = WORKSPACE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isWorkspaceRoute) {
    return <main className="flex-1 flex flex-col min-w-0">{children}</main>;
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname.startsWith("/dashboard"),
    },
    {
      href: "/mock/configure",
      label: "Practice",
      icon: Sliders,
      active: pathname.startsWith("/mock/configure"),
    },
    {
      href: "/revision",
      label: "Revision",
      icon: Bookmark,
      active: pathname.startsWith("/revision"),
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      active: pathname.startsWith("/search"),
    },
  ];

  return (
    <div className="flex-1 flex flex-col w-full min-w-0">
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>

      {/* Subtle Mobile Bottom Navigation Bar with iOS/Android safe-area support */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 backdrop-glass border-t border-[var(--border)] grid grid-cols-5 px-1.5 safe-pb"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors ${
                item.active
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.active && (
                <span className="absolute top-0 inset-x-4 h-[2px] rounded-b-full bg-[var(--accent)]" />
              )}
              <Icon className={`w-4 h-4 ${item.active ? "text-[var(--accent)]" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleAssistant}
          className={`relative flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium cursor-pointer transition-colors ${
            isAIOpen
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {isAIOpen && (
            <span className="absolute top-0 inset-x-4 h-[2px] rounded-b-full bg-[var(--accent)]" />
          )}
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span>AI Mentor</span>
        </button>
      </nav>
    </div>
  );
}
