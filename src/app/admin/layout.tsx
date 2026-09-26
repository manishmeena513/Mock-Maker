"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  UploadCloud,
  Award,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { ModeToggle } from "@/components/shared/ModeToggle";

const ADMIN_NAV = [
  {
    name: "Overview",
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
    name: "Exams & Taxonomy",
    href: "/admin/exams",
    icon: Award,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Top CMS Bar */}
      <header className="sticky top-0 z-40 h-16 bg-[var(--card)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">
                    MockMaster CMS
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] hidden sm:block">
                  Question Verification &amp; Syllabus Controller
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition"
            >
              <span>Student Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Secondary Navigation Bar */}
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
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
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
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
