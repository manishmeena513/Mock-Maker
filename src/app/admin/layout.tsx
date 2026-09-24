import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Sparkles,
  UploadCloud,
  FileCheck,
  Award,
  ChevronRight,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Admin Subheader Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-slate-300">
              MockMaster Admin Console
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Question Bank & Verification Controller</span>
          </div>

          <div className="flex items-center gap-4 font-semibold text-slate-300">
            <Link href="/" className="hover:text-white transition">
              Exit to Student App →
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Navigation Strip */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto h-14 text-sm font-semibold">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition whitespace-nowrap"
          >
            <LayoutDashboard className="w-4 h-4 text-blue-500" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/questions"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Questions & Import</span>
          </Link>

          <Link
            href="/admin/model-questions"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Model Question Review</span>
          </Link>

          <Link
            href="/admin/exams"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition whitespace-nowrap"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Exams & Taxonomy</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
