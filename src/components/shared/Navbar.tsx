"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ModeToggle } from "./ModeToggle";
import { BrandLogo } from "./BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { isRealSupabaseConfigured } from "@/lib/auth/url";
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
  LogIn,
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
  const [authChecked, setAuthChecked] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("FREE");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isOpen: isAIOpen, toggleAssistant } = useAIAssistant();

  const refreshSession = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await r.json();
      if (data?.authenticated && data?.user) {
        setSessionUser(data.user);
        setUserPlan(data.plan || "FREE");
      } else {
        setSessionUser(null);
        setUserPlan("FREE");
      }
    } catch {
      // ignore network errors in offline/dev
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [pathname, refreshSession]);

  useEffect(() => {
    const handleAuthEvent = () => {
      void refreshSession();
    };
    window.addEventListener("mockmaster:auth-change", handleAuthEvent);

    if (!isRealSupabaseConfigured()) {
      return () => {
        window.removeEventListener("mockmaster:auth-change", handleAuthEvent);
      };
    }

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED" ||
          event === "SIGNED_OUT"
        ) {
          void refreshSession();
          if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            router.refresh();
          }
        }
      });
      subscription = data.subscription;
    } catch {
      // ignore if client unavailable
    }

    return () => {
      window.removeEventListener("mockmaster:auth-change", handleAuthEvent);
      subscription?.unsubscribe();
    };
  }, [refreshSession, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
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
        credentials: "same-origin",
      });
    } catch {
      // safe fallback
    } finally {
      try {
        window.dispatchEvent(new Event("mockmaster:logout"));
        window.dispatchEvent(new Event("mockmaster:auth-change"));
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

  // Section 8: Desktop Navigation -> Logo | Dashboard | Exams | Practice | Revision | Pricing
  const navItems = [
    { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard" },
    { href: "/exam/upsc-cse", label: "Exams", active: pathname.startsWith("/exam") },
    { href: "/mock/configure", label: "Practice", active: pathname.startsWith("/mock/configure") },
    { href: "/revision", label: "Revision", active: pathname.startsWith("/revision") },
    { href: "/pricing", label: "Pricing", active: pathname.startsWith("/pricing") },
  ];

  const isAdmin = sessionUser?.role === "admin";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] backdrop-glass">
      <div className="mm-container h-14 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Logo & Focused Navigation */}
        <div className="flex items-center gap-6 lg:gap-8 min-w-0">
          <Link href="/" className="group focus:outline-none shrink-0">
            <BrandLogo size="md" />
          </Link>

          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  item.active
                    ? "text-[var(--foreground)] font-semibold bg-[var(--muted)]/85"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/45"
                }`}
              >
                {item.label}
                {item.active && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[var(--accent)] rounded-full transition-all duration-200" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Search, AI Assistant, Theme Toggle, Profile & Primary CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleAssistant}
            aria-label="Toggle AI Assistant"
            title="MockMaster AI — Exam Preparation Assistant"
            data-testid="navbar-ai-assistant-toggle"
            className={`mm-btn-press inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border cursor-pointer ${
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
            className={`mm-btn-press inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border ${
              pathname.startsWith("/search")
                ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Search</span>
          </Link>

          <ModeToggle />

          {/* Desktop Auth / Profile Section */}
          {sessionUser ? (
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Account and Logout Menu"
                className="mm-btn-press inline-flex items-center gap-2 h-8 px-2.5 rounded-md text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] border border-[var(--border)] bg-[var(--card)] cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <span className="max-w-[110px] truncate">{sessionUser.name}</span>
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
                <ChevronDown
                  className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform duration-150 ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg py-1.5 z-50 animate-scale-in origin-top-right"
                >
                  <div className="px-3.5 py-2.5 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                        {sessionUser.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--muted)] text-[var(--foreground)]">
                        {userPlan}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
                      {sessionUser.email}
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
          ) : authChecked ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link
                href="/auth/login"
                data-testid="navbar-signin-link"
                className="mm-btn-press inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                <LogIn className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/auth/signup"
                data-testid="navbar-signup-link"
                className="mm-btn-press hidden lg:inline-flex items-center h-8 px-2.5 rounded-md text-xs font-medium border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-90"
              >
                <span>Create Account</span>
              </Link>
            </div>
          ) : null}

          <Link
            href="/mock/configure"
            className="mm-btn-press inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
          >
            <span className="hidden xs:inline sm:inline">Start Mock</span>
            <span className="xs:hidden sm:hidden">Mock</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="mm-btn-press md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Clean Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-3 animate-editorial shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                {sessionUser ? sessionUser.name : "Guest Session"}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] truncate">
                {sessionUser
                  ? sessionUser.email
                  : "Sign in to save mocks, analytics & bookmarks"}
              </div>
            </div>
            {sessionUser && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] shrink-0">
                {userPlan}
              </span>
            )}
          </div>

          <nav aria-label="Mobile Navigation" className="grid grid-cols-1 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors ${
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
              className="w-full px-3 py-2.5 rounded-md text-xs font-medium flex items-center justify-between text-[var(--accent)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
            >
              <span>AI Assistant (Exam Mentor)</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-md text-xs font-medium flex items-center justify-between text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <span>Search Questions</span>
              <Search className="w-3.5 h-3.5 opacity-40" />
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md text-xs font-medium flex items-center justify-between text-[var(--accent)]"
              >
                <span>Admin Control Center</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
            {!sessionUser ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mm-btn-press py-2.5 px-3 rounded-md text-xs font-medium text-center border border-[var(--border)] text-[var(--foreground)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mm-btn-press py-2.5 px-3 rounded-md text-xs font-medium text-center bg-[var(--primary)] text-[var(--primary-foreground)]"
                >
                  Create Account
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                data-testid="mobile-logout-button"
                className="mm-btn-press w-full py-2.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 border border-rose-500/25 bg-rose-500/10 text-[var(--destructive)] cursor-pointer"
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
            )}
          </div>
        </div>
      )}
    </header>
  );
}
