"use client";

import React, { useState } from "react";
import { Question } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import { updateQuestionVerificationAction } from "@/app/actions/admin";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

interface ModelQuestionsReviewClientProps {
  initialQuestions: Question[];
}

export function ModelQuestionsReviewClient({ initialQuestions }: ModelQuestionsReviewClientProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

  const modelQuestions = questions.filter((q) => q.type === "MODEL");

  const filtered = modelQuestions.filter((q) => {
    if (statusFilter !== "all" && q.verification_status !== statusFilter) return false;
    return true;
  });

  const handleApprove = async (id: string) => {
    try {
      await updateQuestionVerificationAction(id, "approved");
    } catch (e) {
      console.warn("Failed to persist verification status:", e);
    }
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, verification_status: "approved" as const } : q))
    );
    setConfirmRejectId(null);
  };

  const handleReject = async (id: string) => {
    try {
      await updateQuestionVerificationAction(id, "rejected");
    } catch (e) {
      console.warn("Failed to persist verification status:", e);
    }
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, verification_status: "rejected" as const } : q))
    );
    setConfirmRejectId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Model Question Moderation
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            AI Model Question Review Queue
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Every AI-synthesized model question requires editorial verification before entering the 20% student mock pool.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs font-semibold"
          >
            <option value="all">All ({modelQuestions.length})</option>
            <option value="pending">
              Pending Review ({modelQuestions.filter((q) => q.verification_status === "pending").length})
            </option>
            <option value="approved">
              Approved ({modelQuestions.filter((q) => q.verification_status === "approved").length})
            </option>
            <option value="rejected">
              Rejected ({modelQuestions.filter((q) => q.verification_status === "rejected").length})
            </option>
          </select>
        </div>
      </div>

      {/* Moderation Queue Cards */}
      <div className="space-y-5">
        {filtered.map((q) => (
          <Card key={q.id} className="p-6 space-y-5">
            {/* Top Bar: Source Badge + AI Generated Badge + Status Badge + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex flex-wrap items-center gap-2">
                <QuestionTypeBadge type="MODEL" />
                <Badge variant="model">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI GENERATED
                </Badge>
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
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] ml-1">
                  <Clock className="w-3 h-3" />
                  {q.created_at
                    ? new Date(q.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "Recent"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {q.verification_status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleApprove(q.id)}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {q.verification_status !== "rejected" && (
                  <>
                    {confirmRejectId === q.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReject(q.id)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
                        >
                          <span>Confirm Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRejectId(null)}
                          className="h-8 px-2.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRejectId(q.id)}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/70 transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Taxonomy Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-[var(--muted)] text-[11px] font-medium text-[var(--foreground)]">
                Exam: <strong className="font-semibold">{q.exam_id}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--muted)] text-[11px] font-medium text-[var(--foreground)]">
                Subject: <strong className="font-semibold">{q.subject_id}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--muted)] text-[11px] font-medium text-[var(--foreground)]">
                Topic: <strong className="font-semibold">{q.topic_id}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--muted)] text-[11px] font-medium text-[var(--foreground)] capitalize">
                Difficulty: <strong className="font-semibold">{q.difficulty}</strong>
              </span>
            </div>

            {/* Question Stem */}
            <div className="question-prose text-[var(--foreground)] font-medium">
              {q.question_text}
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              {(["A", "B", "C", "D"] as const).map((optKey) => {
                const optText =
                  optKey === "A"
                    ? q.option_a
                    : optKey === "B"
                    ? q.option_b
                    : optKey === "C"
                    ? q.option_c
                    : q.option_d;
                const isCorrect = q.correct_answer === optKey;
                return (
                  <div
                    key={optKey}
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                      isCorrect
                        ? "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/25 text-[var(--foreground)] font-medium"
                        : "border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {optKey}
                    </span>
                    <span className="leading-relaxed">{optText}</span>
                  </div>
                );
              })}
            </div>

            {/* Structured Explanation Review */}
            <div className="pt-1">
              <ExplanationPanel
                correctAnswer={q.correct_answer}
                explanation={q.explanation}
                isUserCorrect={true}
                userAnswer={q.correct_answer}
              />
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="text-center py-12 text-sm text-[var(--muted-foreground)]">
            No model questions match the selected filter status.
          </Card>
        )}
      </div>
    </div>
  );
}
