import React from "react";
import { getPaginatedQuestions, getExams } from "@/lib/db";
import { SEED_SUBJECTS, SEED_TOPICS } from "@/lib/data/seedData";
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
  const exams = await getExams();

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const sourceYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : undefined;

  // Strict student privacy: only approved questions are accessible through public search
  const { questions, pagination } = await getPaginatedQuestions({
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
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Question Bank Search
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
          Explore Question Bank
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search authentic previous-year questions (80%) and syllabus-aligned model questions (20%) with verified explanations.
        </p>
      </div>

      <QuestionExplorerClient
        initialQuestions={questions}
        pagination={pagination}
        exams={exams}
        subjects={SEED_SUBJECTS}
        topics={SEED_TOPICS}
        currentFilters={resolvedParams}
      />
    </div>
  );
}
