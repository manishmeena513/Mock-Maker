import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminAuthorization } from "@/lib/auth/admin";
import { githubImportLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";
import {
  analyzeGitHubRepository,
  processGitHubRepositoryImport,
  runSecondPassValidation,
  normalizeGitHubQuestionText,
} from "@/lib/import/githubImporter";
import {
  getAllExamsForAdmin,
  getAllSubjects,
  getAllTopics,
  getAllQuestions,
  addQuestionsBatchToBank,
  createImportBatchRecord,
  getImportBatches,
  getImportBatchById,
  updateImportBatchRecord,
  saveGitHubImportCandidates,
  getGitHubImportCandidatesByBatchId,
  getAllGitHubImportCandidates,
  getGitHubImportCandidateById,
  updateGitHubImportCandidate,
  recordAdminAuditLog,
  getAdminAuditLogs,
} from "@/lib/db";
import { Question, QuestionImportBatch, QuestionType } from "@/types/database";

const AnalyzeOrProcessSchema = z.object({
  action: z.enum(["analyze", "process"]).default("analyze"),
  repoUrl: z.string().min(1, "GitHub Repository URL is required"),
  branch: z.string().max(120).optional().nullable(),
  subpath: z.string().max(300).optional().nullable(),
  questionType: z.enum(["PYQ", "MODEL", "AUTO"]).optional().default("AUTO"),
  examId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  topicId: z.string().optional().nullable(),
  mockFiles: z
    .array(
      z.object({
        path: z.string(),
        sizeBytes: z.number().optional(),
        content: z.string(),
      })
    )
    .optional(),
});

const ReviewActionSchema = z.object({
  action: z.enum(["approve", "reject", "edit"]),
  batchId: z.string().optional(),
  candidateIds: z.array(z.string()).optional(),
  candidateId: z.string().optional(),
  questionType: z.enum(["PYQ", "MODEL"]).optional(),
  examId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  topicId: z.string().optional().nullable(),
  updates: z
    .object({
      question_text: z.string().min(10).optional(),
      option_a: z.string().min(1).optional(),
      option_b: z.string().min(1).optional(),
      option_c: z.string().min(1).optional(),
      option_d: z.string().min(1).optional(),
      correct_answer: z.enum(["A", "B", "C", "D"]).nullable().optional(),
      explanation: z
        .object({
          why: z.string(),
          concept: z.string(),
          exam_perspective: z.string().optional(),
          remember: z.string().optional(),
          related_concept: z.string().optional(),
        })
        .optional(),
      exam_id: z.string().nullable().optional(),
      subject_id: z.string().nullable().optional(),
      topic_id: z.string().nullable().optional(),
      question_type: z.enum(["PYQ", "MODEL"]).optional(),
      difficulty: z.enum(["easy", "moderate", "hard"]).optional(),
      source_year: z.number().int().min(1970).max(2026).nullable().optional(),
      source_paper: z.string().nullable().optional(),
    })
    .optional(),
});

async function refreshBatchCounters(batchId: string) {
  const candidates = await getGitHubImportCandidatesByBatchId(batchId);
  const approvedCount = candidates.filter((c) => c.verification_status === "approved").length;
  const rejectedCount = candidates.filter((c) => c.verification_status === "rejected").length;
  const pendingCount = candidates.filter((c) => c.verification_status === "pending").length;

  await updateImportBatchRecord(batchId, {
    approved_count: approvedCount,
    rejected_count: rejectedCount,
    pending_count: pendingCount,
    imported_rows: approvedCount,
  });
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  const auth = await verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Forbidden" }, { status: 403 }),
      requestId
    );
  }

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");

  if (batchId) {
    const batch = await getImportBatchById(batchId);
    if (!batch) {
      return withRequestIdHeaders(
        NextResponse.json({ error: `Import batch "${batchId}" not found.` }, { status: 404 }),
        requestId
      );
    }
    const candidates = await getGitHubImportCandidatesByBatchId(batchId);
    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        batch,
        candidates,
      }),
      requestId
    );
  }

  const allBatches = await getImportBatches();
  const githubBatches = allBatches.filter((b) => b.import_type === "GITHUB");
  const auditLogs = await getAdminAuditLogs(50);

  return withRequestIdHeaders(
    NextResponse.json({
      success: true,
      batches: githubBatches,
      auditLogs,
    }),
    requestId
  );
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  // 1. Admin Authorization Check
  const auth = await verifyAdminAuthorization(req);
  if (!auth.authorized) {
    logger.warn("Unauthorized GitHub import attempt", { requestId, error: auth.error });
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Forbidden" }, { status: 403 }),
      requestId
    );
  }

  // 2. Rate Limit Check
  const rateCheck = await githubImportLimiter.check(req, auth.userId || "admin");
  if (!rateCheck.success) {
    return withRequestIdHeaders(
      NextResponse.json(
        { error: "Rate limit exceeded for GitHub import operations. Please wait a moment." },
        { status: 429 }
      ),
      requestId
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withRequestIdHeaders(
      NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }),
      requestId
    );
  }

  const parsed = AnalyzeOrProcessSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid request payload.";
    return withRequestIdHeaders(
      NextResponse.json({ error: firstIssue, details: parsed.error.format() }, { status: 400 }),
      requestId
    );
  }

  const {
    action,
    repoUrl,
    branch,
    subpath,
    questionType,
    examId,
    subjectId,
    topicId,
    mockFiles,
  } = parsed.data;

  // Step 1: Analyze Repository Only
  if (action === "analyze") {
    const analysis = await analyzeGitHubRepository({
      repoUrl,
      branch,
      subpath,
      mockFiles,
    });

    if (!analysis.valid || !analysis.summary) {
      return withRequestIdHeaders(
        NextResponse.json(
          { error: analysis.error || "Failed to analyze GitHub repository." },
          { status: 400 }
        ),
        requestId
      );
    }

    await recordAdminAuditLog({
      admin_user_id: auth.userId || null,
      action: "GITHUB_REPO_ANALYZE",
      entity_type: "github_repository",
      entity_id: analysis.summary.repository,
      metadata: {
        branch: analysis.summary.branch,
        subpath: analysis.summary.subpath,
        supportedFilesCount: analysis.summary.supportedFilesCount,
        ignoredFilesCount: analysis.summary.ignoredFilesCount,
        potentialQuestionsFound: analysis.summary.potentialQuestionsFound,
      },
    });

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        summary: analysis.summary,
      }),
      requestId
    );
  }

  // Step 2: Process Repository with AI + Validation + Duplicate Detection
  const [exams, subjects, topics, existingQuestions, previousCandidates] = await Promise.all([
    getAllExamsForAdmin(),
    getAllSubjects(true),
    getAllTopics(true),
    getAllQuestions(),
    getAllGitHubImportCandidates(),
  ]);

  const batchId = `gh-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const result = await processGitHubRepositoryImport({
    repoUrl,
    branch,
    subpath,
    defaultQuestionType: questionType,
    defaultExamId: examId,
    defaultSubjectId: subjectId,
    defaultTopicId: topicId,
    batchId,
    existingQuestions,
    previousCandidates,
    taxonomy: { exams, subjects, topics },
    mockFiles,
  });

  if (!result.valid || !result.summary) {
    return withRequestIdHeaders(
      NextResponse.json(
        { error: result.error || "Failed to process GitHub repository." },
        { status: 400 }
      ),
      requestId
    );
  }

  const candidates = result.candidates;
  await saveGitHubImportCandidates(candidates);

  const validCandidatesCount = candidates.filter((c) => c.validation_errors.length === 0).length;
  const invalidCandidatesCount = candidates.filter((c) => c.validation_errors.length > 0).length;
  const duplicateCandidatesCount = candidates.filter(
    (c) => c.duplicate_status === "duplicate"
  ).length;

  const now = new Date().toISOString();
  const batchRecord: QuestionImportBatch = {
    id: batchId,
    admin_user_id: auth.userId || null,
    filename: `github:${result.summary.repository}@${result.summary.branch}`,
    import_type: "GITHUB",
    total_files: result.summary.supportedFilesCount,
    total_rows: candidates.length,
    valid_rows: validCandidatesCount,
    invalid_rows: invalidCandidatesCount,
    duplicate_rows: duplicateCandidatesCount,
    imported_rows: 0, // Starts at 0 until admin explicitly approves candidates!
    status: candidates.length > 0 ? "completed" : "partial",
    source_repository: result.summary.repository,
    source_branch: result.summary.branch,
    source_path: result.summary.subpath || "/",
    files_scanned: result.summary.supportedFilesCount,
    questions_extracted: candidates.length,
    approved_count: 0,
    rejected_count: 0,
    pending_count: candidates.length,
    created_at: now,
    completed_at: now,
  };

  await createImportBatchRecord(batchRecord);

  await recordAdminAuditLog({
    admin_user_id: auth.userId || null,
    action: "GITHUB_REPO_PROCESS",
    entity_type: "question_import_batch",
    entity_id: batchId,
    metadata: {
      repository: result.summary.repository,
      branch: result.summary.branch,
      filesScanned: result.summary.supportedFilesCount,
      questionsExtracted: candidates.length,
      duplicatesFound: duplicateCandidatesCount,
    },
  });

  return withRequestIdHeaders(
    NextResponse.json({
      success: true,
      batch: batchRecord,
      summary: result.summary,
      candidates,
    }),
    requestId
  );
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();

  // 1. Admin Authorization Check
  const auth = await verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Forbidden" }, { status: 403 }),
      requestId
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withRequestIdHeaders(
      NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }),
      requestId
    );
  }

  const parsed = ReviewActionSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid review action payload.";
    return withRequestIdHeaders(
      NextResponse.json({ error: firstIssue, details: parsed.error.format() }, { status: 400 }),
      requestId
    );
  }

  const { action, candidateIds, candidateId, questionType, examId, subjectId, topicId, updates } =
    parsed.data;

  // ACTION: EDIT SINGLE CANDIDATE
  if (action === "edit") {
    const targetId = candidateId || candidateIds?.[0];
    if (!targetId || !updates) {
      return withRequestIdHeaders(
        NextResponse.json({ error: "candidateId and updates are required for edit." }, { status: 400 }),
        requestId
      );
    }

    const existing = await getGitHubImportCandidateById(targetId);
    if (!existing) {
      return withRequestIdHeaders(
        NextResponse.json({ error: `Candidate "${targetId}" not found.` }, { status: 404 }),
        requestId
      );
    }

    const [exams, subjects, topics] = await Promise.all([
      getAllExamsForAdmin(),
      getAllSubjects(true),
      getAllTopics(true),
    ]);

    const nextQuestionText = updates.question_text ?? existing.question_text;
    const nextOptA = updates.option_a ?? existing.option_a;
    const nextOptB = updates.option_b ?? existing.option_b;
    const nextOptC = updates.option_c ?? existing.option_c;
    const nextOptD = updates.option_d ?? existing.option_d;
    const nextAns =
      updates.correct_answer !== undefined ? updates.correct_answer : existing.correct_answer;
    const nextType: QuestionType = updates.question_type ?? existing.question_type;
    const nextYear =
      nextType === "MODEL"
        ? null
        : updates.source_year !== undefined
        ? updates.source_year
        : existing.source_year;
    const nextPaper =
      nextType === "MODEL"
        ? null
        : updates.source_paper !== undefined
        ? updates.source_paper
        : existing.source_paper;
    const nextExp = updates.explanation ?? existing.explanation;

    const nextExamId = updates.exam_id !== undefined ? updates.exam_id : existing.exam_id;
    const nextSubjectId =
      updates.subject_id !== undefined ? updates.subject_id : existing.subject_id;
    const nextTopicId = updates.topic_id !== undefined ? updates.topic_id : existing.topic_id;

    const resolvedExam = exams.find((e) => e.id === nextExamId);
    const resolvedSubject = subjects.find((s) => s.id === nextSubjectId);
    const resolvedTopic = topics.find((t) => t.id === nextTopicId);

    const validation = runSecondPassValidation({
      question_text: nextQuestionText,
      option_a: nextOptA,
      option_b: nextOptB,
      option_c: nextOptC,
      option_d: nextOptD,
      correct_answer: nextAns,
      explanation: nextExp,
      question_type: nextType,
      source_year: nextYear,
      source_paper: nextPaper,
      confidence: Math.max(existing.confidence, nextAns ? 0.9 : 0.65),
    });

    const updatedCandidate = await updateGitHubImportCandidate(targetId, {
      question_text: nextQuestionText,
      normalized_question_text: normalizeGitHubQuestionText(nextQuestionText),
      option_a: nextOptA,
      option_b: nextOptB,
      option_c: nextOptC,
      option_d: nextOptD,
      correct_answer: nextAns,
      requires_answer_verification: validation.requiresAnswerVerification,
      explanation: nextExp,
      exam_id: nextExamId,
      subject_id: nextSubjectId,
      topic_id: nextTopicId,
      exam_name: resolvedExam?.name ?? existing.exam_name,
      subject_name: resolvedSubject?.name ?? existing.subject_name,
      topic_name: resolvedTopic?.name ?? existing.topic_name,
      question_type: nextType,
      difficulty: updates.difficulty ?? existing.difficulty,
      source_year: nextYear,
      source_paper: nextPaper,
      confidence: validation.adjustedConfidence,
      validation_warnings: validation.warnings,
      validation_errors: validation.errors,
    });

    await recordAdminAuditLog({
      admin_user_id: auth.userId || null,
      action: "GITHUB_CANDIDATE_EDIT",
      entity_type: "github_import_candidate",
      entity_id: targetId,
      metadata: { batchId: existing.batch_id },
    });

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        candidate: updatedCandidate,
      }),
      requestId
    );
  }

  const targetIds = candidateIds && candidateIds.length > 0
    ? candidateIds
    : candidateId
    ? [candidateId]
    : [];

  if (targetIds.length === 0) {
    return withRequestIdHeaders(
      NextResponse.json({ error: "No candidateIds provided." }, { status: 400 }),
      requestId
    );
  }

  // ACTION: REJECT CANDIDATES
  if (action === "reject") {
    const affectedBatches = new Set<string>();
    const updatedList = [];

    for (const id of targetIds) {
      const cand = await getGitHubImportCandidateById(id);
      if (!cand) continue;
      affectedBatches.add(cand.batch_id);
      const updated = await updateGitHubImportCandidate(id, {
        verification_status: "rejected",
      });
      if (updated) updatedList.push(updated);
    }

    for (const bId of affectedBatches) {
      await refreshBatchCounters(bId);
    }

    await recordAdminAuditLog({
      admin_user_id: auth.userId || null,
      action: "GITHUB_CANDIDATES_REJECT",
      entity_type: "github_import_candidate",
      entity_id: targetIds.join(","),
      metadata: { count: updatedList.length },
    });

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        rejectedCount: updatedList.length,
        candidates: updatedList,
      }),
      requestId
    );
  }

  // ACTION: APPROVE CANDIDATES
  if (action === "approve") {
    const affectedBatches = new Set<string>();
    const promotedQuestions: Question[] = [];
    const approvedCandidates = [];
    const skippedReasons: Array<{ id: string; reason: string }> = [];

    const [exams, subjects, topics] = await Promise.all([
      getAllExamsForAdmin(),
      getAllSubjects(true),
      getAllTopics(true),
    ]);

    for (const id of targetIds) {
      const cand = await getGitHubImportCandidateById(id);
      if (!cand) {
        skippedReasons.push({ id, reason: "Candidate not found" });
        continue;
      }

      if (!cand.correct_answer || cand.requires_answer_verification) {
        skippedReasons.push({
          id,
          reason: "Cannot approve question without a verified correct_answer (A, B, C, or D).",
        });
        continue;
      }

      if (cand.validation_errors && cand.validation_errors.length > 0) {
        skippedReasons.push({
          id,
          reason: `Validation error: ${cand.validation_errors[0]}`,
        });
        continue;
      }

      const finalType: QuestionType = questionType || cand.question_type || "MODEL";

      // Section 20: PYQ vs MODEL classification rules
      // Never attach fake PYQ metadata to MODEL questions
      const finalSourceYear = finalType === "PYQ" ? cand.source_year : null;
      const finalSourcePaper =
        finalType === "PYQ"
          ? cand.source_paper || `GitHub (${cand.source_repository})`
          : null;

      const finalExamId = examId || cand.exam_id || exams[0]?.id || "exam-upsc-cse";
      const finalSubjectId =
        subjectId || cand.subject_id || subjects[0]?.id || "sub-polity";
      const finalTopicId = topicId || cand.topic_id || topics[0]?.id || "top-fr";

      const now = new Date().toISOString();
      const newQuestionId = cand.promoted_question_id || `gh-q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const newQuestion: Question = {
        id: newQuestionId,
        exam_id: finalExamId,
        subject_id: finalSubjectId,
        topic_id: finalTopicId,
        type: finalType,
        question_text: cand.question_text,
        option_a: cand.option_a,
        option_b: cand.option_b,
        option_c: cand.option_c,
        option_d: cand.option_d,
        correct_answer: cand.correct_answer,
        explanation: cand.explanation,
        difficulty: cand.difficulty || "moderate",
        source_year: finalSourceYear,
        source_paper: finalSourcePaper,
        verification_status: "approved",
        times_shown: 0,
        times_correct: 0,
        import_batch_id: cand.batch_id,
        import_source_filename: cand.source_filename,
        import_source_row: cand.source_line,
        source_repository: cand.source_repository,
        source_url: cand.source_url,
        source_path: cand.source_path,
        source_commit: cand.source_commit,
        ai_confidence: cand.confidence,
        created_at: now,
        updated_at: now,
      };

      promotedQuestions.push(newQuestion);
      affectedBatches.add(cand.batch_id);

      const updatedCand = await updateGitHubImportCandidate(id, {
        verification_status: "approved",
        question_type: finalType,
        exam_id: finalExamId,
        subject_id: finalSubjectId,
        topic_id: finalTopicId,
        source_year: finalSourceYear,
        source_paper: finalSourcePaper,
        promoted_question_id: newQuestionId,
      });
      if (updatedCand) approvedCandidates.push(updatedCand);
    }

    if (promotedQuestions.length > 0) {
      await addQuestionsBatchToBank(promotedQuestions);
    }

    for (const bId of affectedBatches) {
      await refreshBatchCounters(bId);
    }

    await recordAdminAuditLog({
      admin_user_id: auth.userId || null,
      action: "GITHUB_CANDIDATES_APPROVE",
      entity_type: "github_import_candidate",
      entity_id: targetIds.join(","),
      metadata: {
        approvedCount: approvedCandidates.length,
        skippedCount: skippedReasons.length,
        questionType: questionType || "candidate_default",
      },
    });

    if (approvedCandidates.length === 0 && skippedReasons.length > 0) {
      return withRequestIdHeaders(
        NextResponse.json(
          {
            error: skippedReasons[0].reason,
            skippedReasons,
          },
          { status: 400 }
        ),
        requestId
      );
    }

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        approvedCount: approvedCandidates.length,
        promotedQuestions,
        candidates: approvedCandidates,
        skippedReasons,
      }),
      requestId
    );
  }

  return withRequestIdHeaders(
    NextResponse.json({ error: "Unsupported action." }, { status: 400 }),
    requestId
  );
}
