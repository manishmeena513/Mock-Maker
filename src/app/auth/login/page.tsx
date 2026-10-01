"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, AlertCircle, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/shared/BrandLogo";
import {
  getClientAuthCallbackUrl,
  isRealSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/auth/url";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectToParam = searchParams.get("redirectTo") || searchParams.get("next");
  const errorParam = searchParams.get("error");
  const targetPath = sanitizeRedirectPath(redirectToParam, "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(errorParam);

  useEffect(() => {
    if (errorParam) {
      setErrorMsg(errorParam);
    }
  }, [errorParam]);

  // If the user is already authenticated on the server, redirect immediately to targetPath
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && data?.user && isRealSupabaseConfigured()) {
          router.replace(targetPath);
          router.refresh();
        }
      })
      .catch(() => {
        // ignore network errors
      });
    return () => {
      active = false;
    };
  }, [router, targetPath]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (!isRealSupabaseConfigured()) {
          router.replace(targetPath);
          router.refresh();
          return;
        }
        setErrorMsg(error.message || "Invalid email or password. Please try again.");
        return;
      }

      if (data?.session) {
        window.dispatchEvent(new Event("mockmaster:auth-change"));
        router.replace(targetPath);
        router.refresh();
      } else {
        setErrorMsg("Unable to establish an active session. Please verify your email first.");
      }
    } catch (err) {
      if (!isRealSupabaseConfigured()) {
        router.replace(targetPath);
        router.refresh();
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to sign in right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const callbackUrl = getClientAuthCallbackUrl(targetPath);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        if (!isRealSupabaseConfigured()) {
          router.replace(targetPath);
          return;
        }
        setErrorMsg(error.message || "Google sign-in failed. Please try again.");
        setGoogleLoading(false);
      }
    } catch (err) {
      if (!isRealSupabaseConfigured()) {
        router.replace(targetPath);
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : "Google sign-in failed. Please try again."
      );
      setGoogleLoading(false);
    }
  };

  const signupHref =
    redirectToParam && redirectToParam !== "/dashboard"
      ? `/auth/signup?redirectTo=${encodeURIComponent(targetPath)}`
      : "/auth/signup";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="max-w-md w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-8">
        <div className="mb-7">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo size="md" />
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-5">
            Sign in to your workspace
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Access your mock attempt history, diagnostic analytics, and saved bookmarks.
          </p>
        </div>

        {redirectToParam && !errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium border border-[var(--accent-border)] flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Sign in first to use this feature.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aspirant@example.com"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                Password
              </label>
              <Link
                href="/auth/reset-password"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-10 rounded-md font-medium text-xs uppercase tracking-wider bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition cursor-pointer disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full h-10 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{googleLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
        </button>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Don&apos;t have an account?{" "}
          <Link href={signupHref} className="font-medium text-[var(--accent)] hover:underline">
            Create free account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[var(--background)]">
          <div className="max-w-md w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-xs text-[var(--muted-foreground)]">
            Loading sign-in workspace...
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
