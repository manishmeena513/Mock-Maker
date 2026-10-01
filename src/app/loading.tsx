import React from "react";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mm-container py-10 space-y-6">
        <div className="h-7 w-48 rounded-lg mm-skeleton" />
        <div className="h-4 w-72 rounded-md mm-skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          <div className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--card)] mm-skeleton" />
          <div className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--card)] mm-skeleton" />
          <div className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--card)] mm-skeleton" />
        </div>
        <div className="h-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] mm-skeleton" />
      </div>
    </div>
  );
}
