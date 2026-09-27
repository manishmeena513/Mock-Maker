"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ModeToggle } from "./ModeToggle";
import { createClient } from "@/lib/supabase/client";
import {
  Award,
  LayoutDashboard,
  Menu,
  User,
  X,
  CreditCard,
  ArrowRight,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [userPlan, setUserPlan] = useState<string>("FREE");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.user) {
          setSessionUser(data.user);
        } else {
          setSessionUser(null);
        }
        if (data?.plan) {
          setUserPlan(data.plan);
        }
      })
      .catch(() => {
        // ignore network errors in offline/dev
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Distraction-free test screen & dedicated Admin CMS shell handle their own headers
  if (pathname.startsWith("/test/") || pathname.startsWith("/admin")) {
    return null;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // 1. Client-side Supabase signOut
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // continue if Supabase client is unconfigured in local dev
      }

      // 2. Server-side session & cookie termination
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      // Even if a network error occurs during signOut, clear local state and redirect safely
    } finally {
      // 3. Clear client-side user cache while preserving theme preference
      try {
        const preservedTheme = window.localStorage.getItem("theme");
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k !== "theme") {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        if (preservedTheme) {
          window.localStorage.setItem("theme", preservedTheme);
        }
        window.sessionStorage.clear();
      } catch {
        // ignore storage errors
      }

      setSessionUser(null);
      setUserPlan("FREE");
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
      setIsLoggingOut(false);

      // 4. Replace history entry and refresh router cache
      router.replace("/auth/login");
      router.refresh();
    }
  };

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
                PYQ Engine
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

        {/* Right: Theme Toggle, Account / Logout Dropdown & Start Mock CTA */}
        <div className="flex items-center gap-2.5">
          <ModeToggle />

          {/* Desktop Profile & Logout Dropdown */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Account and Logout Menu"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="max-w-[110px] truncate">
                {sessionUser ? sessionUser.name : "Account"}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  userPlan === "ELITE"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                    : userPlan === "PRO"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {userPlan}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e] shadow-lg py-2 z-50"
              >
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {sessionUser ? sessionUser.name : "Aspirant Workspace"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {userPlan} Plan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {sessionUser ? sessionUser.email : "Active Preparation Session"}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Analytics Dashboard</span>
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Plans &amp; Billing ({userPlan})</span>
                  </Link>
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Admin CMS</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 px-2 space-y-1">
                  {!sessionUser && (
                    <Link
                      href="/auth/login"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In / Switch Account</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    data-testid="navbar-logout-button"
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Logging out...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-2xs"
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
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] px-4 py-4 space-y-3">
          {/* Mobile User Identity & Plan Pill */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {sessionUser ? sessionUser.name : "Aspirant Account"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {sessionUser ? sessionUser.email : "Active Session"}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {userPlan} Plan
            </span>
          </div>

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

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="mobile-logout-button"
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
