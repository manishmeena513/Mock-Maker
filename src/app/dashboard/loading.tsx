import React from "react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mm-container py-8 sm:py-10 space-y-8">
        <div className="space-y-2 pb-6 border-b border-[var(--border)]">
          <div className="h-4 w-36 rounded mm-skeleton" />
          <div className="h-8 w-80 rounded-lg mm-skeleton" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-xl border border-[var(--border)] bg-[var(--card)] mm-skeleton"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 rounded-xl border border-[var(--border)] bg-[var(--card)] mm-skeleton" />
          <div className="lg:col-span-5 h-72 rounded-xl border border-[var(--border)] bg-[var(--card)] mm-skeleton" />
        </div>
      </div>
    </div>
  );
}
