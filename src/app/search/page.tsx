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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="pb-5 border-b border-slate-200/90 dark:border-slate-800/90">
        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          Verified Question Repository
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
          Question Explorer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
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
