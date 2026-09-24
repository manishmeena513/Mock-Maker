import React from "react";
import Link from "next/link";
import { getSavedQuestions, getUserMistakes } from "@/lib/db";
import { RevisionHubClient } from "@/components/revision/RevisionHubClient";
import { RotateCcw } from "lucide-react";

export default async function RevisionPage() {
  const savedBookmarks = await getSavedQuestions();
  const userMistakes = await getUserMistakes();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Personal Revision Hub
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Targeted Revision & Mistake Pool
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Re-practice bookmarked high-yield items and drill down into past mistakes categorized by learning gap.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/25"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Custom Mock</span>
          </Link>
        </div>
      </div>

      {/* Interactive Client Hub */}
      <RevisionHubClient
        initialSaved={savedBookmarks}
        initialMistakes={userMistakes}
      />
    </div>
  );
}
