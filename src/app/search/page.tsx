import React from "react";
import { getPaginatedQuestions, getExams, getAllSubjects, getAllTopics } from "@/lib/db";
import { QuestionExplorerClient } from "@/components/search/QuestionExplorerClient";

interface SearchPageProps {
  searchParams?: Promise<{
    q?: string;
    exam?: string;
    subject?: string;
    topic?: string;
    type?: "PYQ" | "MODEL";
    difficulty?: "easy" | "moderate" | "hard";
    year?: string;
    paper?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const sourceYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : undefined;

  const [exams, subjects, topics, { questions, pagination }] = await Promise.all([
    getExams(),
    getAllSubjects(),
    getAllTopics(),
    getPaginatedQuestions({
      examId: resolvedParams.exam,
      subjectId: resolvedParams.subject,
      topicId: resolvedParams.topic,
      type: resolvedParams.type,
      difficulty: resolvedParams.difficulty,
      sourceYear: isNaN(sourceYear as number) ? undefined : sourceYear,
      sourcePaper: resolvedParams.paper,
      search: resolvedParams.q,
      status: "approved",
      page,
      pageSize: 20,
    }),
  ]);

  return (
    <div className="mm-container py-6 sm:py-10 space-y-8 animate-fade-in">
      <div className="pb-6 border-b border-[var(--border)]">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>Verified Question Archive</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Question Explorer
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Filter and study verified past commission papers (PYQs) and moderated model questions with structured explanations across 22 examinations.
        </p>
      </div>

      <QuestionExplorerClient
        initialQuestions={questions}
        pagination={pagination}
        exams={exams}
        subjects={subjects}
        topics={topics}
        currentFilters={resolvedParams}
      />
    </div>
  );
}
