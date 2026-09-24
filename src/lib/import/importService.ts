import { z } from "zod";
import Papa from "papaparse";
import JSZip from "jszip";
import type { Question, Exam, Subject, Topic, QuestionImportBatch, StructuredExplanation } from "@/types/database";

export interface ImportLimits {
  maxZipSizeMb: number;
  maxExtractedSizeMb: number;
  maxFilesPerZip: number;
  maxRowsPerCsv: number;
}

export function getImportLimits(): ImportLimits {
  return {
    maxZipSizeMb: Number(process.env.IMPORT_MAX_ZIP_SIZE_MB || 25),
    maxExtractedSizeMb: Number(process.env.IMPORT_MAX_EXTRACTED_SIZE_MB || 50),
    maxFilesPerZip: Number(process.env.IMPORT_MAX_FILES_PER_ZIP || 50),
    maxRowsPerCsv: Number(process.env.IMPORT_MAX_ROWS_PER_CSV || 5000),
  };
}

// Normalized text comparison for robust duplicate detection
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // strip punctuation
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

// Zod schema for each CSV row
export const CsvRowSchema = z.object({
  exam_slug: z.string().min(1, "exam_slug is required"),
  subject_slug: z.string().min(1, "subject_slug is required"),
  topic_slug: z.string().min(1, "topic_slug is required"),
  question_text: z.string().min(5, "question_text must be at least 5 characters"),
  option_a: z.string().min(1, "option_a is required"),
  option_b: z.string().min(1, "option_b is required"),
  option_c: z.string().min(1, "option_c is required"),
  option_d: z.string().min(1, "option_d is required"),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation_why: z.string().min(1, "explanation_why is required"),
  explanation_concept: z.string().min(1, "explanation_concept is required"),
  explanation_exam_perspective: z.string().optional().default(""),
  explanation_remember: z.string().optional().default(""),
  explanation_related: z.string().optional().default(""),
  source_year: z
    .preprocess((val) => (val === "" || val === undefined ? null : Number(val)), z.number().int().nullable().optional())
    .optional(),
  source_paper: z.string().optional().default(""),
  difficulty: z.enum(["easy", "moderate", "hard"]).default("moderate"),
});

export type RawCsvRow = z.infer<typeof CsvRowSchema>;

export type RowStatus = "valid" | "invalid" | "duplicate" | "warning";

export interface ParsedRowResult {
  filename: string;
  rowNumber: number;
  status: RowStatus;
  data?: RawCsvRow;
  matchedExamId?: string;
  matchedSubjectId?: string;
  matchedTopicId?: string;
  errors?: string[];
  warning?: string;
  previewQuestionText: string;
}

export interface ImportPreviewResult {
  importType: "CSV" | "ZIP";
  totalFiles: number;
  validFilesCount: number;
  invalidFilesCount: number;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  ignoredFiles: string[];
  rows: ParsedRowResult[];
}

export interface TaxonomyMap {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
}

// Core reusable CSV row processing
export function parseAndValidateCsvContent({
  filename,
  content,
  existingNormalizedQuestions,
  withinBatchNormalizedQuestions,
  taxonomy,
  maxRows,
}: {
  filename: string;
  content: string;
  existingNormalizedQuestions: Set<string>;
  withinBatchNormalizedQuestions: Set<string>;
  taxonomy: TaxonomyMap;
  maxRows: number;
}): { rows: ParsedRowResult[]; validCount: number; invalidCount: number; duplicateCount: number } {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const results: ParsedRowResult[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const rawRows = parsed.data.slice(0, maxRows);

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const validation = CsvRowSchema.safeParse(row);

    const questionPreview = (row.question_text || "Empty question text").slice(0, 80);

    if (!validation.success) {
      invalidCount++;
      const errors = validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      results.push({
        filename,
        rowNumber,
        status: "invalid",
        errors,
        previewQuestionText: questionPreview,
      });
      return;
    }

    const data = validation.data;
    const norm = normalizeQuestionText(data.question_text);

    // Duplicate detection: check against database
    if (existingNormalizedQuestions.has(norm)) {
      duplicateCount++;
      results.push({
        filename,
        rowNumber,
        status: "duplicate",
        errors: ["Duplicate question: already exists in the question bank."],
        previewQuestionText: questionPreview,
      });
      return;
    }

    // Duplicate detection: check within this same import batch
    if (withinBatchNormalizedQuestions.has(norm)) {
      duplicateCount++;
      results.push({
        filename,
        rowNumber,
        status: "duplicate",
        errors: ["Duplicate question: identical question found in another file/row of this import."],
        previewQuestionText: questionPreview,
      });
      return;
    }

    withinBatchNormalizedQuestions.add(norm);

    // Validate taxonomy matching
    const exam = taxonomy.exams.find((e) => e.slug === data.exam_slug);
    if (!exam) {
      invalidCount++;
      results.push({
        filename,
        rowNumber,
        status: "invalid",
        errors: [`Unknown exam_slug: "${data.exam_slug}" does not match any active exam.`],
        previewQuestionText: questionPreview,
      });
      return;
    }

    const subject = taxonomy.subjects.find((s) => s.exam_id === exam.id && s.slug === data.subject_slug);
    if (!subject) {
      invalidCount++;
      results.push({
        filename,
        rowNumber,
        status: "invalid",
        errors: [`Unknown subject_slug: "${data.subject_slug}" not found under exam "${exam.name}".`],
        previewQuestionText: questionPreview,
      });
      return;
    }

    const topic = taxonomy.topics.find((t) => t.subject_id === subject.id && t.slug === data.topic_slug);
    if (!topic) {
      invalidCount++;
      results.push({
        filename,
        rowNumber,
        status: "invalid",
        errors: [`Unknown topic_slug: "${data.topic_slug}" not found under subject "${subject.name}".`],
        previewQuestionText: questionPreview,
      });
      return;
    }

    validCount++;
    results.push({
      filename,
      rowNumber,
      status: "valid",
      data,
      matchedExamId: exam.id,
      matchedSubjectId: subject.id,
      matchedTopicId: topic.id,
      previewQuestionText: questionPreview,
    });
  });

  return { rows: results, validCount, invalidCount, duplicateCount };
}

// Process direct CSV file
export async function processDirectCsv({
  filename,
  csvText,
  existingQuestions,
  taxonomy,
}: {
  filename: string;
  csvText: string;
  existingQuestions: Question[];
  taxonomy: TaxonomyMap;
}): Promise<ImportPreviewResult> {
  const limits = getImportLimits();
  const existingNormalized = new Set(existingQuestions.map((q) => normalizeQuestionText(q.question_text)));
  const withinBatchNormalized = new Set<string>();

  const res = parseAndValidateCsvContent({
    filename,
    content: csvText,
    existingNormalizedQuestions: existingNormalized,
    withinBatchNormalizedQuestions: withinBatchNormalized,
    taxonomy,
    maxRows: limits.maxRowsPerCsv,
  });

  return {
    importType: "CSV",
    totalFiles: 1,
    validFilesCount: res.validCount > 0 ? 1 : 0,
    invalidFilesCount: res.validCount === 0 ? 1 : 0,
    totalRows: res.rows.length,
    validRowsCount: res.validCount,
    invalidRowsCount: res.invalidCount,
    duplicateRowsCount: res.duplicateCount,
    ignoredFiles: [],
    rows: res.rows,
  };
}

// Process ZIP file containing multiple CSVs
export async function processZipArchive({
  zipBuffer,
  existingQuestions,
  taxonomy,
}: {
  zipBuffer: Buffer;
  existingQuestions: Question[];
  taxonomy: TaxonomyMap;
}): Promise<ImportPreviewResult> {
  const limits = getImportLimits();

  // Validate ZIP buffer size
  const zipSizeMb = zipBuffer.byteLength / (1024 * 1024);
  if (zipSizeMb > limits.maxZipSizeMb) {
    throw new Error(
      `ZIP file size (${zipSizeMb.toFixed(1)} MB) exceeds configured limit of ${limits.maxZipSizeMb} MB.`
    );
  }

  const zip = await JSZip.loadAsync(zipBuffer);

  const existingNormalized = new Set(existingQuestions.map((q) => normalizeQuestionText(q.question_text)));
  const withinBatchNormalized = new Set<string>();

  const allRows: ParsedRowResult[] = [];
  const ignoredFiles: string[] = [];
  let totalExtractedBytes = 0;
  let csvFilesCount = 0;
  let validFilesCount = 0;
  let invalidFilesCount = 0;
  let totalValidRows = 0;
  let totalInvalidRows = 0;
  let totalDuplicateRows = 0;

  const entries = Object.keys(zip.files);

  for (const rawPath of entries) {
    const fileEntry = zip.files[rawPath];
    if (fileEntry.dir) continue;

    // Security check: Zip Slip / Path Traversal
    const sanitizedPath = rawPath.replace(/\\/g, "/");
    if (
      sanitizedPath.startsWith("/") ||
      sanitizedPath.includes("../") ||
      sanitizedPath.includes("..\\")
    ) {
      throw new Error(`Security Violation: Path traversal detected in ZIP entry "${rawPath}". Import aborted.`);
    }

    // Security check: Reject nested ZIPs
    if (sanitizedPath.toLowerCase().endsWith(".zip")) {
      ignoredFiles.push(`${sanitizedPath} (Nested ZIP rejected per security policy)`);
      continue;
    }

    // Filter: only process .csv files
    if (!sanitizedPath.toLowerCase().endsWith(".csv")) {
      ignoredFiles.push(`${sanitizedPath} (Non-CSV file ignored)`);
      continue;
    }

    csvFilesCount++;
    if (csvFilesCount > limits.maxFilesPerZip) {
      throw new Error(
        `Number of CSV files in ZIP exceeds limit of ${limits.maxFilesPerZip}. Import aborted.`
      );
    }

    const content = await fileEntry.async("string");
    totalExtractedBytes += Buffer.byteLength(content, "utf-8");

    if (totalExtractedBytes / (1024 * 1024) > limits.maxExtractedSizeMb) {
      throw new Error(
        `Total extracted content size exceeds limit of ${limits.maxExtractedSizeMb} MB. Import aborted.`
      );
    }

    const res = parseAndValidateCsvContent({
      filename: sanitizedPath,
      content,
      existingNormalizedQuestions: existingNormalized,
      withinBatchNormalizedQuestions: withinBatchNormalized,
      taxonomy,
      maxRows: limits.maxRowsPerCsv,
    });

    if (res.validCount > 0) validFilesCount++;
    else invalidFilesCount++;

    totalValidRows += res.validCount;
    totalInvalidRows += res.invalidCount;
    totalDuplicateRows += res.duplicateCount;
    allRows.push(...res.rows);
  }

  return {
    importType: "ZIP",
    totalFiles: csvFilesCount,
    validFilesCount,
    invalidFilesCount,
    totalRows: allRows.length,
    validRowsCount: totalValidRows,
    invalidRowsCount: totalInvalidRows,
    duplicateRowsCount: totalDuplicateRows,
    ignoredFiles,
    rows: allRows,
  };
}

// Convert valid parsed rows into Question objects for insertion
export function buildQuestionsFromImportRows(
  batchId: string,
  validRows: ParsedRowResult[]
): Question[] {
  return validRows
    .filter((r) => r.status === "valid" && r.data && r.matchedExamId && r.matchedSubjectId && r.matchedTopicId)
    .map((r, idx) => {
      const data = r.data!;
      const explanation: StructuredExplanation = {
        why: data.explanation_why,
        concept: data.explanation_concept,
        exam_perspective: data.explanation_exam_perspective || undefined,
        remember: data.explanation_remember || undefined,
        related_concept: data.explanation_related || undefined,
      };

      return {
        id: `imp-${batchId}-${idx + 1}`,
        exam_id: r.matchedExamId!,
        subject_id: r.matchedSubjectId!,
        topic_id: r.matchedTopicId!,
        type: "PYQ" as const, // Strict Rule: Imported verified PYQs are typed PYQ
        question_text: data.question_text,
        option_a: data.option_a,
        option_b: data.option_b,
        option_c: data.option_c,
        option_d: data.option_d,
        correct_answer: data.correct_answer,
        explanation,
        difficulty: data.difficulty,
        source_year: data.source_year ?? null,
        source_paper: data.source_paper || null,
        verification_status: "pending" as const, // Strict Rule: Imported questions always start as 'pending'
        times_shown: 0,
        times_correct: 0,
        import_batch_id: batchId,
        import_source_filename: r.filename,
        import_source_row: r.rowNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
}
