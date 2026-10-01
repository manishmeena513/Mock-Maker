import React from "react";

export default function SearchLoading() {
  return (
    <div className="mm-container py-8 sm:py-10 space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="pb-6 border-b border-[var(--border)] space-y-2">
        <div className="h-3.5 w-36 rounded mm-skeleton" />
        <div className="h-7 sm:h-8 w-52 rounded-lg mm-skeleton" />
        <div className="h-4 w-96 rounded mm-skeleton" />
      </div>

      {/* Filter box skeleton */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <div className="h-10 w-full rounded-md mm-skeleton" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="space-y-1">
              <div className="h-3 w-12 rounded mm-skeleton" />
              <div className="h-9 w-full rounded-md mm-skeleton" />
            </div>
          ))}
        </div>
      </div>

      {/* List items skeleton */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded mm-skeleton" />
              <div className="h-4 w-36 rounded mm-skeleton" />
            </div>
            <div className="h-4 w-4/5 rounded mm-skeleton" />
            <div className="h-4 w-2/3 rounded mm-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
