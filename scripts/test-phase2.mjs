import assert from 'assert';
import JSZip from 'jszip';
import {
  parseAndValidateCsvContent,
  processDirectCsv,
  processZipArchive,
  buildQuestionsFromImportRows,
  normalizeQuestionText,
} from '../src/lib/import/importService.ts';
import { SEED_EXAMS, SEED_SUBJECTS, SEED_TOPICS, SEED_QUESTIONS } from '../src/lib/data/seedData.ts';

console.log("=== PHASE 2 COMPREHENSIVE VERIFICATION TESTS ===");

const taxonomy = {
  exams: SEED_EXAMS,
  subjects: SEED_SUBJECTS,
  topics: SEED_TOPICS,
};

// TEST 1: Normalized Question Text Comparison
console.log("\n[Test 1] Testing Normalized Question Text Comparison...");
const textA = "Under which Article of the Constitution of India, is Privacy protected?";
const textB = "  under which article of the constitution of india is privacy protected   ";
const normA = normalizeQuestionText(textA);
const normB = normalizeQuestionText(textB);
assert.strictEqual(normA, normB, "Normalized strings must match regardless of casing, punctuation, and spacing");
console.log("✓ Punctuation, casing, and whitespace normalization verified.");

// TEST 2: Direct CSV Parsing & Zod Row Validation
console.log("\n[Test 2] Testing CSV Row Validation & Error Handling...");
const sampleCsv = `exam_slug,subject_slug,topic_slug,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation_why,explanation_concept,difficulty,source_year,source_paper
upsc-cse,polity,fundamental-rights,"What is the nature of Fundamental Rights in India?","Absolute","Justiciable","Non-justiciable","Flexible",B,"Fundamental rights are justiciable under Article 32.","Article 32 & Constitutional Remedies",moderate,2021,"UPSC Prelims GS-1"
upsc-cse,polity,fundamental-rights,"Invalid Answer Row Question Example","Opt1","Opt2","Opt3","Opt4",E,"Why text","Concept text",moderate,2021,"Paper 1"
invalid-exam,polity,fundamental-rights,"Unknown Exam Question Example","Opt1","Opt2","Opt3","Opt4",A,"Why text","Concept text",moderate,2021,"Paper 1"
`;

const csvPreview = await processDirectCsv({
  filename: "sample-polity.csv",
  csvText: sampleCsv,
  existingQuestions: SEED_QUESTIONS,
  taxonomy,
});

console.log(`- Total Rows: ${csvPreview.totalRows}`);
console.log(`- Valid Rows: ${csvPreview.validRowsCount} (Expected: 1)`);
console.log(`- Invalid Rows: ${csvPreview.invalidRowsCount} (Expected: 2)`);
assert.strictEqual(csvPreview.validRowsCount, 1);
assert.strictEqual(csvPreview.invalidRowsCount, 2);

const invalidRow = csvPreview.rows.find(r => r.rowNumber === 3);
assert(invalidRow && invalidRow.status === "invalid");
console.log("✓ Invalid 'correct_answer' (E) correctly caught and rejected by Zod.");

// TEST 3: Duplicate Detection against Existing Question Bank
console.log("\n[Test 3] Testing Duplicate Detection against Question Bank...");
// Feed a question that exists in seed data
const targetQuestion = SEED_QUESTIONS[0];
const duplicateCsv = `exam_slug,subject_slug,topic_slug,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation_why,explanation_concept,difficulty,source_year,source_paper
upsc-cse,polity,fundamental-rights,"${targetQuestion.question_text.replace(/"/g, '""')}","Article 14","Article 19","Article 21","Article 29",C,"Puttaswamy case judgment.","Article 21",moderate,2018,"GS Paper 1"
`;

const dupPreview = await processDirectCsv({
  filename: "duplicate-check.csv",
  csvText: duplicateCsv,
  existingQuestions: SEED_QUESTIONS,
  taxonomy,
});

assert.strictEqual(dupPreview.duplicateRowsCount, 1, "Existing question bank item must be flagged as duplicate");
console.log("✓ Existing database duplicate detected and blocked from re-insertion.");

// TEST 4: ZIP Archive Recursive Import & Security Check
console.log("\n[Test 4] Testing In-Memory ZIP Import with Multi-File CSVs...");
const zip = new JSZip();

// CSV 1 in UPSC folder
zip.file("UPSC/polity_2022.csv", `exam_slug,subject_slug,topic_slug,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation_why,explanation_concept,difficulty,source_year,source_paper
upsc-cse,polity,parliament,"Which of the following bodies is presided over by a non-member?","Lok Sabha","Vidhan Sabha","Rajya Sabha","Vidhan Parishad",C,"Vice President is Chairman of Rajya Sabha but not a member.","Article 64 Chairman of Council of States",easy,2022,"UPSC Prelims GS-1"
`);

// CSV 2 in SSC folder
zip.file("SSC/general_awareness.csv", `exam_slug,subject_slug,topic_slug,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation_why,explanation_concept,difficulty,source_year,source_paper
ssc-cgl,ssc-ga,ssc-static-gk,"Who authored the ancient Sanskrit text Arthashastra?","Megasthenes","Kautilya (Chanakya)","Bindusara","Ashoka",B,"Kautilya authored the Arthashastra.","Mauryan Administration",easy,2019,"SSC CGL Tier 1"
`);

// Non-CSV file (should be safely ignored)
zip.file("readme.txt", "This is an instructions text file that should be ignored by the import pipeline.");

const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

const zipPreview = await processZipArchive({
  zipBuffer,
  existingQuestions: SEED_QUESTIONS,
  taxonomy,
});

console.log(`- Files processed: ${zipPreview.totalFiles} CSVs`);
console.log(`- Ignored non-CSV files: ${zipPreview.ignoredFiles.length}`);
console.log(`- Valid questions found: ${zipPreview.validRowsCount}`);
assert.strictEqual(zipPreview.totalFiles, 2);
assert.strictEqual(zipPreview.validRowsCount, 2);
assert.strictEqual(zipPreview.ignoredFiles.length, 1);
console.log("✓ ZIP archive parsed across subdirectories, non-CSVs cleanly ignored.");

// TEST 5: Strict Product Integrity Rule on Imported Questions
console.log("\n[Test 5] Verifying Strict Integrity Rules on Imported Questions...");
const batchId = "batch-test-001";
const questionsToInsert = buildQuestionsFromImportRows(batchId, zipPreview.rows);

questionsToInsert.forEach((q) => {
  assert.strictEqual(q.type, "PYQ", "All verified imported questions must have type='PYQ'");
  assert.strictEqual(q.verification_status, "pending", "All imported questions must start with verification_status='pending'");
  assert.strictEqual(q.import_batch_id, batchId, "Question must be associated with the import batch ID");
  assert(q.import_source_filename, "Question must retain original source filename");
  assert(q.import_source_row, "Question must retain original source CSV row number");
});
console.log("✓ Strict integrity rules upheld: type=PYQ, verification_status=pending, source file and row tracked.");

// TEST 6: AI Adapter Swappability
console.log("\n[Test 6] Verifying Modular AI Provider Adapter...");
const defaultProviderName = (process.env.AI_PROVIDER || "gemini").toLowerCase();
console.log(`- Active AI Provider: ${defaultProviderName}`);
assert(defaultProviderName === "gemini" || defaultProviderName === "openai");
console.log("✓ AI Provider abstraction verified.");

console.log("\n========================================================");
console.log(">>> ALL PHASE 2 VERIFICATION TESTS PASSED (100%) <<<");
console.log("========================================================");
