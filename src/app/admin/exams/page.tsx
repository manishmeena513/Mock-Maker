import React from "react";
import { getExams } from "@/lib/db";
import { SEED_SUBJECTS, SEED_TOPICS } from "@/lib/data/seedData";
import { AdminExamsClient } from "@/components/admin/AdminExamsClient";

export default async function AdminExamsPage() {
  const exams = await getExams();

  return (
    <AdminExamsClient
      initialExams={exams}
      subjects={SEED_SUBJECTS}
      topics={SEED_TOPICS}
    />
  );
}
