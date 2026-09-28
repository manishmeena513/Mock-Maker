import React from "react";
import { Metadata } from "next";
import {
  getAllExamsForAdmin,
  getAllSubjects,
  getAllTopics,
  getImportBatches,
} from "@/lib/db";
import { AdminGitHubImportClient } from "@/components/admin/AdminGitHubImportClient";

export const metadata: Metadata = {
  title: "Import Questions from GitHub | Admin CMS",
  description:
    "Scan public GitHub repositories, extract candidate MCQs with Gemini AI, detect duplicates, and review questions before approval.",
};

export const dynamic = "force-dynamic";

export default async function AdminGitHubImportPage() {
  const [exams, subjects, topics, allBatches] = await Promise.all([
    getAllExamsForAdmin(),
    getAllSubjects(true),
    getAllTopics(true),
    getImportBatches(),
  ]);

  const githubBatches = allBatches.filter((b) => b.import_type === "GITHUB");

  return (
    <AdminGitHubImportClient
      exams={exams}
      subjects={subjects}
      topics={topics}
      initialBatches={githubBatches}
    />
  );
}
