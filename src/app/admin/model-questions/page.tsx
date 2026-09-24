import React from "react";
import { getAllQuestions } from "@/lib/db";
import { ModelQuestionsReviewClient } from "@/components/admin/ModelQuestionsReviewClient";

export default async function AdminModelQuestionsPage() {
  const allQuestions = await getAllQuestions();

  return <ModelQuestionsReviewClient initialQuestions={allQuestions} />;
}
