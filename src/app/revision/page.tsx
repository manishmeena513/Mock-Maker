import React from "react";
import Link from "next/link";
import { getSavedQuestions, getUserMistakes } from "@/lib/db";
import { RevisionHubClient } from "@/components/revision/RevisionHubClient";
import { Search, ArrowRight } from "lucide-react";

export default async function RevisionPage() {
  const savedBookmarks = await getSavedQuestions();
  const userMistakes = await getUserMistakes();

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>Retention &amp; Error Register</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Revision Hub
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Review saved questions, drill classified mistakes, and isolate recurring weak areas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            <span>Question Bank</span>
          </Link>
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <span>Start Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <RevisionHubClient initialSaved={savedBookmarks} initialMistakes={userMistakes} />
    </div>
  );
}
