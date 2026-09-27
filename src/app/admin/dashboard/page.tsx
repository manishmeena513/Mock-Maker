import React from "react";
import Link from "next/link";
import {
  getAllQuestions,
  getImportBatches,
  getAllSubscriptionsForAdmin,
  getAllPaymentTransactionsForAdmin,
  getAIGenerationLogs,
  getSystemSettings,
  getAllExamsForAdmin,
} from "@/lib/db";
import {
  UploadCloud,
  ArrowRight,
  CreditCard,
  Settings,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

export default async function AdminDashboardPage() {
  const [
    allQuestions,
    importBatches,
    subscriptions,
    paymentTransactions,
    aiLogs,
    systemSettings,
    allExams,
  ] = await Promise.all([
    getAllQuestions(),
    getImportBatches(),
    getAllSubscriptionsForAdmin(),
    getAllPaymentTransactionsForAdmin(),
    getAIGenerationLogs(8),
    getSystemSettings(),
    getAllExamsForAdmin(),
  ]);

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
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
            Content Management &amp; Integrity
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)] mt-1">
            Platform Quality Overview
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Monitor question bank verification states, moderate AI model items, and audit bulk CSV/ZIP imports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/model-questions"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md font-medium text-xs border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition"
          >
            <span>Moderation Queue ({pendingModelCount})</span>
          </Link>
          <Link
            href="/admin/questions?tab=import"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md font-medium text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import ZIP / CSV</span>
          </Link>
        </div>
      </div>

      {/* Inline 8-Metric Editorial Strip */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Total Bank
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--foreground)] mt-1">
              {totalQuestions}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--sage)]">
              Approved PYQ
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--sage)] mt-1">
              {approvedPyqCount}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)]">
              Pending PYQ
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--accent)] mt-1">
              {pendingPyqCount}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--plum)]">
              Approved Model
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--plum)] mt-1">
              {approvedModelCount}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)]">
              Pending Model
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--accent)] mt-1">
              {pendingModelCount}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-600">
              Rejected
            </div>
            <div className="text-2xl font-mono font-semibold text-rose-600 mt-1">
              {rejectedCount}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Batches
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--foreground)] mt-1">
              {importBatchCount}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              AI Generated
            </div>
            <div className="text-2xl font-mono font-semibold text-[var(--foreground)] mt-1">
              {aiGeneratedActivityCount}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Editorial Rows */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y md:divide-y-0 md:divide-x divide-[var(--border)] grid grid-cols-1 md:grid-cols-3">
        <div className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] mb-1">
              01 / Archive Pipeline
            </div>
            <h3 className="font-semibold text-base text-[var(--foreground)]">
              Bulk Import Pipeline (ZIP / CSV)
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Upload recursive ZIP archives or CSV spreadsheets with automatic path-traversal protection, Zod validation, and SHA-256 duplicate checks.
            </p>
          </div>
          <Link
            href="/admin/questions?tab=import"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            <span>Launch Import Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--plum)] mb-1">
              02 / AI Quality Gate
            </div>
            <h3 className="font-semibold text-base text-[var(--foreground)]">
              Model Question Review Queue
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Audit AI-generated model questions for factual accuracy and structured explanations before approving for the 20% pool.
            </p>
          </div>
          <Link
            href="/admin/model-questions"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--plum)] hover:underline"
          >
            <span>Open Moderation Queue ({pendingModelCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--sage)] mb-1">
              03 / Examination Catalog
            </div>
            <h3 className="font-semibold text-base text-[var(--foreground)]">
              Exam Syllabi &amp; Marking Schemes
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Manage all {allExams.length} competitive exam syllabi, marking penalties, durations, and subject-topic hierarchies.
            </p>
          </div>
          <Link
            href="/admin/exams"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sage)] hover:underline"
          >
            <span>Configure Taxonomy ({allExams.length} Exams)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Subscriptions & Payments Ledger + System Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[var(--sage)]" />
              <div>
                <h3 className="font-semibold text-sm text-[var(--foreground)]">
                  Subscriptions &amp; Payment Ledger
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Active FREE / PRO / ELITE plans &amp; Razorpay transactions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="pyq">{subscriptions.length} Subs</Badge>
              <Badge variant="default">{paymentTransactions.length} Txns</Badge>
            </div>
          </div>

          {paymentTransactions.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-[var(--muted-foreground)]">
              No payment transactions recorded yet. Razorpay orders (`PRO_MONTHLY`, `PRO_YEARLY`, `ELITE_MONTHLY`, `ELITE_YEARLY`) appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--muted)]/60 text-[var(--muted-foreground)] font-mono uppercase tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paymentTransactions.slice(0, 6).map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--muted)]/40 transition">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--muted-foreground)]">
                        {tx.provider_order_id}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[var(--foreground)]">
                        {tx.plan_code}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold tabular-nums text-[var(--foreground)]">
                        ₹{Math.round((tx.amount_paise || 0) / 100)}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={tx.status === "paid" ? "pyq" : tx.status === "failed" ? "danger" : "warning"}>
                          {tx.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-[var(--muted-foreground)] tabular-nums">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-[var(--accent)]" />
                <div>
                  <h3 className="font-semibold text-sm text-[var(--foreground)]">
                    System Settings &amp; AI Telemetry
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Runtime parameters &amp; Gemini synthesis status
                  </p>
                </div>
              </div>
              <Badge variant="model">{aiLogs.length} AI Runs</Badge>
            </div>

            <div className="mt-4 space-y-2">
              {Object.entries(systemSettings).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-[var(--muted)]/40 border border-[var(--border)] text-xs"
                >
                  <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{key}</span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>
              Active Catalog Exams:{" "}
              <strong className="font-mono text-[var(--foreground)]">
                {allExams.filter((e) => e.is_active !== false).length} / {allExams.length}
              </strong>
            </span>
            <Link href="/pricing" className="text-[var(--accent)] font-medium hover:underline">
              View Pricing Page →
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Import Batches Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-[var(--foreground)]">
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
              <thead className="bg-[var(--muted)]/60 text-[var(--muted-foreground)] font-mono uppercase tracking-wider border-b border-[var(--border)]">
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
                    <td className="py-3 px-4 font-medium text-[var(--foreground)]">
                      {b.filename}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{b.import_type}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--sage)] tabular-nums">
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
                        className="text-[var(--accent)] font-medium hover:underline"
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
