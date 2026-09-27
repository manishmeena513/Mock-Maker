"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  const pathname = usePathname();

  // Hide footer during active test sessions
  if (
    (pathname.startsWith("/mock/") && !pathname.startsWith("/mock/configure")) ||
    pathname.startsWith("/test/")
  ) {
    return null;
  }

  return (
    <footer
      role="contentinfo"
      className="border-t border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] transition-colors"
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo size="sm" subtitle="Serious preparation. Measurable progress." />
            </Link>
          </div>

          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[var(--muted-foreground)]"
          >
            <Link href="/dashboard" className="hover:text-[var(--foreground)] transition-colors">
              Dashboard
            </Link>
            <Link href="/exam/upsc-cse" className="hover:text-[var(--foreground)] transition-colors">
              Exams
            </Link>
            <Link href="/mock/configure" className="hover:text-[var(--foreground)] transition-colors">
              Practice
            </Link>
            <Link href="/revision" className="hover:text-[var(--foreground)] transition-colors">
              Revision
            </Link>
            <Link href="/search" className="hover:text-[var(--foreground)] transition-colors">
              Search
            </Link>
            <Link href="/pricing" className="hover:text-[var(--foreground)] transition-colors">
              Pricing
            </Link>
          </nav>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
          <p>
            Developed by <span className="font-medium text-[var(--foreground)]">Manish Meena</span>
          </p>
          <p>© 2026 MockMaster. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
