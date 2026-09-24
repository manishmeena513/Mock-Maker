"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./ModeToggle";
import { BookOpen, Sparkles, LayoutDashboard, Compass, Award } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const isTestActive = pathname.startsWith("/test/");

  // On active test screen, keep navbar minimal to prevent distractions
  if (isTestActive) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span>MockMaster</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                PRO
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname === "/"
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Exams
            </Link>
            <Link
              href="/mock/configure"
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname.startsWith("/mock/configure")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Generate Mock
            </Link>
            <Link
              href="/search"
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname.startsWith("/search")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Question Explorer
            </Link>
            <Link
              href="/revision"
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname.startsWith("/revision")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Revision Hub
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname.startsWith("/dashboard")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/pricing"
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname.startsWith("/pricing")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Pricing
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>80:20 PYQ Engine</span>
          </div>

          <ModeToggle />

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Test</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
