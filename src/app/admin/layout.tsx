import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowLeft, Database } from "lucide-react";
import { verifyAdminAuthorization } from "@/lib/auth/admin";
import { AdminShellClient } from "@/components/admin/AdminShellClient";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await verifyAdminAuthorization();

  if (auth.unauthenticated) {
    redirect("/auth/login?redirectTo=/admin/dashboard");
  }

  if (!auth.authorized) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>403 Forbidden · Admin Access Required</span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Forbidden: Administrator privileges required
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">
              Your account does not currently have administrator privileges in{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--muted)]">
                public.user_roles
              </code>
              . Administrative routes and import pipelines are restricted to verified administrators.
            </p>
          </div>

          {auth.schemaMissing && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                <Database className="w-4 h-4 shrink-0" />
                <span>Database Schema Not Initialized</span>
              </div>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                The <code className="font-mono">public.user_roles</code> table was not found in your Supabase project. Run{" "}
                <code className="font-mono">supabase/full_production_schema.sql</code> in the Supabase SQL Editor to create all tables and assign your administrator role.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Student Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShellClient>{children}</AdminShellClient>;
}
