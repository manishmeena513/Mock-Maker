"use server";

import {
  processDirectCsv,
  processZipArchive,
  buildQuestionsFromImportRows,
  ParsedRowResult,
  ImportPreviewResult,
} from "@/lib/import/importService";
import {
  getAllQuestions,
  getExams,
  getSubjectsByExamId,
  getTopicsBySubjectId,
  addQuestionsBatchToBank,
  createImportBatchRecord,
} from "@/lib/db";
import { verifyAdminAuthorization } from "@/lib/auth/admin";
import { QuestionImportBatch } from "@/types/database";

// Helper to gather complete taxonomy for validation
async function getTaxonomyMap() {
  const exams = await getExams();
  const allSubjects = [];
  const allTopics = [];

  for (const exam of exams) {
    const subs = await getSubjectsByExamId(exam.id);
    allSubjects.push(...subs);
    for (const sub of subs) {
      const tops = await getTopicsBySubjectId(sub.id);
      allTopics.push(...tops);
    }
  }

  return { exams, subjects: allSubjects, topics: allTopics };
}

export async function previewCsvImportAction(formData: FormData): Promise<ImportPreviewResult> {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Forbidden: Administrator privileges required.");
  }

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No CSV file uploaded.");

  const filename = file.name;
  const content = await file.text();
  const existingQuestions = await getAllQuestions();
  const taxonomy = await getTaxonomyMap();

  return processDirectCsv({
    filename,
    csvText: content,
    existingQuestions,
    taxonomy,
  });
}

export async function previewZipImportAction(formData: FormData): Promise<ImportPreviewResult> {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Forbidden: Administrator privileges required.");
  }

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No ZIP file uploaded.");

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const existingQuestions = await getAllQuestions();
  const taxonomy = await getTaxonomyMap();

  return processZipArchive({
    zipBuffer: buffer,
    existingQuestions,
    taxonomy,
  });
}

export async function confirmImportAction({
  filename,
  importType,
  validRows,
}: {
  filename: string;
  importType: "CSV" | "ZIP";
  validRows: ParsedRowResult[];
}): Promise<{ success: boolean; batchId: string; importedCount: number }> {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Forbidden: Administrator privileges required.");
  }

  if (validRows.length === 0) {
    throw new Error("No valid questions to import.");
  }

  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const questionsToInsert = buildQuestionsFromImportRows(batchId, validRows);

  const insertedCount = await addQuestionsBatchToBank(questionsToInsert);

  const batchRecord: QuestionImportBatch = {
    id: batchId,
    admin_user_id: auth.userId && auth.userId !== "local-dev-admin" ? auth.userId : null,
    filename,
    import_type: importType,
    total_files: importType === "ZIP" ? new Set(validRows.map((r) => r.filename)).size : 1,
    total_rows: validRows.length,
    valid_rows: validRows.length,
    invalid_rows: 0,
    duplicate_rows: 0,
    imported_rows: insertedCount,
    status: "completed",
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

  await createImportBatchRecord(batchRecord);

  return {
    success: true,
    batchId,
    importedCount: insertedCount,
  };
}
