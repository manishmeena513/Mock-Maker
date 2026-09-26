"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/primitives";

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
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-lg text-[var(--foreground)]">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <BookOpenCheck className="w-4 h-4" />
            </div>
            <span>MockMaster</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] mt-4">
            Reset Password
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Enter your registered email address to receive a password recovery link.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              If an account exists for <span className="font-semibold">{email}</span>, a password recovery link has been dispatched.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
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
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {loading ? "Sending recovery link..." : "Send Recovery Link"}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
