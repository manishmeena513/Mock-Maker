import React from "react";
import { getAllQuestions, getExams } from "@/lib/db";
import { AdminQuestionsClient } from "@/components/admin/AdminQuestionsClient";

interface AdminQuestionsPageProps {
  searchParams?: Promise<{
    batchId?: string;
    tab?: string;
  }>;
}

export default async function AdminQuestionsPage({ searchParams }: AdminQuestionsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const exams = await getExams();
  const questions = await getAllQuestions();

  return (
    <div className="space-y-6">
      <AdminQuestionsClient
        initialQuestions={questions}
        exams={exams}
        initialBatchId={resolvedParams.batchId}
        initialTab={resolvedParams.tab}
      />
    </div>
  );
}
