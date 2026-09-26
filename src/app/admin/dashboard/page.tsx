import React from "react";
import Link from "next/link";
import { getAllQuestions, getImportBatches } from "@/lib/db";
import {
  Layers,
  ShieldCheck,
  Sparkles,
  Clock,
  UploadCloud,
  ArrowRight,
  Award,
  XCircle,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

export default async function AdminDashboardPage() {
  const allQuestions = await getAllQuestions();
  const importBatches = await getImportBatches();

  // 8 Administrative Quality Control Metrics
  const totalQuestions = allQuestions.length;
  const approvedPyqCount = allQuestions.filter(
    (q) => q.type === "PYQ" && q.verification_status === "approved"
  ).length;
  const pendingPyqCount = allQuestions.filter(
    (q) => q.type === "PYQ" && q.verification_status === "pending"
  ).length;
  const approvedModelCount = allQuestions.filter(
    (q) => q.type === "MODEL" && q.verification_status === "approved"
  ).length;
  const pendingModelCount = allQuestions.filter(
    (q) => q.type === "MODEL" && q.verification_status === "pending"
  ).length;
  const rejectedCount = allQuestions.filter(
    (q) => q.verification_status === "rejected"
  ).length;
  const importBatchCount = importBatches.length;
  const aiGeneratedActivityCount = allQuestions.filter(
    (q) => q.import_source_filename?.startsWith("AI_") || q.id.startsWith("ai-model-")
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Content Management &amp; Integrity
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Platform Quality Overview
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Monitor question bank verification states, moderate AI model items, and audit bulk CSV/ZIP imports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/model-questions"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-xs border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Moderation Queue ({pendingModelCount})</span>
          </Link>
          <Link
            href="/admin/questions?tab=import"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-xs bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import ZIP / CSV</span>
          </Link>
        </div>
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Total Questions</span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums mt-2">
            {totalQuestions}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Total repository items</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            <span>Approved PYQs</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
            {approvedPyqCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Eligible for 80% PYQ pool</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span>Pending PYQs</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-2">
            {pendingPyqCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Awaiting verification</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center justify-between">
            <span>Approved Model</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-2">
            {approvedModelCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Eligible for 20% Model pool</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span>Pending Model</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-2">
            {pendingModelCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">In AI moderation queue</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center justify-between">
            <span>Rejected Items</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-2">
            {rejectedCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Excluded from student mocks</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Import Batches</span>
            <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums mt-2">
            {importBatchCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Logged archive uploads</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>AI Generated</span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums mt-2">
            {aiGeneratedActivityCount}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Total Gemini synthesis items</p>
        </Card>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[var(--foreground)]">
              Bulk Import Pipeline (ZIP / CSV)
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Upload recursive ZIP archives or CSV spreadsheets with automatic path-traversal protection, Zod validation, and SHA-256 duplicate checks.
            </p>
          </div>
          <Link
            href="/admin/questions?tab=import"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>Launch Import Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[var(--foreground)]">
              Model Question Review Queue
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Audit AI-generated model questions for factual accuracy and structured explanations before approving for the 20% pool.
            </p>
          </div>
          <Link
            href="/admin/model-questions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Open Moderation Queue ({pendingModelCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[var(--foreground)]">
              Exam Syllabi &amp; Marking Schemes
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Manage UPSC CSE, UPPSC, and SSC CGL marking penalties, durations, and subject-topic hierarchies.
            </p>
          </div>
          <Link
            href="/admin/exams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            <span>Configure Taxonomy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* Recent Import Batches Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[var(--foreground)]">
              Recent Question Import Batches
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Audit trail of uploaded CSV and ZIP question archives
            </p>
          </div>
          <Badge variant="default">{importBatches.length} Batches</Badge>
        </div>

        {importBatches.length === 0 ? (
          <div className="text-center py-10 text-xs text-[var(--muted-foreground)]">
            No bulk imports recorded yet. Upload a CSV or ZIP archive to populate the repository.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--muted)]/60 text-[var(--muted-foreground)] uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Archive / Filename</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Imported Rows</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {importBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--muted)]/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted-foreground)]">
                      {b.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                      {b.filename}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{b.import_type}</Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {b.imported_rows}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="pyq">{b.status.toUpperCase()}</Badge>
                    </td>
                    <td className="py-3 px-4 text-[var(--muted-foreground)] tabular-nums">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/questions?batchId=${b.id}`}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Inspect Batch →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
