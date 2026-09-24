"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Question, Exam, Subject, Topic, PaginationMetadata } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { SaveButton } from "@/components/shared/SaveButton";
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import {
  Search,
  Filter,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface QuestionExplorerClientProps {
  initialQuestions: Question[];
  pagination: PaginationMetadata;
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  currentFilters: {
    q?: string;
    exam?: string;
    subject?: string;
    topic?: string;
    type?: string;
    difficulty?: string;
    year?: string;
    paper?: string;
  };
}

export function QuestionExplorerClient({
  initialQuestions,
  pagination,
  exams,
  subjects,
  topics,
  currentFilters,
}: QuestionExplorerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Local filter state initialized from server props
  const [searchQuery, setSearchQuery] = useState(currentFilters.q || "");
  const [selectedExam, setSelectedExam] = useState(currentFilters.exam || "all");
  const [selectedSubject, setSelectedSubject] = useState(currentFilters.subject || "all");
  const [selectedTopic, setSelectedTopic] = useState(currentFilters.topic || "all");
  const [selectedType, setSelectedType] = useState(currentFilters.type || "all");
  const [selectedDifficulty, setSelectedDifficulty] = useState(currentFilters.difficulty || "all");
  const [selectedYear, setSelectedYear] = useState(currentFilters.year || "");
  const [selectedPaper, setSelectedPaper] = useState(currentFilters.paper || "");

  // Available subjects based on exam selection
  const availableSubjects = selectedExam !== "all"
    ? subjects.filter((s) => s.exam_id === selectedExam)
    : subjects;

  // Available topics based on subject selection
  const availableTopics = selectedSubject !== "all"
    ? topics.filter((t) => t.subject_id === selectedSubject)
    : topics;

  // Update URL search parameters
  const applyFilters = (newParams: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 on filter changes unless page itself is specified
    if (!("page" in newParams)) {
      params.delete("page");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q: searchQuery.trim() });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedExam("all");
    setSelectedSubject("all");
    setSelectedTopic("all");
    setSelectedType("all");
    setSelectedDifficulty("all");
    setSelectedYear("");
    setSelectedPaper("");
    router.push(pathname);
  };

  return (
    <div className="space-y-6">
      {/* Search & Multi-Faceted Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by concept (e.g. 'Fundamental Rights', 'Monsoon', 'Ordinance')..."
            className="w-full pl-11 pr-24 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            Search
          </button>
        </form>

        {/* Multi-Faceted Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          {/* Exam Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedExam(val);
                setSelectedSubject("all");
                setSelectedTopic("all");
                applyFilters({ exam: val, subject: null, topic: null });
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
            >
              <option value="all">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSubject(val);
                setSelectedTopic("all");
                applyFilters({ subject: val, topic: null });
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTopic(val);
                applyFilters({ topic: val });
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
            >
              <option value="all">All Topics</option>
              {availableTopics.map((top) => (
                <option key={top.id} value={top.id}>
                  {top.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedType(val);
                applyFilters({ type: val });
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
            >
              <option value="all">All Types</option>
              <option value="PYQ">Verified PYQs (80%)</option>
              <option value="MODEL">Model Questions (20%)</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDifficulty(val);
                applyFilters({ difficulty: val });
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header with Serverless Pagination Status */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {initialQuestions.length} of <strong>{pagination.totalItems}</strong> matching questions (Page {pagination.page} of {pagination.totalPages})
        </span>

        {isPending && <span className="font-bold text-blue-600 animate-pulse">Filtering...</span>}
      </div>

      {/* Questions List */}
      {initialQuestions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3">
          <Filter className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No questions matched your search criteria
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or relaxing subject and type filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialQuestions.map((q) => {
            const isExpanded = expandedQuestionId === q.id;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <QuestionTypeBadge
                      type={q.type}
                      sourceYear={q.source_year}
                      examName={q.type === "PYQ" ? q.source_paper || undefined : undefined}
                    />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {q.difficulty}
                    </span>
                  </div>

                  <SaveButton questionId={q.id} />
                </div>

                {/* Question Text */}
                <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                  {q.question_text}
                </p>

                {/* Toggle Solution */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{isExpanded ? "Hide Full Solution" : "View Options & Solution"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expanded Solution Drawer */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in-50 duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const optText =
                          opt === "A"
                            ? q.option_a
                            : opt === "B"
                            ? q.option_b
                            : opt === "C"
                            ? q.option_c
                            : q.option_d;
                        const isCorrect = q.correct_answer === opt;

                        return (
                          <div
                            key={opt}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                              isCorrect
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-900 dark:text-emerald-200"
                                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span className="font-bold">{opt}.</span>
                            <span>{optText}</span>
                          </div>
                        );
                      })}
                    </div>

                    <ExplanationPanel
                      explanation={q.explanation}
                      correctAnswer={q.correct_answer}
                      type={q.type}
                      sourceYear={q.source_year}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Server-Side Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={!pagination.hasPrevPage || isPending}
            onClick={() => applyFilters({ page: String(pagination.page - 1) })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Page</span>
          </button>

          <span className="text-xs font-semibold text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNextPage || isPending}
            onClick={() => applyFilters({ page: String(pagination.page + 1) })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
