import React from "react";

export default function RevisionLoading() {
  return (
    <div className="mm-container py-8 sm:py-10 space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-2">
          <div className="h-3.5 w-32 rounded mm-skeleton" />
          <div className="h-7 sm:h-8 w-44 rounded-lg mm-skeleton" />
          <div className="h-4 w-72 rounded mm-skeleton" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 rounded-md mm-skeleton" />
          <div className="h-9 w-28 rounded-md mm-skeleton" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-6 border-b border-[var(--border)] pb-3">
        <div className="h-5 w-20 rounded mm-skeleton" />
        <div className="h-5 w-20 rounded mm-skeleton" />
        <div className="h-5 w-24 rounded mm-skeleton" />
      </div>

      {/* List items skeleton */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 rounded mm-skeleton" />
              <div className="h-4 w-32 rounded mm-skeleton" />
            </div>
            <div className="h-4 w-3/4 rounded mm-skeleton" />
            <div className="h-4 w-1/2 rounded mm-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
