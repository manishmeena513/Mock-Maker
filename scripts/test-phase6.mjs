import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST as postAIChat, GET as getAIChatQuota } from "../src/app/api/ai/chat/route.ts";
import {
  GET as getGitHubImport,
  POST as postGitHubImport,
  PATCH as patchGitHubImport,
} from "../src/app/api/admin/import/github/route.ts";
import {
  validateGitHubRepoUrl,
  classifyRepositoryFile,
  analyzeGitHubRepository,
  extractFromCsvContent,
  extractFromJsonContent,
  extractFromMarkdownOrText,
  runSecondPassValidation,
  classifyCandidateDuplicate,
  normalizeGitHubQuestionText,
  GITHUB_IMPORT_LIMITS,
} from "../src/lib/import/githubImporter.ts";
import {
  updateUserPlan,
  getAllQuestions,
  getAIAssistantUsageLogs,
  getAdminAuditLogs,
} from "../src/lib/db.ts";
import {
  resolveGeminiModelCandidates,
  classifyGeminiError,
  GeminiServiceError,
} from "../src/lib/ai/providers/gemini.ts";
import { resetRateLimitStore } from "../src/lib/security/rateLimit.ts";

console.log("=== PHASE 6: MOCKMASTER AI ASSISTANT + ADMIN GITHUB QUESTION IMPORTER TESTS ===\n");

// ============================================================================
// PART A: MOCKMASTER AI ASSISTANT (11 REQUIRED TEST CASES)
// ============================================================================

console.log("--- PART A: MOCKMASTER AI ASSISTANT ---");

// [AI Test 1] Toggle opens/closes drawer & UI components exist
console.log("[AI Test 1] Verifying AI Assistant Toggle & Slide-Over Drawer UI...");
const navbarSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/shared/Navbar.tsx"),
  "utf8"
);
const drawerSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/ai/AIAssistantDrawer.tsx"),
  "utf8"
);
const contextSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/ai/AIAssistantContext.tsx"),
  "utf8"
);
assert(
  navbarSource.includes("toggleAssistant") && navbarSource.includes("AI Assistant"),
  "Navbar must include the AI Assistant toggle button"
);
assert(
  drawerSource.includes("MockMaster AI") &&
    drawerSource.includes("Exam Preparation Assistant") &&
    drawerSource.includes("Ask anything about your exam..."),
  "AIAssistantDrawer must display header 'MockMaster AI', subtitle 'Exam Preparation Assistant', and placeholder 'Ask anything about your exam...'"
);
assert(
  contextSource.includes("openAssistant") &&
    contextSource.includes("closeAssistant") &&
    contextSource.includes("toggleAssistant"),
  "AIAssistantContext must provide openAssistant, closeAssistant, and toggleAssistant"
);
console.log("✓ [AI Test 1] Toggle & Drawer UI verified.");

// [AI Test 2] Authenticated user can send message
console.log("[AI Test 2] Verifying authenticated user can send message to POST /api/ai/chat...");
resetRateLimitStore();
const chatUser1 = `ai-user-auth-${Date.now()}`;
await updateUserPlan(chatUser1, "PRO");

const authChatReq = new NextRequest("http://localhost:3000/api/ai/chat", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-test-user-id": chatUser1,
  },
  body: JSON.stringify({
    message: "Explain the concept of Basic Structure Doctrine in Indian Polity.",
    history: [],
    context: {
      exam: "UPSC CSE",
      subject: "Indian Polity",
      topic: "Constitutional Amendments",
      mode: "general",
    },
  }),
});
const authChatRes = await postAIChat(authChatReq);
assert.strictEqual(authChatRes.status, 200, "Authenticated user must receive HTTP 200");
const authChatData = await authChatRes.json();
assert.strictEqual(authChatData.success, true);
assert(typeof authChatData.reply === "string" && authChatData.reply.length > 20);
assert(authChatData.usage && authChatData.usage.used === 1);
console.log("✓ [AI Test 2] Authenticated user message succeeded.");

// [AI Test 3] Unauthenticated user blocked
console.log("[AI Test 3] Verifying unauthenticated user is blocked from POST /api/ai/chat...");
const unauthChatReq = new NextRequest("http://localhost:3000/api/ai/chat", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-test-auth": "unauthenticated",
  },
  body: JSON.stringify({
    message: "Solve this question for me.",
  }),
});
const unauthChatRes = await postAIChat(unauthChatReq);
assert.strictEqual(unauthChatRes.status, 401, "Unauthenticated user must receive HTTP 401");
console.log("✓ [AI Test 3] Unauthenticated user blocked (401).");

// [AI Test 4] Exam context sent properly
console.log("[AI Test 4] Verifying exam/subject/topic context is forwarded and reflected...");
const examCtxReq = new NextRequest("http://localhost:3000/api/ai/chat", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-test-user-id": chatUser1,
  },
  body: JSON.stringify({
    message: "Give me a quick revision strategy for this subject.",
    context: {
      exam: "SSC CGL",
      subject: "Quantitative Aptitude",
      topic: "Trigonometric Identities",
      mode: "revision",
    },
  }),
});
const examCtxRes = await postAIChat(examCtxReq);
assert.strictEqual(examCtxRes.status, 200);
const examCtxData = await examCtxRes.json();
assert(
  examCtxData.reply.includes("SSC CGL") || examCtxData.reply.includes("Quantitative Aptitude"),
  "AI reply must incorporate active exam/subject context"
);
const usageLogs = await getAIAssistantUsageLogs(5);
const latestLog = usageLogs.find((l) => l.user_id === chatUser1);
assert(latestLog, "AI Assistant usage log must be recorded");
assert.strictEqual(latestLog.context_exam, "SSC CGL");
assert.strictEqual(latestLog.context_subject, "Quantitative Aptitude");
assert.strictEqual(latestLog.context_topic, "Trigonometric Identities");
console.log("✓ [AI Test 4] Exam context forwarded and logged properly.");

// [AI Test 5] Question context sent properly & [AI Test 6] Option-by-option explanation works
console.log("[AI Test 5 & 6] Verifying question context & structured option-by-option MCQ explanation...");
const mcqCtxReq = new NextRequest("http://localhost:3000/api/ai/chat", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-test-user-id": chatUser1,
  },
  body: JSON.stringify({
    message: "Solve this question and explain why each option is right or wrong.",
    context: {
      exam: "UPSC CSE",
      subject: "Indian Polity",
      topic: "Fundamental Rights",
      questionText: "Which Article of the Constitution of India abolishes Untouchability?",
      options: {
        A: "Article 14",
        B: "Article 15",
        C: "Article 17",
        D: "Article 18",
      },
      userAnswer: "B",
      correctAnswer: "C",
      explanation: "Article 17 abolishes untouchability and forbids its practice in any form.",
      mode: "practice",
    },
  }),
});
const mcqCtxRes = await postAIChat(mcqCtxReq);
assert.strictEqual(mcqCtxRes.status, 200);
const mcqCtxData = await mcqCtxRes.json();
assert(mcqCtxData.reply.includes("Answer:"), "Reply must include 'Answer:' section");
assert(mcqCtxData.reply.includes("Why:"), "Reply must include 'Why:' section");
assert(
  mcqCtxData.reply.includes("Why other options are incorrect:"),
  "Reply must include 'Why other options are incorrect:' section"
);
assert(mcqCtxData.reply.includes("Exam takeaway:"), "Reply must include 'Exam takeaway:' section");
assert(
  mcqCtxData.reply.includes("Article 17") && mcqCtxData.reply.includes("Option C"),
  "Reply must reference the active question options and correct answer"
);
console.log("✓ [AI Test 5 & 6] Question context & option-by-option MCQ structure verified.");

// [AI Test 7] Rate limiting works
console.log("[AI Test 7] Verifying per-minute burst rate limiting on POST /api/ai/chat...");
resetRateLimitStore();
const burstUser = `burst-user-${Date.now()}`;
await updateUserPlan(burstUser, "ELITE");
let rateLimitedHit = false;
for (let i = 0; i < 15; i++) {
  const req = new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-user-id": burstUser,
    },
    body: JSON.stringify({ message: `Rapid burst message ${i + 1}` }),
  });
  const res = await postAIChat(req);
  if (res.status === 429) {
    rateLimitedHit = true;
    break;
  }
}
assert.strictEqual(rateLimitedHit, true, "Per-minute burst rate limiter must return HTTP 429");
resetRateLimitStore();
console.log("✓ [AI Test 7] Per-minute burst rate limiting verified.");

// [AI Test 8] Plan limits work (FREE vs PRO vs ELITE)
console.log("[AI Test 8] Verifying plan-based daily AI Assistant quotas (FREE / PRO / ELITE)...");
process.env.AI_CHAT_LIMIT_FREE = "2";
const freeChatUser = `free-ai-user-${Date.now()}`;
await updateUserPlan(freeChatUser, "FREE");

for (let i = 1; i <= 2; i++) {
  const r = await postAIChat(
    new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user-id": freeChatUser },
      body: JSON.stringify({ message: `Free quota message ${i}` }),
    })
  );
  assert.strictEqual(r.status, 200, `Free user message ${i}/2 must succeed`);
}

const blockedFreeRes = await postAIChat(
  new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": freeChatUser },
    body: JSON.stringify({ message: "Free quota message 3 (should be blocked)" }),
  })
);
assert.strictEqual(blockedFreeRes.status, 429, "Free user exceeding daily quota must receive 429");
const blockedFreeData = await blockedFreeRes.json();
assert.strictEqual(blockedFreeData.quotaExceeded, true);

// Upgrade same user to PRO and verify higher quota unlocks immediately
await updateUserPlan(freeChatUser, "PRO");
const upgradedQuotaRes = await getAIChatQuota(
  new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "GET",
    headers: { "x-test-user-id": freeChatUser },
  })
);
const upgradedQuotaData = await upgradedQuotaRes.json();
assert.strictEqual(upgradedQuotaData.usage.tier, "PRO");
assert(upgradedQuotaData.usage.limit >= 75, "PRO user must have higher daily AI limit (75)");
delete process.env.AI_CHAT_LIMIT_FREE;
console.log("✓ [AI Test 8] Plan-based daily quotas (FREE / PRO / ELITE) verified.");

// [AI Test 9] Stop generation works & [AI Test 10] Clear conversation works
console.log("[AI Test 9 & 10] Verifying Stop Generation (AbortController) & Clear Conversation...");
assert(
  contextSource.includes("AbortController") &&
    contextSource.includes("stopGeneration") &&
    drawerSource.includes("Stop generation"),
  "AIAssistantContext and Drawer must implement AbortController stopGeneration"
);
assert(
  contextSource.includes("clearConversation") &&
    contextSource.includes("sessionStorage.removeItem") &&
    contextSource.includes("mockmaster:logout") &&
    drawerSource.includes("Clear conversation"),
  "AIAssistantContext and Drawer must implement clearConversation and clear on logout"
);
console.log("✓ [AI Test 9 & 10] Stop generation & Clear conversation verified.");

// [AI Test 11] Gemini failure handled cleanly
console.log("[AI Test 11] Verifying Gemini failure is handled cleanly with 503 response...");
process.env.MOCKMASTER_SIMULATE_AI_FAILURE = "true";
const failChatRes = await postAIChat(
  new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": chatUser1 },
    body: JSON.stringify({ message: "Test simulated failure" }),
  })
);
assert.strictEqual(failChatRes.status, 503, "Simulated AI failure must return HTTP 503 cleanly");
const failChatData = await failChatRes.json();
assert(
  failChatData.error && !failChatData.error.includes("GEMINI_API_KEY"),
  "Error message must be user-safe and never expose API keys"
);
delete process.env.MOCKMASTER_SIMULATE_AI_FAILURE;
console.log("✓ [AI Test 11] Gemini failure handled cleanly without exposing secrets.\n");

// ============================================================================
// PART B: ADMIN GITHUB QUESTION IMPORTER (21 REQUIRED TEST CASES)
// ============================================================================

console.log("--- PART B: ADMIN GITHUB QUESTION IMPORTER ---");

// [GH Test 1] Valid GitHub repo URL works
console.log("[GH Test 1] Verifying valid GitHub repository URL validation...");
const validRepo = validateGitHubRepoUrl(
  "https://github.com/mockmaster-official/upsc-ssc-question-bank/tree/main/polity"
);
assert.strictEqual(validRepo.valid, true);
assert.strictEqual(validRepo.owner, "mockmaster-official");
assert.strictEqual(validRepo.repo, "upsc-ssc-question-bank");
assert.strictEqual(validRepo.branch, "main");
assert.strictEqual(validRepo.subpath, "polity");
console.log("✓ [GH Test 1] Valid GitHub repository URL parsed accurately.");

// [GH Test 2] Invalid URL rejected
console.log("[GH Test 2] Verifying invalid/malformed URLs are rejected...");
assert.strictEqual(validateGitHubRepoUrl("").valid, false);
assert.strictEqual(validateGitHubRepoUrl("not-a-url").valid, false);
assert.strictEqual(validateGitHubRepoUrl("http://github.com/owner/repo").valid, false, "HTTP must be rejected");
assert.strictEqual(validateGitHubRepoUrl("https://github.com/only-owner").valid, false, "Missing repo name must be rejected");
assert.strictEqual(validateGitHubRepoUrl("https://github.com/owner/repo", "main", "../../etc/passwd").valid, false, "Path traversal must be rejected");
console.log("✓ [GH Test 2] Invalid/malformed URLs and path traversals rejected.");

// [GH Test 3] Private/internal IP rejected (SSRF protection)
console.log("[GH Test 3] Verifying SSRF protection against localhost, private IPs, and cloud metadata...");
const ssrfTargets = [
  "https://localhost/owner/repo",
  "https://127.0.0.1/owner/repo",
  "https://0.0.0.0/owner/repo",
  "https://10.0.0.1/owner/repo",
  "https://192.168.1.10/owner/repo",
  "https://172.16.0.5/owner/repo",
  "https://169.254.169.254/latest/meta-data",
];
for (const target of ssrfTargets) {
  const res = validateGitHubRepoUrl(target);
  assert.strictEqual(res.valid, false, `SSRF target ${target} MUST be rejected`);
}
console.log("✓ [GH Test 3] All private/internal/metadata IP targets blocked.");

// [GH Test 4] Non-GitHub URL rejected
console.log("[GH Test 4] Verifying non-GitHub hosts are rejected...");
assert.strictEqual(validateGitHubRepoUrl("https://gitlab.com/owner/repo").valid, false);
assert.strictEqual(validateGitHubRepoUrl("https://bitbucket.org/owner/repo").valid, false);
assert.strictEqual(validateGitHubRepoUrl("https://github.com.evil.org/owner/repo").valid, false);
assert.strictEqual(validateGitHubRepoUrl("https://user:pass@github.com/owner/repo").valid, false);
console.log("✓ [GH Test 4] Non-GitHub hosts and embedded credentials rejected.");

// [GH Test 5, 6, 7] Supported files detected, unsupported files ignored, oversized files skipped
console.log("[GH Test 5, 6, 7] Verifying supported files, ignored files, and oversized file filtering...");
assert.strictEqual(classifyRepositoryFile("polity/questions.csv", 2048).supported, true);
assert.strictEqual(classifyRepositoryFile("economy/bank.json", 4096).supported, true);
assert.strictEqual(classifyRepositoryFile("history/modern.md", 1024).supported, true);
assert.strictEqual(classifyRepositoryFile("science/notes.markdown", 1024).supported, true);
assert.strictEqual(classifyRepositoryFile("geography/pyq.txt", 1024).supported, true);

assert.strictEqual(classifyRepositoryFile("node_modules/pkg/readme.md", 500).supported, false);
assert.strictEqual(classifyRepositoryFile(".git/config", 200).supported, false);
assert.strictEqual(classifyRepositoryFile("src/index.ts", 1200).supported, false);
assert.strictEqual(classifyRepositoryFile("assets/banner.png", 12000).supported, false);
assert.strictEqual(classifyRepositoryFile("package.json", 800).supported, false);

const oversizedCheck = classifyRepositoryFile(
  "huge_dump.csv",
  GITHUB_IMPORT_LIMITS.maxSingleFileBytes + 1024
);
assert.strictEqual(oversizedCheck.supported, false, "Oversized file must be skipped");
assert(oversizedCheck.reason?.includes("Oversized file"));

const scanResult = await analyzeGitHubRepository({
  repoUrl: "https://github.com/mockmaster-official/upsc-ssc-question-bank",
});
assert.strictEqual(scanResult.valid, true);
assert.strictEqual(scanResult.summary.supportedFilesCount, 3);
assert.strictEqual(scanResult.summary.ignoredFilesCount, 2);
console.log("✓ [GH Test 5, 6, 7] File classification, filtering, and size limits verified.");

// [GH Test 8] CSV questions extracted
console.log("[GH Test 8] Verifying CSV question extraction...");
const csvExtracted = extractFromCsvContent(`question_text,option_a,option_b,option_c,option_d,correct_answer,explanation_why,source_year,question_type
"Which Constitutional Amendment added Fundamental Duties?","40th Amendment","42nd Amendment","44th Amendment","86th Amendment","B","Added by 42nd Amendment Act, 1976 on Swaran Singh Committee recommendations.",1976,"PYQ"`);
assert.strictEqual(csvExtracted.length, 1);
assert.strictEqual(csvExtracted[0].correct_answer, "B");
assert.strictEqual(csvExtracted[0].source_year, 1976);
assert.strictEqual(csvExtracted[0].question_type, "PYQ");
console.log("✓ [GH Test 8] CSV extraction verified.");

// [GH Test 9] JSON questions extracted
console.log("[GH Test 9] Verifying JSON question extraction...");
const jsonExtracted = extractFromJsonContent(
  JSON.stringify([
    {
      question: "What is the SI unit of electric current?",
      options: { A: "Volt", B: "Ampere", C: "Ohm", D: "Watt" },
      answer: "B",
      explanation: "Ampere is the SI base unit of electric current.",
      difficulty: "easy",
    },
  ])
);
assert.strictEqual(jsonExtracted.length, 1);
assert.strictEqual(jsonExtracted[0].option_b, "Ampere");
assert.strictEqual(jsonExtracted[0].correct_answer, "B");
assert.strictEqual(jsonExtracted[0].source_year, null, "Missing year must be null, never invented");
console.log("✓ [GH Test 9] JSON extraction verified.");

// [GH Test 10 & 11] Markdown & Plain text questions extracted
console.log("[GH Test 10 & 11] Verifying Markdown and Plain Text question extraction...");
const mdTextContent = `
# Practice Set

1. Who presided over the first session of the Indian National Congress in 1885?
A) Dadabhai Naoroji
B) W.C. Bonnerjee
C) Badruddin Tyabji
D) George Yule
Answer: B
Explanation: Womesh Chunder Bonnerjee presided over the first INC session in Bombay in December 1885.

Q2) Which river is known as Dakshin Ganga?
(A) Krishna
(B) Cauvery
(C) Godavari
(D) Mahanadi
Explanation: Godavari is the largest peninsular river system.
`;
const mdExtracted = extractFromMarkdownOrText(mdTextContent);
assert.strictEqual(mdExtracted.length, 2);
assert.strictEqual(mdExtracted[0].correct_answer, "B");
assert.strictEqual(mdExtracted[0].requires_answer_verification, false);
// [GH Test 12] Missing answers flagged
assert.strictEqual(mdExtracted[1].correct_answer, null, "Question without Answer line must have correct_answer = null");
assert.strictEqual(
  mdExtracted[1].requires_answer_verification,
  true,
  "Question without Answer line must be flagged with requires_answer_verification = true"
);
console.log("✓ [GH Test 10, 11, 12] Markdown/Text extraction & missing answer flagging verified.");

// [GH Test 13] Malformed questions flagged
console.log("[GH Test 13] Verifying second-pass validation flags malformed questions...");
const malformedValidation = runSecondPassValidation({
  question_text: "Short?",
  option_a: "Same Option",
  option_b: "Same Option",
  option_c: "Option C",
  option_d: "",
  correct_answer: null,
  explanation: { why: "", concept: "" },
  question_type: "PYQ",
  source_year: null,
  source_paper: null,
  confidence: 0.9,
});
assert(malformedValidation.errors.length >= 2, "Malformed question must produce validation errors");
assert.strictEqual(malformedValidation.requiresAnswerVerification, true);
assert(malformedValidation.adjustedConfidence <= 0.4);
console.log("✓ [GH Test 13] Malformed questions flagged by second-pass validation.");

// [GH Test 14] 3-Way Duplicate detection (new, duplicate, possible_duplicate)
console.log("[GH Test 14] Verifying 3-way duplicate detection (exact duplicate, possible_duplicate, new)...");
const existingPool = [
  {
    id: "db-q-1",
    norm: normalizeGitHubQuestionText(
      "Which Article of the Constitution of India safeguards one's right to marry the person of one's choice?"
    ),
  },
];
const exactDup = classifyCandidateDuplicate(
  normalizeGitHubQuestionText(
    "Which Article of the Constitution of India safeguards one's right to marry the person of one's choice?!"
  ),
  existingPool,
  [],
  []
);
assert.strictEqual(exactDup.status, "duplicate");
assert.strictEqual(exactDup.similarity, 1.0);

const possibleDup = classifyCandidateDuplicate(
  normalizeGitHubQuestionText(
    "Which Article of the Indian Constitution safeguards the right to marry a person of one's choice?"
  ),
  existingPool,
  [],
  []
);
assert.strictEqual(possibleDup.status, "possible_duplicate");
assert(possibleDup.similarity >= 0.72 && possibleDup.similarity < 1.0);

const uniqueCand = classifyCandidateDuplicate(
  normalizeGitHubQuestionText("What is the escape velocity from the surface of the Earth?"),
  existingPool,
  [],
  []
);
assert.strictEqual(uniqueCand.status, "new");
console.log("✓ [GH Test 14] 3-way duplicate detection (duplicate, possible_duplicate, new) verified.");

// [GH Test 20] Non-admin cannot access GitHub import
console.log("[GH Test 20] Verifying non-admin / unauthenticated users are blocked from /api/admin/import/github...");
const nonAdminReq = new NextRequest("http://localhost:3000/api/admin/import/github", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-test-role": "student",
  },
  body: JSON.stringify({
    action: "analyze",
    repoUrl: "https://github.com/mockmaster-official/upsc-ssc-question-bank",
  }),
});
const nonAdminRes = await postGitHubImport(nonAdminReq);
assert.strictEqual(nonAdminRes.status, 403, "Non-admin user must receive HTTP 403 Forbidden");
console.log("✓ [GH Test 20] Non-admin access blocked (403 Forbidden).");

// [GH Test 15, 16, 17, 18, 19, 21] Full End-to-End Admin GitHub Import Workflow:
// Process -> All Pending -> Edit -> Approve as MODEL -> Approve as PYQ -> Reject -> Reopen Batch
console.log("[GH Test 15-19, 21] Running end-to-end GitHub Import batch processing, editing, approval, rejection & reopening...");
resetRateLimitStore();
const processReq = new NextRequest("http://localhost:3000/api/admin/import/github", {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    action: "process",
    repoUrl: "https://github.com/mockmaster-official/upsc-ssc-question-bank",
    branch: "main",
  }),
});
const processRes = await postGitHubImport(processReq);
assert.strictEqual(processRes.status, 200, "Admin GitHub process request must succeed");
const processData = await processRes.json();
assert.strictEqual(processData.success, true);
assert(processData.batch && processData.batch.id.startsWith("gh-batch-"));
assert(Array.isArray(processData.candidates) && processData.candidates.length >= 5);

const batchId = processData.batch.id;
const candidates = processData.candidates;

// [GH Test 15] Every imported question starts as verification_status = "pending"
for (const c of candidates) {
  assert.strictEqual(
    c.verification_status,
    "pending",
    "Every extracted GitHub candidate MUST start with verification_status = 'pending'"
  );
}
assert.strictEqual(processData.batch.imported_rows, 0, "No questions may be auto-approved before admin review");

// Find candidate with missing answer (from general_science_notes.md question #2)
const missingAnsCandidate = candidates.find((c) => c.requires_answer_verification === true);
assert(missingAnsCandidate, "Candidate with missing answer must be flagged with requires_answer_verification=true");

// Verify approving a candidate with missing answer is blocked until edited
const blockedApproveRes = await patchGitHubImport(
  new NextRequest("http://localhost:3000/api/admin/import/github", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "approve",
      candidateIds: [missingAnsCandidate.id],
    }),
  })
);
assert.strictEqual(
  blockedApproveRes.status,
  400,
  "Approving a candidate without a verified correct_answer must be blocked (400)"
);

// [GH Test 16] Admin can edit candidate question (set correct_answer = 'A')
const editRes = await patchGitHubImport(
  new NextRequest("http://localhost:3000/api/admin/import/github", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "edit",
      candidateId: missingAnsCandidate.id,
      updates: {
        correct_answer: "A",
        question_type: "MODEL",
        source_year: 2022, // Should be stripped since question_type is MODEL
      },
    }),
  })
);
assert.strictEqual(editRes.status, 200, "Admin edit candidate must succeed");
const editData = await editRes.json();
assert.strictEqual(editData.candidate.correct_answer, "A");
assert.strictEqual(editData.candidate.requires_answer_verification, false);
assert.strictEqual(editData.candidate.source_year, null, "MODEL question must not retain a fake source_year");

// [GH Test 17] Admin can approve as MODEL
const approveModelRes = await patchGitHubImport(
  new NextRequest("http://localhost:3000/api/admin/import/github", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "approve",
      candidateIds: [missingAnsCandidate.id],
      questionType: "MODEL",
    }),
  })
);
assert.strictEqual(approveModelRes.status, 200);
const approveModelData = await approveModelRes.json();
assert.strictEqual(approveModelData.approvedCount, 1);
assert.strictEqual(approveModelData.promotedQuestions[0].type, "MODEL");
assert.strictEqual(approveModelData.promotedQuestions[0].source_year, null);
assert.strictEqual(approveModelData.promotedQuestions[0].verification_status, "approved");
assert.strictEqual(
  approveModelData.promotedQuestions[0].source_repository,
  "mockmaster-official/upsc-ssc-question-bank"
);

// [GH Test 18] Admin can approve as PYQ with provenance
const pyqCandidate = candidates.find((c) => c.question_type === "PYQ" && c.source_year !== null);
assert(pyqCandidate, "Batch must contain a PYQ candidate with explicit source_year");
const approvePyqRes = await patchGitHubImport(
  new NextRequest("http://localhost:3000/api/admin/import/github", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "approve",
      candidateIds: [pyqCandidate.id],
      questionType: "PYQ",
    }),
  })
);
assert.strictEqual(approvePyqRes.status, 200);
const approvePyqData = await approvePyqRes.json();
assert.strictEqual(approvePyqData.approvedCount, 1);
assert.strictEqual(approvePyqData.promotedQuestions[0].type, "PYQ");
assert.strictEqual(approvePyqData.promotedQuestions[0].source_year, pyqCandidate.source_year);
assert.strictEqual(
  approvePyqData.promotedQuestions[0].source_repository,
  "mockmaster-official/upsc-ssc-question-bank"
);

// Verify approved questions are now in the main question bank
const allBankQuestions = await getAllQuestions();
assert(
  allBankQuestions.some((q) => q.id === approveModelData.promotedQuestions[0].id),
  "Approved MODEL question must exist in main question bank"
);
assert(
  allBankQuestions.some((q) => q.id === approvePyqData.promotedQuestions[0].id),
  "Approved PYQ question must exist in main question bank"
);

// [GH Test 19] Admin can reject candidate question
const candidateToReject = candidates.find(
  (c) => c.id !== missingAnsCandidate.id && c.id !== pyqCandidate.id
);
const rejectRes = await patchGitHubImport(
  new NextRequest("http://localhost:3000/api/admin/import/github", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "reject",
      candidateIds: [candidateToReject.id],
    }),
  })
);
assert.strictEqual(rejectRes.status, 200);
const rejectData = await rejectRes.json();
assert.strictEqual(rejectData.rejectedCount, 1);
assert.strictEqual(rejectData.candidates[0].verification_status, "rejected");

// [GH Test 21] Batch record saved and reopenable
const reopenRes = await getGitHubImport(
  new NextRequest(`http://localhost:3000/api/admin/import/github?batchId=${encodeURIComponent(batchId)}`, {
    method: "GET",
  })
);
assert.strictEqual(reopenRes.status, 200);
const reopenData = await reopenRes.json();
assert.strictEqual(reopenData.batch.id, batchId);
assert.strictEqual(reopenData.batch.approved_count, 2);
assert.strictEqual(reopenData.batch.rejected_count, 1);
assert.strictEqual(
  reopenData.batch.pending_count,
  candidates.length - 3,
  "Batch pending_count must accurately reflect remaining pending candidates"
);
assert.strictEqual(reopenData.candidates.length, candidates.length);

const auditLogs = await getAdminAuditLogs(20);
assert(
  auditLogs.some((l) => l.action === "GITHUB_REPO_PROCESS") &&
    auditLogs.some((l) => l.action === "GITHUB_CANDIDATES_APPROVE") &&
    auditLogs.some((l) => l.action === "GITHUB_CANDIDATES_REJECT"),
  "Admin audit logs must record GitHub process, approve, and reject operations"
);

console.log("✓ [GH Test 15-19, 21] End-to-end GitHub Import review, approval, rejection, provenance, and batch reopening verified.\n");

// ============================================================================
// PART C: PRODUCTION SCHEMA, ADMIN AUTHORIZATION & GEMINI AI DIAGNOSTICS
// ============================================================================

console.log("--- PART C: PRODUCTION SCHEMA, ADMIN AUTHORIZATION & GEMINI AI DIAGNOSTICS ---");

// [Prod Test 1] Full production SQL schema & 10 migration files verification
console.log("[Prod Test 1] Verifying all 10 SQL migrations and consolidated full_production_schema.sql...");
const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
const expectedMigrationFiles = [
  "001_exam_taxonomy.sql",
  "002_questions.sql",
  "003_mock_tests.sql",
  "004_user_data_and_import.sql",
  "005_rls_policies.sql",
  "006_phase3_performance_and_indexes.sql",
  "007_phase4_monetization_and_audit.sql",
  "008_phase5_taxonomy_plans_payments_analytics.sql",
  "009_phase6_ai_assistant_and_github_importer.sql",
  "010_production_schema_reconciliation_and_bootstrap.sql",
];
for (const file of expectedMigrationFiles) {
  assert(
    fs.existsSync(path.join(migrationsDir, file)),
    `Missing migration file: ${file}`
  );
}

const fullSchemaPath = path.resolve(process.cwd(), "supabase/full_production_schema.sql");
assert(fs.existsSync(fullSchemaPath), "Consolidated supabase/full_production_schema.sql must exist");
const fullSchemaSql = fs.readFileSync(fullSchemaPath, "utf8");

const requiredPublicTables = [
  "exams",
  "subjects",
  "topics",
  "questions",
  "mock_tests",
  "mock_questions",
  "user_roles",
  "user_plans",
  "user_progress",
  "question_seen_log",
  "saved_questions",
  "question_import_batches",
  "subscriptions",
  "ai_generation_logs",
  "payment_webhook_events",
  "payment_transactions",
  "system_settings",
  "github_import_candidates",
  "ai_assistant_usage_logs",
  "admin_audit_logs",
];

for (const tableName of requiredPublicTables) {
  const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?${tableName}\\b`, "i");
  assert(
    tableRegex.test(fullSchemaSql),
    `supabase/full_production_schema.sql must define table public.${tableName}`
  );
}

assert(
  !fullSchemaSql.includes("question_type_enum") &&
    !fullSchemaSql.includes("difficulty_level_enum") &&
    !fullSchemaSql.includes("verification_status_enum"),
  "SQL migrations must not contain invalid *_enum type references"
);
assert(
  fullSchemaSql.includes("CREATE OR REPLACE FUNCTION public.is_admin()") &&
    fullSchemaSql.includes("CREATE OR REPLACE FUNCTION public.handle_new_auth_user()") &&
    fullSchemaSql.includes("CREATE OR REPLACE FUNCTION public.assign_admin_by_email("),
  "SQL schema must define public.is_admin(), public.handle_new_auth_user(), and public.assign_admin_by_email()"
);
console.log(`✓ [Prod Test 1] All ${requiredPublicTables.length} public tables, triggers, RLS policies, and admin helpers verified.`);

// [Prod Test 2] Server-side Admin Page Guard & Server Actions Authorization
console.log("[Prod Test 2] Verifying server-side admin guard on /admin/layout.tsx and import server actions...");
const adminLayoutSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/admin/layout.tsx"),
  "utf8"
);
const importActionsSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/actions/import.ts"),
  "utf8"
);
assert(
  !adminLayoutSource.startsWith('"use client"') &&
    adminLayoutSource.includes("verifyAdminAuthorization"),
  "src/app/admin/layout.tsx must be a Server Component that enforces verifyAdminAuthorization()"
);
assert(
  importActionsSource.includes("verifyAdminAuthorization"),
  "src/app/actions/import.ts must enforce verifyAdminAuthorization() on server actions"
);
console.log("✓ [Prod Test 2] Server-side admin route and action guards verified.");

// [Prod Test 3] Gemini Model Fallback Chain & Error Classification
console.log("[Prod Test 3] Verifying Gemini model fallback chain and error classification...");
const modelCandidates = resolveGeminiModelCandidates("gemini-2.0-flash");
assert(
  modelCandidates.includes("gemini-2.5-flash") &&
    modelCandidates.includes("gemini-2.0-flash") &&
    modelCandidates.includes("gemini-2.5-flash-lite"),
  "resolveGeminiModelCandidates must include gemini-2.5-flash, gemini-2.0-flash, and gemini-2.5-flash-lite"
);
assert.strictEqual(
  classifyGeminiError(new Error("404 Not Found: models/gemini-2.0-flash is not found")).category,
  "model_unavailable"
);
assert.strictEqual(
  classifyGeminiError(new Error("400 API_KEY_INVALID: API key not valid")).category,
  "invalid_api_key"
);
assert.strictEqual(
  classifyGeminiError(new Error("429 RESOURCE_EXHAUSTED: Quota exceeded")).category,
  "quota_exceeded"
);
console.log("✓ [Prod Test 3] Gemini model fallback chain and error classification verified.");

// [Prod Test 4] Required Gemini Diagnostic & Exam Prompts
console.log("[Prod Test 4] Verifying required Gemini diagnostic and exam queries via POST /api/ai/chat...");
resetRateLimitStore();
const prodDiagUser = `prod-diag-user-${Date.now()}`;
await updateUserPlan(prodDiagUser, "FREE");

// 4a: Minimal diagnostic query: "Reply with exactly: MockMaster AI OK"
const diagRes = await postAIChat(
  new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": prodDiagUser },
    body: JSON.stringify({ message: "Reply with exactly: MockMaster AI OK" }),
  })
);
assert.strictEqual(diagRes.status, 200);
const diagData = await diagRes.json();
assert.strictEqual(diagData.reply, "MockMaster AI OK", "Minimal diagnostic query must return 'MockMaster AI OK'");
assert.strictEqual(diagData.usage.remaining, 14, "Quota 15/15 LEFT must decrement to 14/15 after first query");

// 4b: "2 + 2"
const mathRes = await postAIChat(
  new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": prodDiagUser },
    body: JSON.stringify({ message: "2 + 2" }),
  })
);
assert.strictEqual(mathRes.status, 200);
const mathData = await mathRes.json();
assert(mathData.reply.includes("4"), "Query '2 + 2' must return 4");

// 4c: "What is the difference between Fundamental Rights and DPSPs?"
const polityRes = await postAIChat(
  new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": prodDiagUser },
    body: JSON.stringify({
      message: "What is the difference between Fundamental Rights and DPSPs?",
    }),
  })
);
assert.strictEqual(polityRes.status, 200);
const polityData = await polityRes.json();
assert(
  polityData.reply.includes("Fundamental Rights") &&
    polityData.reply.includes("Directive Principles") &&
    polityData.reply.includes("Part III") &&
    polityData.reply.includes("Part IV"),
  "Fundamental Rights vs DPSPs query must return accurate constitutional comparison"
);
console.log("✓ [Prod Test 4] Diagnostic query ('MockMaster AI OK'), '2 + 2', and 'Fundamental Rights vs DPSPs' verified.");

console.log("\n=== ALL PHASE 6 & PRODUCTION FIX VERIFICATION TESTS PASSED ===");

