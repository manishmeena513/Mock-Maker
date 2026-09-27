import React from "react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-pulse">
        <div className="space-y-2 pb-6 border-b border-[var(--border)]">
          <div className="h-4 w-36 rounded bg-[var(--muted)]" />
          <div className="h-8 w-80 rounded-lg bg-[var(--muted)]" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
          <div className="lg:col-span-5 h-72 rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        </div>
      </div>
    </div>
  );
}
