"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Question, Exam, VerificationStatus } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { previewCsvImportAction, previewZipImportAction, confirmImportAction } from "@/app/actions/import";
import { ImportPreviewResult, ParsedRowResult } from "@/lib/import/importService";
import {
  UploadCloud,
  Layers,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  AlertTriangle,
  ArrowRight,
  FileText,
  FileArchive,
  Trash2,
} from "lucide-react";

interface AdminQuestionsClientProps {
  initialQuestions: Question[];
  exams: Exam[];
  initialBatchId?: string;
  initialTab?: string;
}

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

  // Filters
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>(initialBatchId || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"CSV" | "ZIP">("ZIP");
  const [isProcessing, startProcessTransition] = useTransition();
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Filtered Questions List
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

  // Handle Question Verification Status Change (Approve / Reject)
  const handleStatusChange = (questionId: string, newStatus: VerificationStatus) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, verification_status: newStatus } : q))
    );
  };

  // Handle File Input Change for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setPreviewResult(null);
      setImportError(null);
      setImportSuccessMsg(null);
      if (file.name.toLowerCase().endsWith(".zip")) {
        setImportType("ZIP");
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        setImportType("CSV");
      }
    }
  };

  // Preview Import Action
  const handleGeneratePreview = () => {
    if (!importFile) return;
    setImportError(null);

    startProcessTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", importFile);

        let res: ImportPreviewResult;
        if (importType === "ZIP") {
          res = await previewZipImportAction(formData);
        } else {
          res = await previewCsvImportAction(formData);
        }
        setPreviewResult(res);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setImportError(err.message);
        } else {
          setImportError("Failed to parse file.");
        }
      }
    });
  };

  // Confirm Import Execution
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
          `Successfully imported ${res.importedCount} questions under batch ID: ${res.batchId}. All items set to 'pending' verification.`
        );
        setPreviewResult(null);
        setImportFile(null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setImportError(err.message);
        } else {
          setImportError("Import failed.");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("list")}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === "list"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Question Bank ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("import")}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === "import"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Import (ZIP / CSV)</span>
        </button>
      </div>

      {/* TAB 1: QUESTION BANK LIST */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Examination
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
              >
                <option value="all">All Exams</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Verification Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved (Live in Mocks)</option>
                <option value="pending">Pending Approval</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Question Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
              >
                <option value="all">All Types</option>
                <option value="PYQ">Previous Year (PYQ)</option>
                <option value="MODEL">AI Model Question</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Import Batch ID
              </label>
              <input
                type="text"
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                placeholder="Filter by batch..."
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Search Question Text
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredQuestions.length} questions</span>
              {batchFilter && (
                <button
                  onClick={() => setBatchFilter("")}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Clear Batch Filter
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Question Text</th>
                    <th className="py-3 px-4">Concept / Topic</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Source / File</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQuestions.slice(0, 50).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <QuestionTypeBadge type={q.type} sourceYear={q.source_year} />
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-slate-900 dark:text-white line-clamp-2">
                          {q.question_text}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Ans: <strong className="text-emerald-600">{q.correct_answer}</strong>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {q.explanation.concept}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            q.verification_status === "approved"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : q.verification_status === "rejected"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {q.verification_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {q.import_source_filename ? (
                          <div>
                            <span className="font-mono">{q.import_source_filename}</span>
                            <span className="text-slate-400 ml-1">r{q.import_source_row}</span>
                          </div>
                        ) : (
                          q.source_paper || "Manual Seed"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        {q.verification_status !== "approved" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "approved")}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition"
                            title="Approve for live tests"
                          >
                            Approve
                          </button>
                        )}
                        {q.verification_status !== "rejected" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "rejected")}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition"
                            title="Reject question"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK IMPORT (ZIP / CSV) */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Bulk Question Import (ZIP Archive or CSV)
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Upload a <strong>.zip file containing multiple CSVs</strong> or a <strong>single .csv file</strong>. All imported questions are inserted with <code>verification_status = &apos;pending&apos;</code> and <code>type = &apos;PYQ&apos;</code>.
              </p>
            </div>

            {importSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {importError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                {importType === "ZIP" ? <FileArchive className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Choose ZIP or CSV File</span>
                </label>
              </div>

              {importFile ? (
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Selected: <span className="font-mono text-blue-600">{importFile.name}</span> (
                  {(importFile.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Drag and drop a .zip archive (containing multiple syllabus CSV files) or a single .csv file here. Max 25 MB.
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={!importFile || isProcessing}
                onClick={handleGeneratePreview}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
              >
                {isProcessing ? "Processing & Validating..." : "Validate & Preview Import"}
              </button>
            </div>
          </div>

          {/* Import Preview Component */}
          {previewResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Import Preview & Duplicate Analysis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review validation checks before committing questions to the question bank.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={previewResult.validRowsCount === 0 || isProcessing}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirm & Import {previewResult.validRowsCount} Approved Rows
                  </span>
                </button>
              </div>

              {/* Summary Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Files Processed
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {previewResult.totalFiles}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {previewResult.validFilesCount} valid, {previewResult.invalidFilesCount} invalid
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                    Valid Questions
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {previewResult.validRowsCount} 🟢
                  </div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5">Ready to insert as pending</div>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400">
                    Invalid Questions
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {previewResult.invalidRowsCount} 🔴
                  </div>
                  <div className="text-[10px] text-rose-600/80 mt-0.5">Will be rejected</div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
                    Duplicates
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {previewResult.duplicateRowsCount} 🟡
                  </div>
                  <div className="text-[10px] text-amber-600/80 mt-0.5">Excluded from import</div>
                </div>
              </div>

              {/* Rows List */}
              <div className="overflow-x-auto max-h-96 border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">File & Row</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Question Preview</th>
                      <th className="py-2.5 px-3">Validation Note / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewResult.rows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                          {r.filename} (r{r.rowNumber})
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {r.status === "valid" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              🟢 Valid
                            </span>
                          ) : r.status === "duplicate" ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                              🟡 Duplicate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                              🔴 Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-sm truncate text-slate-800 dark:text-slate-200">
                          {r.previewQuestionText}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {r.errors && r.errors.length > 0 ? (
                            <span className="text-rose-600 font-medium">
                              {r.errors.join("; ")}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Valid CSV row</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
