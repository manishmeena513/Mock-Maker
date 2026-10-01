"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/shared/BrandLogo";
import {
  getClientAuthCallbackUrl,
  isRealSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/auth/url";

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectToParam = searchParams.get("redirectTo") || searchParams.get("next");
  const targetPath = sanitizeRedirectPath(redirectToParam, "/dashboard");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationSentMsg, setConfirmationSentMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setConfirmationSentMsg(null);

    try {
      const supabase = createClient();
      const callbackUrl = getClientAuthCallbackUrl(targetPath);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        if (!isRealSupabaseConfigured()) {
          router.replace(targetPath);
          router.refresh();
          return;
        }
        setErrorMsg(error.message || "Unable to create account. Please try again.");
        return;
      }

      // Case 1: Email confirmation is disabled in Supabase -> session is immediately active
      if (data?.session) {
        window.dispatchEvent(new Event("mockmaster:auth-change"));
        router.replace(targetPath);
        router.refresh();
        return;
      }

      // Case 2: Email confirmation is enabled -> user exists but session is null until verified
      if (data?.user && !data?.session) {
        setConfirmationSentMsg("Account created. Check your email to verify your account.");
        return;
      }

      router.replace(targetPath);
      router.refresh();
    } catch (err) {
      if (!isRealSupabaseConfigured()) {
        router.replace(targetPath);
        router.refresh();
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to create account right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
        setErrorMsg(error.message || "Google sign-up failed. Please try again.");
        setGoogleLoading(false);
      }
    } catch (err) {
      if (!isRealSupabaseConfigured()) {
        router.replace(targetPath);
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : "Google sign-up failed. Please try again."
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="max-w-md w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-8">
        <div className="mb-7">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo size="md" />
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-5">
            Create your aspirant account
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Start practicing with 80% verified PYQs and 20% syllabus-aligned model questions.
          </p>
        </div>

        {confirmationSentMsg && (
          <div className="mb-5 p-4 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{confirmationSentMsg}</span>
            </div>
            <p className="text-[11px] opacity-90">
              We sent a verification link to <span className="font-mono">{email}</span>. Click the link in your inbox to activate your workspace, or{" "}
              <Link href="/auth/login" className="underline font-semibold">
                proceed to Sign In
              </Link>
              .
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          </div>

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
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-10 rounded-md font-medium text-xs uppercase tracking-wider bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition cursor-pointer disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
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
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[var(--background)]">
          <div className="max-w-md w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-xs text-[var(--muted-foreground)]">
            Loading account registration...
          </div>
        </div>
      }
    >
      <SignupFormContent />
    </Suspense>
  );
}
