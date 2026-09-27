"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="max-w-md w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo size="md" />
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-5">
            Reset Password
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Enter your registered email address to receive a password recovery link.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-[var(--sage-muted)] text-[var(--sage)] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              If an account exists for <span className="font-semibold">{email}</span>, a password recovery link has been dispatched.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md font-medium text-xs uppercase tracking-wider bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? "Sending recovery link..." : "Send Recovery Link"}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
