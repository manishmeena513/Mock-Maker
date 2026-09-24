import { NextRequest, NextResponse } from "next/server";
import { processDirectCsv, buildQuestionsFromImportRows, getImportLimits } from "@/lib/import/importService";
import {
  getAllQuestions,
  getExams,
  getSubjectsByExamId,
  getTopicsBySubjectId,
  addQuestionsBatchToBank,
  createImportBatchRecord,
} from "@/lib/db";
import { verifyAdminAuthorization } from "@/lib/auth/admin";
import { QuestionImportBatch, Json } from "@/types/database";
import { importLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  const rateCheck = await importLimiter.check(req);
  if (!rateCheck.success) {
    logger.warn("Rate limit exceeded for CSV import", { requestId });
    return withRequestIdHeaders(
      NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 }),
      requestId
    );
  }

  // 1. Server-side Admin Authorization Guard
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    logger.warn("Unauthorized CSV import attempt", { requestId, error: auth.error });
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Forbidden" }, { status: 403 }),
      requestId
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const confirm = formData.get("confirm") === "true";

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
    }

    // 2. Serverless payload size guard (prevent memory exhaustion)
    const limits = getImportLimits();
    const maxBytes = limits.maxExtractedSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `CSV file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum serverless limit of ${limits.maxExtractedSizeMb} MB.`,
        },
        { status: 413 }
      );
    }

    const content = await file.text();
    const existingQuestions = await getAllQuestions();

    const exams = await getExams();
    const subjects = [];
    const topics = [];
    for (const exam of exams) {
      const subs = await getSubjectsByExamId(exam.id);
      subjects.push(...subs);
      for (const s of subs) {
        const tops = await getTopicsBySubjectId(s.id);
        topics.push(...tops);
      }
    }

    const preview = await processDirectCsv({
      filename: file.name,
      csvText: content,
      existingQuestions,
      taxonomy: { exams, subjects, topics },
    });

    if (!confirm) {
      return NextResponse.json({
        message: "CSV preview generated successfully",
        preview,
      });
    }

    // Confirmation mode: insert valid rows
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const questionsToInsert = buildQuestionsFromImportRows(batchId, preview.rows);
    const count = await addQuestionsBatchToBank(questionsToInsert);

    const batchRecord: QuestionImportBatch = {
      id: batchId,
      admin_user_id: auth.userId || null,
      filename: file.name,
      import_type: "CSV",
      total_files: 1,
      total_rows: preview.totalRows,
      valid_rows: preview.validRowsCount,
      invalid_rows: preview.invalidRowsCount,
      duplicate_rows: preview.duplicateRowsCount,
      imported_rows: count,
      status: count > 0 ? "completed" : "failed",
      error_log: preview.invalidRowsCount > 0 ? ({ errors: preview.rows.filter(r => r.status === "invalid").slice(0, 100) } as unknown as Json) : null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    await createImportBatchRecord(batchRecord);

    return NextResponse.json({
      success: true,
      batchId,
      importedRows: count,
      rejectedInvalid: preview.invalidRowsCount,
      rejectedDuplicates: preview.duplicateRowsCount,
      pendingApproval: count,
    });
  } catch (err: unknown) {
    console.error("CSV import error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
