import React from "react";

export default function PricingLoading() {
  return (
    <div className="mm-container py-8 sm:py-12 space-y-10 animate-fade-in">
      {/* Header skeleton */}
      <div className="max-w-2xl space-y-3 pb-6 border-b border-[var(--border)]">
        <div className="h-3.5 w-36 rounded mm-skeleton" />
        <div className="h-9 sm:h-10 w-96 rounded-lg mm-skeleton" />
        <div className="h-4 w-full rounded mm-skeleton" />
      </div>

      {/* 3 cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 space-y-6"
          >
            <div className="space-y-2">
              <div className="h-6 w-24 rounded mm-skeleton" />
              <div className="h-3.5 w-40 rounded mm-skeleton" />
            </div>
            <div className="h-10 w-28 rounded mm-skeleton" />
            <div className="space-y-3 pt-4 border-t border-[var(--border)]">
              <div className="h-4 w-full rounded mm-skeleton" />
              <div className="h-4 w-4/5 rounded mm-skeleton" />
              <div className="h-4 w-3/4 rounded mm-skeleton" />
              <div className="h-4 w-2/3 rounded mm-skeleton" />
            </div>
            <div className="h-10 w-full rounded-md mm-skeleton mt-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
