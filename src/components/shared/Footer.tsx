"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";

export function Footer() {
  const pathname = usePathname();

  // Do not render footer during an active mock test session (distraction-free mode)
  if (
    pathname.startsWith("/mock/") &&
    !pathname.startsWith("/mock/configure")
  ) {
    return null;
  }

  const currentYear = new Date().getFullYear() || 2026;

  return (
    <footer
      role="contentinfo"
      className="border-t border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0b0f17] text-slate-600 dark:text-slate-400 transition-colors"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
          {/* Brand & Tagline */}
          <div className="space-y-1.5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                Mock<span className="text-blue-600 dark:text-blue-400">Master</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                <ShieldCheck className="w-3 h-3" />
                Verified PYQ Engine
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Authentic competitive-exam preparation with customizable PYQ/Model ratios, real commission negative marking, and diagnostic performance analytics.
            </p>
          </div>

          {/* Quick Links */}
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            <Link
              href="/dashboard"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/mock/configure"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Configure Mock
            </Link>
            <Link
              href="/revision"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Revision Hub
            </Link>
            <Link
              href="/search"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Question Explorer
            </Link>
            <Link
              href="/pricing"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Plans & Pricing
            </Link>
          </nav>
        </div>

        {/* Bottom Attribution & Copyright */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Developed by <span className="font-semibold text-slate-900 dark:text-white">Manish Meena</span>
          </p>
          <p>
            © 2026 MockMaster. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
