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
  Filter,
  BookOpen,
  ArrowRight,
} from "lucide-react";

interface ModelQuestionsReviewClientProps {
  initialQuestions: Question[];
}

export function ModelQuestionsReviewClient({ initialQuestions }: ModelQuestionsReviewClientProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Model Question Engine
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            AI Model Question Review Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Per product integrity rules, AI-generated questions must be reviewed and approved before entering student mocks.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="all">All ({modelQuestions.length})</option>
            <option value="pending">
              Pending ({modelQuestions.filter((q) => q.verification_status === "pending").length})
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

      {/* Questions Queue */}
      <div className="space-y-6">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <QuestionTypeBadge type="MODEL" />
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  <Sparkles className="w-3 h-3" /> Gemini 2.0 Flash
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {q.created_at ? new Date(q.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    q.verification_status === "approved"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : q.verification_status === "rejected"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {q.verification_status}
                </span>

                <div className="flex items-center gap-2 ml-2">
                  {q.verification_status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => handleApprove(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Question</span>
                    </button>
                  )}

                  {q.verification_status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => handleReject(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Exam & Subject Metadata Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Exam: <strong className="font-semibold">{q.exam_id}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Subject: <strong className="font-semibold">{q.subject_id}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Topic: <strong className="font-semibold">{q.topic_id}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 capitalize">
                Diff: <strong className="font-semibold">{q.difficulty}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-violet-50/60 dark:bg-violet-950/30 text-[11px] text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40">
                Source Year: <em>None (Synthetic Model Question)</em>
              </span>
            </div>

            {/* Question Text */}
            <div className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
              {q.question_text}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div
                className={`p-3 rounded-xl border ${
                  q.correct_answer === "A"
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <strong>A.</strong> {q.option_a}
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  q.correct_answer === "B"
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <strong>B.</strong> {q.option_b}
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  q.correct_answer === "C"
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <strong>C.</strong> {q.option_c}
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  q.correct_answer === "D"
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <strong>D.</strong> {q.option_d}
              </div>
            </div>

            {/* Structured Explanation Review */}
            <div className="pt-2">
              <ExplanationPanel
                correctAnswer={q.correct_answer}
                explanation={q.explanation}
                isUserCorrect={true}
                userAnswer={q.correct_answer}
              />
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
            No model questions found in this filter state.
          </div>
        )}
      </div>
    </div>
  );
}
