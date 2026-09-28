"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  UploadCloud,
  BookOpen,
  ArrowUpRight,
  LogOut,
  Loader2,
  GitBranch,
} from "lucide-react";
import { ModeToggle } from "@/components/shared/ModeToggle";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { createClient } from "@/lib/supabase/client";

const ADMIN_NAV = [
  {
    name: "Overview & Settings",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Question Bank",
    href: "/admin/questions",
    icon: Layers,
  },
  {
    name: "ZIP / CSV Import",
    href: "/admin/questions?tab=import",
    icon: UploadCloud,
  },
  {
    name: "GitHub Importer",
    href: "/admin/import/github",
    icon: GitBranch,
  },
  {
    name: "AI Moderation Queue",
    href: "/admin/model-questions",
    icon: Sparkles,
  },
  {
    name: "Exams & Taxonomy (22)",
    href: "/admin/exams",
    icon: BookOpen,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleAdminLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // continue
      }
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      // continue
    } finally {
      try {
        window.dispatchEvent(new Event("mockmaster:logout"));
        const preservedTheme = window.localStorage.getItem("theme");
        window.localStorage.clear();
        if (preservedTheme) window.localStorage.setItem("theme", preservedTheme);
        window.sessionStorage.clear();
      } catch {
        // ignore
      }
      setIsLoggingOut(false);
      router.replace("/auth/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Top Editorial CMS Bar */}
      <header className="sticky top-0 z-40 h-16 bg-[var(--background)]/92 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/30">
                CMS Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <ModeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition"
            >
              <span>Student Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            </Link>
            <button
              type="button"
              onClick={handleAdminLogout}
              disabled={isLoggingOut}
              data-testid="admin-logout-button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Navigation Bar */}
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto h-11 text-xs font-medium">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const baseHref = item.href.split("?")[0];
            const isActive =
              pathname === baseHref &&
              (item.href.includes("tab=import") ? false : true);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--muted)] text-[var(--foreground)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
