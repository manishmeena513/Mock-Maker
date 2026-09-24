import React from "react";
import Link from "next/link";
import { getAllQuestions, getExams, getImportBatches } from "@/lib/db";
import {
  Layers,
  ShieldCheck,
  Sparkles,
  Clock,
  UploadCloud,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Award,
  XCircle,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const allQuestions = await getAllQuestions();
  const exams = await getExams();
  const importBatches = await getImportBatches();

  // Explicit Phase 3 Quality Control Metrics
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
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Administrative Control Center
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Platform Analytics & Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage question bank verification, review AI-generated items, and monitor bulk import batches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions?tab=import"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import ZIP / CSV</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid: Exactly 8 Administrative Quality Control Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Questions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Total Questions</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {totalQuestions}
          </div>
          <p className="text-xs text-slate-500 mt-1">In question bank</p>
        </div>

        {/* 2. Approved PYQs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Approved PYQs</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {approvedPyqCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active in 80% mocks</p>
        </div>

        {/* 3. Pending PYQs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Pending PYQs</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {pendingPyqCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">From CSV/ZIP imports</p>
        </div>

        {/* 4. Approved Model Questions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Approved Model</span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            {approvedModelCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active in 20% mocks</p>
        </div>

        {/* 5. Pending Model Questions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Pending Model</span>
          </div>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
            {pendingModelCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Awaiting review</p>
        </div>

        {/* 6. Rejected Questions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>Rejected Items</span>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
            {rejectedCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Excluded from tests</p>
        </div>

        {/* 7. Import Batches */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4" />
            <span>Import Batches</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {importBatchCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total batches logged</p>
        </div>

        {/* 8. AI Generation Activity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>AI Activity</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {aiGeneratedActivityCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Model items generated</p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Bulk Import (ZIP / CSV)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload a ZIP archive containing multiple CSV files with duplicate detection, Zod validation, and batch tracking.
            </p>
          </div>
          <Link
            href="/admin/questions?tab=import"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>Open Importer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Model Question Review Queue
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Review, approve, or reject AI-generated questions before they are made live in student mocks.
            </p>
          </div>
          <Link
            href="/admin/model-questions"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Review Queue ({pendingModelCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Exam Syllabi & Marking Schemes
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure supported examinations, subjects, topics, and negative marking penalty formulas.
            </p>
          </div>
          <Link
            href="/admin/exams"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            <span>Manage Taxonomy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Import Batches Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Recent Question Import Batches
          </h3>
          <span className="text-xs text-slate-500">
            {importBatches.length} total batches processed
          </span>
        </div>

        {importBatches.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No bulk imports run yet. Upload a CSV or ZIP file to populate questions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">Filename</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Imported Rows</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {importBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px]">{b.id}</td>
                    <td className="py-2.5 px-3 font-semibold">{b.filename}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                        {b.import_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{b.imported_rows}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold capitalize">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/admin/questions?batchId=${b.id}`}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        View Batch →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
