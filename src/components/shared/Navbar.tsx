"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./ModeToggle";
import {
  Award,
  BookOpen,
  Compass,
  LayoutDashboard,
  Menu,
  Sliders,
  Sparkles,
  User,
  X,
  RotateCcw,
  CreditCard,
  ArrowRight,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Distraction-free test screen & dedicated Admin CMS shell handle their own headers
  if (pathname.startsWith("/test/") || pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Overview", exact: true },
    { href: "/exam/upsc-cse", label: "Examinations", matchPrefix: "/exam" },
    { href: "/mock/configure", label: "Configure Mock", matchPrefix: "/mock/configure" },
    { href: "/search", label: "Question Explorer", matchPrefix: "/search" },
    { href: "/revision", label: "Revision Hub", matchPrefix: "/revision" },
    { href: "/dashboard", label: "Analytics", matchPrefix: "/dashboard" },
    { href: "/pricing", label: "Pricing", matchPrefix: "/pricing" },
  ];

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.exact) return pathname === item.href;
    return item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Primary Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-900 dark:text-white group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white shadow-2xs group-hover:bg-blue-800 transition-colors">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight">MockMaster</span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                80:20 PYQ
              </span>
            </div>
          </Link>

          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Theme Toggle, Auth & Start Mock CTA */}
        <div className="flex items-center gap-2.5">
          <ModeToggle />

          <Link
            href="/auth/login"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Account</span>
          </Link>

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-2xs"
          >
            <span>Start Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] px-4 py-4 space-y-3 animate-in fade-in-50 duration-150">
          <nav aria-label="Mobile Navigation" className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    active
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-center border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-center bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
