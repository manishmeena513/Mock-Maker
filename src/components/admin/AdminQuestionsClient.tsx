"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Question, Exam, VerificationStatus } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { previewCsvImportAction, previewZipImportAction, confirmImportAction } from "@/app/actions/import";
import { ImportPreviewResult } from "@/lib/import/importService";
import {
  UploadCloud,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FileArchive,
  Check,
  Loader2,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

interface AdminQuestionsClientProps {
  initialQuestions: Question[];
  exams: Exam[];
  initialBatchId?: string;
  initialTab?: string;
}

const IMPORT_PIPELINE_STAGES = [
  "Uploading",
  "Extracting",
  "Scanning",
  "Parsing",
  "Validating",
  "Checking duplicates",
  "Ready for review",
] as const;

export function AdminQuestionsClient({
  initialQuestions,
  exams,
  initialBatchId,
  initialTab = "list",
}: AdminQuestionsClientProps) {
  const [activeTab, setActiveTab] = useState<"list" | "import">(
    initialTab === "import" ? "import" : "list"
  );
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

  // Filters
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>(initialBatchId || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"CSV" | "ZIP">("ZIP");
  const [isDragging, setIsDragging] = useState(false);
  const [pipelineStageIndex, setPipelineStageIndex] = useState<number>(-1);
  const [isProcessing, startProcessTransition] = useTransition();
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedExamId !== "all" && q.exam_id !== selectedExamId) return false;
      if (selectedStatus !== "all" && q.verification_status !== selectedStatus) return false;
      if (selectedType !== "all" && q.type !== selectedType) return false;
      if (batchFilter.trim() && q.import_batch_id !== batchFilter.trim()) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.question_text.toLowerCase().includes(query) ||
          q.explanation.concept.toLowerCase().includes(query) ||
          (q.import_source_filename && q.import_source_filename.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [questions, selectedExamId, selectedStatus, selectedType, batchFilter, searchQuery]);

  const handleStatusChange = (questionId: string, newStatus: VerificationStatus) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, verification_status: newStatus } : q))
    );
    setConfirmRejectId(null);
  };

  const selectFile = (file: File) => {
    setImportFile(file);
    setPreviewResult(null);
    setImportError(null);
    setImportSuccessMsg(null);
    setPipelineStageIndex(0);
    if (file.name.toLowerCase().endsWith(".zip")) {
      setImportType("ZIP");
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      setImportType("CSV");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleGeneratePreview = () => {
    if (!importFile) return;
    setImportError(null);
    setPipelineStageIndex(2);

    startProcessTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", importFile);

        setPipelineStageIndex(4);
        let res: ImportPreviewResult;
        if (importType === "ZIP") {
          res = await previewZipImportAction(formData);
        } else {
          res = await previewCsvImportAction(formData);
        }
        setPreviewResult(res);
        setPipelineStageIndex(6);
      } catch (err: unknown) {
        setPipelineStageIndex(-1);
        if (err instanceof Error) {
          setImportError(err.message);
        } else {
          setImportError("Failed to parse and validate archive.");
        }
      }
    });
  };

  const handleConfirmImport = () => {
    if (!previewResult || !importFile) return;

    startProcessTransition(async () => {
      try {
        const validRows = previewResult.rows.filter((r) => r.status === "valid");
        const res = await confirmImportAction({
          filename: importFile.name,
          importType,
          validRows,
        });

        setImportSuccessMsg(
          `Imported ${res.importedCount} verified rows under batch ID ${res.batchId}. Items are queued with 'pending' verification status.`
        );
        setPreviewResult(null);
        setImportFile(null);
        setPipelineStageIndex(-1);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setImportError(err.message);
        } else {
          setImportError("Import commit failed.");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
            Repository Controller
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-1">
            Question Bank &amp; Bulk Import
          </h1>
        </div>

        <div className="inline-flex items-center p-1 rounded-md bg-[var(--muted)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "list"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Question Bank ({questions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === "import"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>ZIP / CSV Import</span>
          </button>
        </div>
      </div>

      {/* TAB 1: QUESTION BANK LIST */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Examination
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium"
              >
                <option value="all">All Examinations</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Verification Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved (Live)</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Source Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium"
              >
                <option value="all">All Types</option>
                <option value="PYQ">Verified PYQ</option>
                <option value="MODEL">Model Question</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Import Batch ID
              </label>
              <input
                type="text"
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                placeholder="Filter by batch ID..."
                className="w-full h-9 px-2.5 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Keyword Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stem or concept..."
                className="w-full h-9 px-2.5 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
              />
            </div>
          </Card>

          {/* Dense Question Table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>
                Showing <strong className="text-[var(--foreground)] tabular-nums">{filteredQuestions.length}</strong> matching questions
              </span>
              {batchFilter && (
                <button
                  type="button"
                  onClick={() => setBatchFilter("")}
                  className="text-[var(--accent)] font-medium hover:underline cursor-pointer"
                >
                  Clear Batch Filter
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--muted)]/60 text-[var(--muted-foreground)] uppercase tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3 px-4">Source Badge</th>
                    <th className="py-3 px-4">Question Stem &amp; Key</th>
                    <th className="py-3 px-4">Concept</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Provenance</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredQuestions.slice(0, 50).map((q) => (
                    <tr key={q.id} className="hover:bg-[var(--muted)]/30 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <QuestionTypeBadge type={q.type} sourceYear={q.source_year} compact />
                      </td>
                      <td className="py-3.5 px-4 max-w-md align-top">
                        <div className="font-medium text-[var(--foreground)] line-clamp-2 leading-relaxed">
                          {q.question_text}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)] mt-1">
                          Key: <strong className="text-[var(--sage)]">{q.correct_answer}</strong> • Difficulty:{" "}
                          <span className="capitalize">{q.difficulty}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted-foreground)] font-medium align-top">
                        {q.explanation.concept}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <Badge
                          variant={
                            q.verification_status === "approved"
                              ? "pyq"
                              : q.verification_status === "rejected"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {q.verification_status === "pending"
                            ? "PENDING REVIEW"
                            : q.verification_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted-foreground)] text-[11px] whitespace-nowrap align-top">
                        {q.import_source_filename ? (
                          <div>
                            <span className="font-mono">{q.import_source_filename}</span>
                            <span className="opacity-70 ml-1">r{q.import_source_row}</span>
                          </div>
                        ) : (
                          q.source_paper || "Verified Seed"
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                        <div className="inline-flex items-center gap-1.5">
                          {q.verification_status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(q.id, "approved")}
                              className="px-2.5 py-1 rounded bg-[var(--sage-muted)] text-[var(--sage)] border border-[var(--sage)]/30 font-medium text-[11px] transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {q.verification_status !== "rejected" && (
                            <>
                              {confirmRejectId === q.id ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(q.id, "rejected")}
                                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium text-[11px] transition cursor-pointer"
                                >
                                  Confirm Reject
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRejectId(q.id)}
                                  className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-medium text-[11px] transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: BULK IMPORT (ZIP / CSV) */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  ZIP &amp; CSV Bulk Question Importer
                </h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Recursive archive scanning, Zip-Slip path sanitization, Zod schema validation, and SHA-256 duplicate filtering.
                </p>
              </div>
              <Badge variant="primary">MAX 25 MB</Badge>
            </div>

            {/* 7-Stage Upload Progress Pipeline */}
            <div className="p-4 rounded-md bg-[var(--muted)]/50 border border-[var(--border)]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                Ingestion Pipeline Status
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {IMPORT_PIPELINE_STAGES.map((stage, idx) => {
                  const isCompleted = pipelineStageIndex > idx;
                  const isCurrent = pipelineStageIndex === idx;
                  return (
                    <div
                      key={stage}
                      className={`p-2.5 rounded border text-xs font-medium flex items-center gap-2 transition ${
                        isCompleted
                          ? "border-[var(--sage)]/40 bg-[var(--sage-muted)] text-[var(--sage)]"
                          : isCurrent
                          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 bg-current/10">
                        {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                      </span>
                      <span className="truncate">{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {importSuccessMsg && (
              <div className="p-4 rounded-md bg-[var(--sage-muted)] text-[var(--sage)] border border-[var(--sage)]/30 text-xs font-medium flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {importError && (
              <div className="p-4 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Drag-and-drop Upload Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center space-y-4 transition ${
                isDragging
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                  : "border-[var(--border)] bg-[var(--muted)]/20"
              }`}
            >
              <div className="w-12 h-12 rounded-md bg-[var(--accent-muted)] text-[var(--accent)] mx-auto flex items-center justify-center">
                {importType === "ZIP" ? (
                  <FileArchive className="w-6 h-6" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Drop ZIP or CSV file here or browse
                </p>
                <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
                  Supports multi-CSV `.zip` bundles and standalone `.csv` question sheets. All imported rows default to `pending` verification.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  id="bulk-import-file"
                  accept=".zip,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="bulk-import-file"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-md font-medium text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 cursor-pointer transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Select Archive from Disk</span>
                </label>
              </div>

              {importFile && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)]">
                  <span className="font-mono text-[var(--accent)] font-semibold">
                    {importFile.name}
                  </span>
                  <span className="text-[var(--muted-foreground)] tabular-nums">
                    ({(importFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={!importFile || isProcessing}
                onClick={handleGeneratePreview}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning &amp; Validating...</span>
                  </>
                ) : (
                  <span>Run Validation &amp; Preview</span>
                )}
              </button>
            </div>
          </Card>

          {/* Import Preview Summary & Error Table */}
          {previewResult && (
            <Card className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)]">
                    Import Preview &amp; Duplicate Analysis
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Inspect row-by-row schema validation and duplicate hashes before committing to the database.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={previewResult.validRowsCount === 0 || isProcessing}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirm Import ({previewResult.validRowsCount} Valid Rows)
                  </span>
                </button>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Files Scanned
                  </div>
                  <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums mt-1">
                    {previewResult.totalFiles}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {previewResult.validFilesCount} valid • {previewResult.invalidFilesCount} invalid
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Valid Rows
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                    {previewResult.validRowsCount}
                  </div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    Ready for pending queue
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/25 border border-red-200 dark:border-red-800/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                    Invalid Rows
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-1">
                    {previewResult.invalidRowsCount}
                  </div>
                  <div className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-0.5">
                    Failed Zod schema check
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Duplicate Rows
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                    {previewResult.duplicateRowsCount}
                  </div>
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Skipped automatically
                  </div>
                </div>
              </div>

              {/* Row Details Table */}
              <div className="overflow-x-auto max-h-96 border border-[var(--border)] rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] uppercase tracking-wider sticky top-0 border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2.5 px-4">Source File &amp; Row</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Question Stem Preview</th>
                      <th className="py-2.5 px-4">Validation Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {previewResult.rows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[var(--muted)]/30">
                        <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-[var(--muted-foreground)]">
                          {r.filename} (r{r.rowNumber})
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {r.status === "valid" ? (
                            <Badge variant="pyq">VALID</Badge>
                          ) : r.status === "duplicate" ? (
                            <Badge variant="warning">DUPLICATE</Badge>
                          ) : (
                            <Badge variant="danger">INVALID</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 max-w-sm truncate text-[var(--foreground)]">
                          {r.previewQuestionText}
                        </td>
                        <td className="py-2.5 px-4 text-[11px]">
                          {r.errors && r.errors.length > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {r.errors.join("; ")}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Passed schema &amp; hash checks
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
