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

  const [searchQuery, setSearchQuery] = useState(currentFilters.q || "");
  const [selectedExam, setSelectedExam] = useState(currentFilters.exam || "all");
  const [selectedSubject, setSelectedSubject] = useState(currentFilters.subject || "all");
  const [selectedTopic, setSelectedTopic] = useState(currentFilters.topic || "all");
  const [selectedType, setSelectedType] = useState(currentFilters.type || "all");
  const [selectedDifficulty, setSelectedDifficulty] = useState(currentFilters.difficulty || "all");
  const [selectedYear, setSelectedYear] = useState(currentFilters.year || "all");

  const availableSubjects =
    selectedExam !== "all" ? subjects.filter((s) => s.exam_id === selectedExam) : subjects;

  const availableTopics =
    selectedSubject !== "all" ? topics.filter((t) => t.subject_id === selectedSubject) : topics;

  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

  const applyFilters = (newParams: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

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
    setSelectedYear("all");
    router.push(pathname);
  };

  const resolveExamName = (examId: string) =>
    exams.find((e) => e.id === examId)?.name || "UPSC CSE";
  const resolveSubjectName = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.name || "General Studies";
  const resolveTopicName = (topicId: string, fallbackConcept?: string) =>
    topics.find((t) => t.id === topicId)?.name || fallbackConcept || "Syllabus Concept";

  return (
    <div className="space-y-6">
      {/* Search & 6-Column Editorial Filter Bar */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by concept, constitutional article, keyword..."
            className="w-full h-10 pl-10 pr-24 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="absolute right-1.5 h-7 px-3.5 rounded text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Filter Bar: Exam | Subject | Topic | Type | Difficulty | Year */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* 1. Exam */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
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
              className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="all">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Subject */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
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
              className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Topic */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTopic(val);
                applyFilters({ topic: val });
              }}
              className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="all">All Topics</option>
              {availableTopics.map((top) => (
                <option key={top.id} value={top.id}>
                  {top.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Type */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedType(val);
                applyFilters({ type: val });
              }}
              className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="all">All Types</option>
              <option value="PYQ">Verified PYQ</option>
              <option value="MODEL">Model Question</option>
            </select>
          </div>

          {/* 5. Difficulty */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDifficulty(val);
                applyFilters({ difficulty: val });
              }}
              className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* 6. Year */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              Year (PYQ)
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val);
                applyFilters({ year: val });
              }}
              className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
            >
              <option value="all">All Years</option>
              {years.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Status & Reset Strip */}
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <div>
            Showing{" "}
            <strong className="font-mono text-[var(--foreground)]">
              {initialQuestions.length}
            </strong>{" "}
            of{" "}
            <strong className="font-mono text-[var(--foreground)]">{pagination.totalItems}</strong>{" "}
            verified questions
            {isPending && (
              <span className="ml-2 text-[var(--accent)] font-medium">Updating...</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Results List */}
      {initialQuestions.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-md bg-[var(--muted)] mx-auto flex items-center justify-center text-[var(--muted-foreground)]">
            <Filter className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            No questions matched your filters
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
            Try clearing your search query or broadening the selected examination, subject, or year filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
          {initialQuestions.map((q) => {
            const isExpanded = expandedQuestionId === q.id;
            const examName = resolveExamName(q.exam_id);
            const subjectName = resolveSubjectName(q.subject_id);
            const topicName = resolveTopicName(q.topic_id, q.explanation?.concept);

            return (
              <div key={q.id} className="p-5 sm:p-6 space-y-3">
                {/* Metadata Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <QuestionTypeBadge
                      type={q.type}
                      examName={examName}
                      sourceYear={q.type === "PYQ" ? q.source_year : null}
                    />
                    <span className="text-[var(--muted-foreground)]">
                      {subjectName} • {topicName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {q.difficulty === "moderate" ? "Medium" : q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <SaveButton questionId={q.id} />
                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide Solution" : "Options & Solution"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-sm sm:text-base text-[var(--foreground)] leading-relaxed">
                  {q.question_text}
                </p>

                {isExpanded && (
                  <div className="pt-4 border-t border-[var(--border)] space-y-4">
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
                            className={`p-3 rounded-md border flex items-start gap-2.5 ${
                              isCorrect
                                ? "bg-[var(--sage-muted)] border-[var(--sage)] font-medium text-[var(--foreground)]"
                                : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                            }`}
                          >
                            <span className="font-mono font-semibold">{opt}.</span>
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

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            disabled={!pagination.hasPrevPage || isPending}
            onClick={() => applyFilters({ page: String(pagination.page - 1) })}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-mono text-[var(--muted-foreground)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNextPage || isPending}
            onClick={() => applyFilters({ page: String(pagination.page + 1) })}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
