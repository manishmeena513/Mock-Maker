"use client";

import React, { useState, useMemo } from "react";
import {
  Exam,
  Subject,
  Topic,
  QuestionImportBatch,
  GitHubImportCandidate,
  QuestionType,
  DifficultyLevel,
} from "@/types/database";
import type { GitHubRepoAnalysisSummary } from "@/lib/import/githubImporter";
import {
  GitBranch,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FolderGit2,
  Edit3,
  Eye,
  CheckSquare,
  Square,
  Loader2,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface AdminGitHubImportClientProps {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  initialBatches: QuestionImportBatch[];
}

export function AdminGitHubImportClient({
  exams,
  subjects,
  topics,
  initialBatches,
}: AdminGitHubImportClientProps) {
  // Repository Input Form State
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/mockmaster-official/upsc-ssc-question-bank"
  );
  const [branch, setBranch] = useState("main");
  const [subpath, setSubpath] = useState("");
  const [questionType, setQuestionType] = useState<"AUTO" | "PYQ" | "MODEL">("AUTO");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  // Execution State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Results State
  const [analysisSummary, setAnalysisSummary] = useState<GitHubRepoAnalysisSummary | null>(null);
  const [activeBatch, setActiveBatch] = useState<QuestionImportBatch | null>(null);
  const [candidates, setCandidates] = useState<GitHubImportCandidate[]>([]);
  const [batches, setBatches] = useState<QuestionImportBatch[]>(initialBatches);

  // Table Filter & Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dupFilter, setDupFilter] = useState<string>("all");
  const [bulkApproveType, setBulkApproveType] = useState<QuestionType>("MODEL");

  // Modals State
  const [inspectingSource, setInspectingSource] = useState<GitHubImportCandidate | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<GitHubImportCandidate | null>(null);

  // Edit Form State
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editOptionA, setEditOptionA] = useState("");
  const [editOptionB, setEditOptionB] = useState("");
  const [editOptionC, setEditOptionC] = useState("");
  const [editOptionD, setEditOptionD] = useState("");
  const [editAnswer, setEditAnswer] = useState<"A" | "B" | "C" | "D" | "">("");
  const [editWhy, setEditWhy] = useState("");
  const [editConcept, setEditConcept] = useState("");
  const [editType, setEditType] = useState<QuestionType>("MODEL");
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>("moderate");
  const [editYear, setEditYear] = useState<string>("");
  const [editPaper, setEditPaper] = useState<string>("");

  const filteredSubjects = useMemo(() => {
    if (!selectedExamId) return subjects;
    return subjects.filter((s) => s.exam_id === selectedExamId);
  }, [subjects, selectedExamId]);

  const filteredTopics = useMemo(() => {
    if (!selectedSubjectId) return topics;
    return topics.filter((t) => t.subject_id === selectedSubjectId);
  }, [topics, selectedSubjectId]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter === "needs_answer") {
        if (!c.requires_answer_verification && c.correct_answer) return false;
      } else if (statusFilter !== "all" && c.verification_status !== statusFilter) {
        return false;
      }
      if (dupFilter !== "all" && c.duplicate_status !== dupFilter) {
        return false;
      }
      return true;
    });
  }, [candidates, statusFilter, dupFilter]);

  const handleAnalyzeRepository = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/admin/import/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          repoUrl,
          branch: branch || "main",
          subpath: subpath || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to analyze GitHub repository.");
        return;
      }
      setAnalysisSummary(data.summary);
      setSuccessMsg(
        `Analyzed ${data.summary.repository}: ${data.summary.supportedFilesCount} supported files (${data.summary.potentialQuestionsFound} potential questions detected).`
      );
    } catch {
      setErrorMsg("Network error while analyzing GitHub repository.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcessWithAI = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/admin/import/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process",
          repoUrl,
          branch: branch || "main",
          subpath: subpath || null,
          questionType,
          examId: selectedExamId || null,
          subjectId: selectedSubjectId || null,
          topicId: selectedTopicId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to process repository with AI.");
        return;
      }
      setAnalysisSummary(data.summary);
      setActiveBatch(data.batch);
      setCandidates(data.candidates || []);
      setSelectedIds(new Set());
      if (data.batch) {
        setBatches((prev) => [
          data.batch,
          ...prev.filter((b) => b.id !== data.batch.id),
        ]);
      }
      setSuccessMsg(
        `Extracted ${data.candidates?.length || 0} candidate questions into batch ${data.batch?.id}. All items are set to 'pending' for administrator review.`
      );
    } catch {
      setErrorMsg("Network error while processing GitHub repository.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenBatch = async (batchId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsMutating(true);
    try {
      const res = await fetch(`/api/admin/import/github?batchId=${encodeURIComponent(batchId)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to reopen import batch.");
        return;
      }
      setActiveBatch(data.batch);
      setCandidates(data.candidates || []);
      setSelectedIds(new Set());
      setSuccessMsg(
        `Reopened batch ${data.batch.id} (${data.candidates?.length || 0} candidates).`
      );
    } catch {
      setErrorMsg("Could not reopen import batch.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleReviewAction = async (
    action: "approve" | "reject",
    targetCandidateIds: string[],
    overrideType?: QuestionType
  ) => {
    if (targetCandidateIds.length === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsMutating(true);

    try {
      const res = await fetch("/api/admin/import/github", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          candidateIds: targetCandidateIds,
          questionType: overrideType,
          examId: selectedExamId || undefined,
          subjectId: selectedSubjectId || undefined,
          topicId: selectedTopicId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Failed to ${action} selected questions.`);
        return;
      }

      const updatedMap = new Map<string, GitHubImportCandidate>(
        (data.candidates || []).map((c: GitHubImportCandidate) => [c.id, c])
      );

      setCandidates((prev) =>
        prev.map((item) => updatedMap.get(item.id) || item)
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        targetCandidateIds.forEach((id) => next.delete(id));
        return next;
      });

      if (action === "approve") {
        setSuccessMsg(
          `Approved ${data.approvedCount || 0} question(s) into the main question bank.`
        );
      } else {
        setSuccessMsg(`Rejected ${data.rejectedCount || 0} candidate question(s).`);
      }

      // Refresh batches list
      if (activeBatch) {
        const batchRes = await fetch(`/api/admin/import/github?batchId=${encodeURIComponent(activeBatch.id)}`);
        if (batchRes.ok) {
          const batchData = await batchRes.json();
          if (batchData.batch) {
            setActiveBatch(batchData.batch);
            setBatches((prev) =>
              prev.map((b) => (b.id === batchData.batch.id ? batchData.batch : b))
            );
          }
        }
      }
    } catch {
      setErrorMsg(`Error performing ${action} operation.`);
    } finally {
      setIsMutating(false);
    }
  };

  const openEditModal = (cand: GitHubImportCandidate) => {
    setEditingCandidate(cand);
    setEditQuestionText(cand.question_text);
    setEditOptionA(cand.option_a);
    setEditOptionB(cand.option_b);
    setEditOptionC(cand.option_c);
    setEditOptionD(cand.option_d);
    setEditAnswer(cand.correct_answer || "");
    setEditWhy(cand.explanation?.why || "");
    setEditConcept(cand.explanation?.concept || "");
    setEditType(cand.question_type);
    setEditDifficulty(cand.difficulty);
    setEditYear(cand.source_year ? String(cand.source_year) : "");
    setEditPaper(cand.source_paper || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;
    setErrorMsg(null);
    setIsMutating(true);

    try {
      const parsedYear = editYear.trim() ? Number(editYear.trim()) : null;
      const res = await fetch("/api/admin/import/github", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          candidateId: editingCandidate.id,
          updates: {
            question_text: editQuestionText.trim(),
            option_a: editOptionA.trim(),
            option_b: editOptionB.trim(),
            option_c: editOptionC.trim(),
            option_d: editOptionD.trim(),
            correct_answer: editAnswer ? (editAnswer as "A" | "B" | "C" | "D") : null,
            explanation: {
              ...editingCandidate.explanation,
              why: editWhy.trim(),
              concept: editConcept.trim(),
            },
            question_type: editType,
            difficulty: editDifficulty,
            source_year: editType === "PYQ" && parsedYear ? parsedYear : null,
            source_paper: editType === "PYQ" && editPaper.trim() ? editPaper.trim() : null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save candidate edits.");
        return;
      }

      if (data.candidate) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === data.candidate.id ? data.candidate : c))
        );
      }
      setEditingCandidate(null);
      setSuccessMsg("Candidate question updated and re-validated.");
    } catch {
      setErrorMsg("Failed to update candidate question.");
    } finally {
      setIsMutating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent)]">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Admin Ingestion Pipeline</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Import Questions from GitHub
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-2xl">
            Scan public GitHub repositories, extract structured &amp; unstructured MCQs with Gemini AI, run 3-way duplicate detection, and review candidates before publishing to the question bank.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRepoUrl("https://github.com/mockmaster-official/upsc-ssc-question-bank");
            setBranch("main");
            setSubpath("");
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-mono border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition cursor-pointer shrink-0"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Load Sample GitHub Repo</span>
        </button>
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3 text-xs sm:text-sm text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-[var(--sage-border)] bg-[var(--sage-soft)] p-4 flex items-start gap-3 text-xs sm:text-sm text-[var(--sage)]">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Repository Configuration Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              GitHub Repository URL *
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Branch (Optional)
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Folder / Path (Optional)
            </label>
            <input
              type="text"
              value={subpath}
              onChange={(e) => setSubpath(e.target.value)}
              placeholder="e.g. polity or questions/2024"
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-[var(--border)]">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as "AUTO" | "PYQ" | "MODEL")}
              className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="AUTO">Auto-detect (Provenance Safe)</option>
              <option value="MODEL">MODEL (Practice Questions)</option>
              <option value="PYQ">PYQ (Previous Year Questions)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Exam (Optional)
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setSelectedSubjectId("");
                setSelectedTopicId("");
              }}
              className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="">Auto-match / Default Exam</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Subject (Optional)
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedTopicId("");
              }}
              className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="">Auto-match / Default Subject</option>
              {filteredSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Topic (Optional)
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="">Auto-match / Default Topic</option>
              {filteredTopics.map((top) => (
                <option key={top.id} value={top.id}>
                  {top.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
          <div className="text-[11px] font-mono text-[var(--muted-foreground)]">
            Supported formats: <span className="text-[var(--foreground)]">.csv, .json, .md, .markdown, .txt</span> · SSRF &amp; size limits enforced
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAnalyzeRepository}
              disabled={isAnalyzing || isProcessing || !repoUrl.trim()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 transition cursor-pointer"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Analyze Repository</span>
            </button>

            <button
              type="button"
              onClick={handleProcessWithAI}
              disabled={isAnalyzing || isProcessing || !repoUrl.trim()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-xs font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Process with AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Repository Inspection Summary */}
      {analysisSummary && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[var(--foreground)]">
                Repository Scan Summary — {analysisSummary.repository} ({analysisSummary.branch})
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Path: <code className="font-mono">/{analysisSummary.subpath || ""}</code>
                {analysisSummary.commitSha && (
                  <>
                    {" "}
                    · Commit: <code className="font-mono">{analysisSummary.commitSha.slice(0, 8)}</code>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Discovered Files
              </div>
              <div className="font-mono text-xl font-bold text-[var(--foreground)] mt-0.5">
                {analysisSummary.discoveredFilesCount}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Supported Files
              </div>
              <div className="font-mono text-xl font-bold text-[var(--sage)] mt-0.5">
                {analysisSummary.supportedFilesCount}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Ignored Files
              </div>
              <div className="font-mono text-xl font-bold text-[var(--muted-foreground)] mt-0.5">
                {analysisSummary.ignoredFilesCount}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Potential Questions
              </div>
              <div className="font-mono text-xl font-bold text-[var(--accent)] mt-0.5">
                {analysisSummary.potentialQuestionsFound}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Est. Processing Size
              </div>
              <div className="font-mono text-xl font-bold text-[var(--foreground)] mt-0.5">
                {(analysisSummary.estimatedProcessingBytes / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground)]">
                Supported Question Files ({analysisSummary.supportedFiles.length})
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                {analysisSummary.supportedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 font-mono text-[11px]"
                  >
                    <span className="truncate text-[var(--foreground)] flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-[var(--accent)] shrink-0" />
                      {f.path}
                    </span>
                    <span className="text-[var(--muted-foreground)] shrink-0">
                      {(f.sizeBytes / 1024).toFixed(1)} KB · ~{f.estimatedQuestions} Qs
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Ignored / Filtered Files ({analysisSummary.ignoredFiles.length})
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                {analysisSummary.ignoredFiles.length === 0 ? (
                  <p className="text-[11px] text-[var(--muted-foreground)]">No ignored files.</p>
                ) : (
                  analysisSummary.ignoredFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 font-mono text-[11px] text-[var(--muted-foreground)]"
                    >
                      <span className="truncate">{f.path}</span>
                      <span className="shrink-0 text-[10px]">{f.reason}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {(analysisSummary.warnings.length > 0 || analysisSummary.errors.length > 0) && (
            <div className="space-y-2 pt-2">
              {analysisSummary.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
              {analysisSummary.errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Review Table */}
      {candidates.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          {/* Review Toolbar */}
          <div className="p-4 border-b border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-base font-bold text-[var(--foreground)]">
                Candidate Review Queue ({filteredCandidates.length} / {candidates.length})
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Every extracted question starts as <code className="font-mono">pending</code>. Verify options, answer keys, and PYQ/MODEL classification before approving.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_answer">Needs Answer Verification</option>
              </select>

              <select
                value={dupFilter}
                onChange={(e) => setDupFilter(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)]"
              >
                <option value="all">All Duplicate States</option>
                <option value="new">New (Unique)</option>
                <option value="possible_duplicate">Possible Duplicate</option>
                <option value="duplicate">Exact Duplicate</option>
              </select>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
                  <select
                    value={bulkApproveType}
                    onChange={(e) => setBulkApproveType(e.target.value as QuestionType)}
                    aria-label="Bulk approval question type"
                    className="h-8 px-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono font-semibold text-[var(--foreground)]"
                  >
                    <option value="MODEL">As MODEL</option>
                    <option value="PYQ">As PYQ</option>
                  </select>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() =>
                      handleReviewAction("approve", Array.from(selectedIds), bulkApproveType)
                    }
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-[var(--sage)] text-white hover:opacity-90 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve selected ({selectedIds.size})</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => handleReviewAction("reject", Array.from(selectedIds))}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject selected</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="py-3 px-3 w-8">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label="Select all candidates"
                      className="text-[var(--foreground)]"
                    >
                      {selectedIds.size === filteredCandidates.length &&
                      filteredCandidates.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Question</th>
                  <th className="py-3 px-3">Exam</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Topic</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredCandidates.map((cand) => {
                  const isSelected = selectedIds.has(cand.id);
                  return (
                    <tr
                      key={cand.id}
                      className={`hover:bg-[var(--muted)]/20 transition-colors ${
                        isSelected ? "bg-[var(--accent-soft)]/30" : ""
                      }`}
                    >
                      <td className="py-3.5 px-3 align-top">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(cand.id)}
                          aria-label={`Select candidate ${cand.id}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--muted-foreground)]" />
                          )}
                        </button>
                      </td>

                      {/* Question */}
                      <td className="py-3.5 px-3 align-top max-w-md space-y-1.5">
                        <p className="font-medium text-[var(--foreground)] leading-snug line-clamp-3">
                          {cand.question_text}
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted-foreground)] font-mono">
                          <span className={cand.correct_answer === "A" ? "text-[var(--sage)] font-semibold" : ""}>
                            A: {cand.option_a}
                          </span>
                          <span className={cand.correct_answer === "B" ? "text-[var(--sage)] font-semibold" : ""}>
                            B: {cand.option_b}
                          </span>
                          <span className={cand.correct_answer === "C" ? "text-[var(--sage)] font-semibold" : ""}>
                            C: {cand.option_c}
                          </span>
                          <span className={cand.correct_answer === "D" ? "text-[var(--sage)] font-semibold" : ""}>
                            D: {cand.option_d}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {cand.requires_answer_verification || !cand.correct_answer ? (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Requires Answer Verification
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--muted)] text-[var(--foreground)]">
                              Key: {cand.correct_answer}
                            </span>
                          )}

                          {cand.duplicate_status === "duplicate" && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                              Duplicate (100%)
                            </span>
                          )}
                          {cand.duplicate_status === "possible_duplicate" && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              Possible Duplicate ({Math.round((cand.duplicate_similarity || 0.75) * 100)}%)
                            </span>
                          )}
                          {cand.duplicate_status === "new" && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--sage-soft)] text-[var(--sage)]">
                              New
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Exam */}
                      <td className="py-3.5 px-3 align-top font-medium text-[var(--foreground)] whitespace-nowrap">
                        {cand.exam_name || "UPSC CSE"}
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-3 align-top text-[var(--muted-foreground)] whitespace-nowrap">
                        {cand.subject_name || "General Studies"}
                      </td>

                      {/* Topic */}
                      <td className="py-3.5 px-3 align-top text-[var(--muted-foreground)] max-w-[140px] truncate">
                        {cand.topic_name || "Core Syllabus"}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                            cand.question_type === "PYQ"
                              ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]"
                              : "bg-[var(--plum-soft)] text-[var(--plum)] border border-[var(--plum-border)]"
                          }`}
                        >
                          {cand.question_type}
                          {cand.source_year ? ` · ${cand.source_year}` : ""}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-3 align-top font-mono text-[11px] text-[var(--muted-foreground)]">
                        <div className="truncate max-w-[150px]" title={cand.source_path}>
                          {cand.source_filename}
                          {cand.source_line ? `:${cand.source_line}` : ""}
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-3 align-top font-mono text-[11px] whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            cand.confidence >= 0.85
                              ? "text-[var(--sage)]"
                              : cand.confidence >= 0.65
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {Math.round(cand.confidence * 100)}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                            cand.verification_status === "approved"
                              ? "bg-[var(--sage-soft)] text-[var(--sage)]"
                              : cand.verification_status === "rejected"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : "bg-[var(--muted)] text-[var(--foreground)]"
                          }`}
                        >
                          {cand.verification_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isMutating || cand.requires_answer_verification}
                            onClick={() =>
                              handleReviewAction("approve", [cand.id], cand.question_type)
                            }
                            title={
                              cand.requires_answer_verification
                                ? "Edit and verify correct answer before approving"
                                : `Approve as ${cand.question_type}`
                            }
                            className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium bg-[var(--sage-soft)] text-[var(--sage)] hover:opacity-80 disabled:opacity-40 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => handleReviewAction("reject", [cand.id])}
                            title="Reject candidate"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(cand)}
                            title="Edit candidate"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectingSource(cand)}
                            title="View source provenance"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View source</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Batch History Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[var(--foreground)]">
              GitHub Import Batches ({batches.length})
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Every GitHub import run is logged with full provenance. Click any batch to reopen its review queue.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-8 text-center text-xs text-[var(--muted-foreground)]">
            No GitHub import batches recorded yet. Use &ldquo;Process with AI&rdquo; above to create your first batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">Repository &amp; Branch</th>
                  <th className="py-2.5 px-3">Files Scanned</th>
                  <th className="py-2.5 px-3">Extracted</th>
                  <th className="py-2.5 px-3">Approved</th>
                  <th className="py-2.5 px-3">Rejected</th>
                  <th className="py-2.5 px-3">Pending</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--muted)]/20">
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--foreground)]">
                      {b.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <span className="font-semibold text-[var(--foreground)]">
                        {b.source_repository || b.filename}
                      </span>
                      {b.source_branch && (
                        <span className="text-[var(--muted-foreground)]">@{b.source_branch}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">{b.files_scanned ?? b.total_files}</td>
                    <td className="py-3 px-3 font-mono">{b.questions_extracted ?? b.total_rows}</td>
                    <td className="py-3 px-3 font-mono text-[var(--sage)] font-semibold">
                      {b.approved_count ?? b.imported_rows}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-600 dark:text-rose-400">
                      {b.rejected_count ?? 0}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400">
                      {b.pending_count ?? 0}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[var(--muted-foreground)] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleReopenBatch(b.id)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-[var(--border)] bg-[var(--background)] text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reopen Batch</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Source Provenance Modal */}
      {inspectingSource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[var(--foreground)]">
                Source Provenance &amp; Validation Diagnostics
              </h3>
              <button
                type="button"
                onClick={() => setInspectingSource(null)}
                className="text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-[var(--muted-foreground)]">Repository: </span>
                <span className="text-[var(--foreground)]">{inspectingSource.source_repository}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Branch: </span>
                <span className="text-[var(--foreground)]">{inspectingSource.source_branch || "main"}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">File Path: </span>
                <span className="text-[var(--foreground)]">
                  {inspectingSource.source_path}
                  {inspectingSource.source_line ? ` (Line ${inspectingSource.source_line})` : ""}
                </span>
              </div>
              {inspectingSource.source_commit && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Commit SHA: </span>
                  <span className="text-[var(--foreground)]">{inspectingSource.source_commit}</span>
                </div>
              )}
              <div>
                <span className="text-[var(--muted-foreground)]">Source Year: </span>
                <span className="text-[var(--foreground)]">
                  {inspectingSource.source_year ?? "null (Not invented)"}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Duplicate Classification: </span>
                <span className="text-[var(--foreground)] uppercase">
                  {inspectingSource.duplicate_status}
                </span>
              </div>
              {inspectingSource.source_url && (
                <div className="pt-1">
                  <a
                    href={inspectingSource.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    <span>Open file on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {(inspectingSource.validation_warnings.length > 0 ||
              inspectingSource.validation_errors.length > 0) && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 space-y-1.5 text-xs">
                <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                  Second-Pass Validation Notes
                </div>
                {inspectingSource.validation_errors.map((err, i) => (
                  <div key={i} className="text-rose-600 dark:text-rose-400">
                    • Error: {err}
                  </div>
                ))}
                {inspectingSource.validation_warnings.map((w, i) => (
                  <div key={i} className="text-amber-600 dark:text-amber-400">
                    • Warning: {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {editingCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[var(--foreground)]">
                Edit Imported Candidate Question
              </h3>
              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                Question Stem *
              </label>
              <textarea
                rows={3}
                required
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm text-[var(--foreground)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["Option A", editOptionA, setEditOptionA],
                  ["Option B", editOptionB, setEditOptionB],
                  ["Option C", editOptionC, setEditOptionC],
                  ["Option D", editOptionD, setEditOptionD],
                ] as const
              ).map(([label, val, setter]) => (
                <div key={label} className="space-y-1">
                  <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                    {label} *
                  </label>
                  <input
                    type="text"
                    required
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)]"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                  Correct Answer *
                </label>
                <select
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value as "A" | "B" | "C" | "D" | "")}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono font-semibold text-[var(--foreground)]"
                >
                  <option value="">Unverified</option>
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                  Question Type
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as QuestionType)}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono font-semibold text-[var(--foreground)]"
                >
                  <option value="MODEL">MODEL</option>
                  <option value="PYQ">PYQ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                  Difficulty
                </label>
                <select
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)]"
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                  Source Year (PYQ)
                </label>
                <input
                  type="number"
                  min={1970}
                  max={2026}
                  disabled={editType === "MODEL"}
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder={editType === "MODEL" ? "N/A for MODEL" : "e.g. 2022"}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono text-[var(--foreground)] disabled:opacity-40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                  Explanation Rationale (Why)
                </label>
                <textarea
                  rows={2}
                  value={editWhy}
                  onChange={(e) => setEditWhy(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-xs text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[var(--muted-foreground)]">
                  Core Concept / Topic Tag
                </label>
                <input
                  type="text"
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)]"
                />
                {editType === "PYQ" && (
                  <input
                    type="text"
                    value={editPaper}
                    onChange={(e) => setEditPaper(e.target.value)}
                    placeholder="Source Paper (e.g. UPSC CSE Prelims GS-I)"
                    className="w-full h-9 px-3 mt-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)]"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="h-9 px-4 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isMutating}
                className="h-9 px-4 rounded-md bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]"
              >
                Save &amp; Re-Validate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
