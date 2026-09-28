"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ModeToggle } from "./ModeToggle";
import { BrandLogo } from "./BrandLogo";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Menu,
  User,
  X,
  CreditCard,
  ArrowRight,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Loader2,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useAIAssistant } from "@/components/ai/AIAssistantContext";

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
  const { isOpen: isAIOpen, toggleAssistant } = useAIAssistant();

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
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // continue if Supabase client is unconfigured in local dev
      }

      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      // safe fallback
    } finally {
      try {
        window.dispatchEvent(new Event("mockmaster:logout"));
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

      router.replace("/auth/login");
      router.refresh();
    }
  };

  // Section 8: Desktop Navigation -> Logo | Dashboard | Exams | Practice | Revision | Analytics
  const navItems = [
    { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard" },
    { href: "/exam/upsc-cse", label: "Exams", active: pathname.startsWith("/exam") },
    { href: "/mock/configure", label: "Practice", active: pathname.startsWith("/mock/configure") },
    { href: "/revision", label: "Revision", active: pathname.startsWith("/revision") },
    { href: "/pricing", label: "Pricing", active: pathname.startsWith("/pricing") },
  ];

  const isAdmin = sessionUser?.role === "admin";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)]/92 backdrop-blur-md">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Focused Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group focus:outline-none">
            <BrandLogo size="md" />
          </Link>

          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  item.active
                    ? "text-[var(--foreground)] font-semibold bg-[var(--muted)]/80"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/40"
                }`}
              >
                {item.label}
                {item.active && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[var(--accent)] rounded-full" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Search, AI Assistant, Theme Toggle, Profile & Primary CTA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAssistant}
            aria-label="Toggle AI Assistant"
            title="MockMaster AI — Exam Preparation Assistant"
            data-testid="navbar-ai-assistant-toggle"
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isAIOpen
                ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden lg:inline">AI Assistant</span>
            <span className="lg:hidden">AI</span>
          </button>

          <Link
            href="/search"
            aria-label="Search Question Repository"
            title="Search Question Repository"
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors ${
              pathname.startsWith("/search")
                ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Search</span>
          </Link>

          <ModeToggle />

          {/* Desktop Profile Dropdown */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Account and Logout Menu"
              className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] border border-[var(--border)] bg-[var(--card)] transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <span className="max-w-[100px] truncate">
                {sessionUser ? sessionUser.name : "Account"}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase tracking-wider ${
                  userPlan === "ELITE"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]"
                    : userPlan === "PRO"
                    ? "bg-[var(--plum-soft)] text-[var(--plum)] border border-[var(--plum-border)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {userPlan}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg py-1.5 z-50 animate-editorial"
              >
                <div className="px-3.5 py-2.5 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                      {sessionUser ? sessionUser.name : "Aspirant Workspace"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--muted)] text-[var(--foreground)]">
                      {userPlan}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
                    {sessionUser ? sessionUser.email : "Serious preparation. Measurable progress."}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--muted)]/60 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <span>Dashboard &amp; Analytics</span>
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--muted)]/60 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <span>Plans &amp; Billing ({userPlan})</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--accent)] font-medium hover:bg-[var(--muted)]/60 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Control Center</span>
                    </Link>
                  )}
                </div>

                <div className="pt-1 border-t border-[var(--border)] px-1.5 space-y-0.5">
                  {!sessionUser && (
                    <Link
                      href="/auth/login"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                    >
                      <User className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                      <span>Sign In / Switch Account</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    data-testid="navbar-logout-button"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-[var(--destructive)] hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Signing out...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <span>Start Mock</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Clean Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-3 animate-editorial">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                {sessionUser ? sessionUser.name : "Aspirant Workspace"}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                {sessionUser ? sessionUser.email : "Active Session"}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]">
              {userPlan}
            </span>
          </div>

          <nav aria-label="Mobile Navigation" className="grid grid-cols-1 gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors ${
                  item.active
                    ? "bg-[var(--muted)] text-[var(--foreground)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                }`}
              >
                <span>{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-40" />
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                toggleAssistant();
              }}
              className="w-full px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between text-[var(--accent)] hover:bg-[var(--muted)]/50 transition-colors"
            >
              <span>AI Assistant (Exam Mentor)</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <span>Search Questions</span>
              <Search className="w-3.5 h-3.5 opacity-40" />
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between text-[var(--accent)]"
              >
                <span>Admin Control Center</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
            {!sessionUser && (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-md text-xs font-medium text-center border border-[var(--border)] text-[var(--foreground)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-md text-xs font-medium text-center bg-[var(--primary)] text-[var(--primary-foreground)]"
                >
                  Create Account
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="mobile-logout-button"
              className="w-full py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 border border-rose-500/25 bg-rose-500/10 text-[var(--destructive)]"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
