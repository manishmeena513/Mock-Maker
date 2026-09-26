import React from "react";
import Link from "next/link";
import { getSavedQuestions, getUserMistakes } from "@/lib/db";
import { RevisionHubClient } from "@/components/revision/RevisionHubClient";
import { Sliders, Search } from "lucide-react";

export default async function RevisionPage() {
  const savedBookmarks = await getSavedQuestions();
  const userMistakes = await getUserMistakes();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200/90 dark:border-slate-800/90">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Knowledge & Retention Library
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Revision Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review bookmarked questions, drill classified mistakes, and strengthen weak syllabus concepts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Explore Questions</span>
          </Link>
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>New Mock</span>
          </Link>
        </div>
      </div>

      <RevisionHubClient initialSaved={savedBookmarks} initialMistakes={userMistakes} />
    </div>
  );
}
