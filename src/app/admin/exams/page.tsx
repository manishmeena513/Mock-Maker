import React from "react";
import { getAllExamsForAdmin, getAllSubjects, getAllTopics } from "@/lib/db";
import { AdminExamsClient } from "@/components/admin/AdminExamsClient";

export default async function AdminExamsPage() {
  const [exams, subjects, topics] = await Promise.all([
    getAllExamsForAdmin(),
    getAllSubjects(true),
    getAllTopics(true),
  ]);

  return (
    <AdminExamsClient
      initialExams={exams}
      subjects={subjects}
      topics={topics}
    />
  );
}
