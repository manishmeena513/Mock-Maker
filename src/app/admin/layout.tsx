"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  UploadCloud,
  Award,
  ArrowUpRight,
  ShieldCheck,
  LogOut,
  Loader2,
} from "lucide-react";
import { ModeToggle } from "@/components/shared/ModeToggle";
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
    name: "AI Moderation Queue",
    href: "/admin/model-questions",
    icon: Sparkles,
  },
  {
    name: "Exams & Taxonomy (22)",
    href: "/admin/exams",
    icon: Award,
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
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top CMS Bar */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 dark:bg-[#131c2e]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                    MockMaster CMS
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Question Verification, Taxonomy CRUD &amp; Monetization Controller
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <ModeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span>Student Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={handleAdminLogout}
              disabled={isLoggingOut}
              data-testid="admin-logout-button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer disabled:opacity-50"
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
      <div className="bg-white dark:bg-[#131c2e] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto h-12 text-xs font-semibold">
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
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
