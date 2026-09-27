import React from "react";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-7 w-48 rounded-lg bg-[var(--muted)]" />
        <div className="h-4 w-72 rounded-md bg-[var(--muted)]/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          <div className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
          <div className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
          <div className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        </div>
        <div className="h-64 rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
      </div>
    </div>
  );
}
