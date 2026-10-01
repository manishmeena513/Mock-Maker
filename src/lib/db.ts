import { SEED_EXAMS, SEED_QUESTIONS } from "./data/seedData";
import {
  ALL_CATALOG_EXAMS,
  ALL_CATALOG_SUBJECTS,
  ALL_CATALOG_TOPICS,
} from "./data/examTaxonomy";
import {
  Exam,
  Subject,
  Topic,
  Question,
  MockTest,
  MockQuestion,
  UserProgress,
  QuestionImportBatch,
  MistakeCategory,
  PaginationMetadata,
  Subscription,
  SubscriptionStatus,
  UserPlanType,
  AIGenerationLog,
  PaymentWebhookEvent,
  PaymentProvider,
  PaymentTransaction,
  UserAnalyticsSummary,
  GitHubImportCandidate,
  AIAssistantUsageLog,
  AdminAuditLog,
} from "@/types/database";
import { createClient } from "./supabase/server";
import { assertProductionDatabaseConfigured, isProductionRuntime } from "@/lib/config/env";

interface GlobalMockMasterStore {
  inMemoryExams: Exam[];
  inMemorySubjects: Subject[];
  inMemoryTopics: Topic[];
  inMemoryMockTests: Map<string, MockTest>;
  inMemoryMockQuestions: Map<string, MockQuestion[]>;
  inMemoryUserSeenQuestions: Map<string, Set<string>>;
  inMemorySavedQuestions: Map<string, Set<string>>;
  inMemoryUserProgress: Map<string, Map<string, UserProgress>>;
  dynamicQuestionsBank: Question[];
  inMemoryImportBatches: Map<string, QuestionImportBatch>;
  inMemorySavedQuestionRecords: Map<
    string,
    { id: string; user_id: string; question_id: string; category: "important" | "difficult" | "revise_later"; saved_at: string }
  >;
  inMemorySubscriptions: Map<string, Subscription>;
  inMemoryUserPlans: Map<string, { plan: UserPlanType; validUntil: string | null }>;
  inMemoryPaymentTransactions: Map<string, PaymentTransaction>;
  inMemorySystemSettings: Map<string, unknown>;
  inMemoryAILogs: AIGenerationLog[];
  inMemoryWebhookEvents: Set<string>;
  inMemoryAIAssistantLogs: AIAssistantUsageLog[];
  inMemoryGitHubCandidates: Map<string, GitHubImportCandidate>;
  inMemoryAdminAuditLogs: AdminAuditLog[];
}

const g = globalThis as unknown as { __mockmaster_store?: GlobalMockMasterStore };

if (!g.__mockmaster_store) {
  g.__mockmaster_store = {
    inMemoryExams: [...ALL_CATALOG_EXAMS],
    inMemorySubjects: [...ALL_CATALOG_SUBJECTS],
    inMemoryTopics: [...ALL_CATALOG_TOPICS],
    inMemoryMockTests: new Map(),
    inMemoryMockQuestions: new Map(),
    inMemoryUserSeenQuestions: new Map(),
    inMemorySavedQuestions: new Map(),
    inMemoryUserProgress: new Map(),
    dynamicQuestionsBank: [...SEED_QUESTIONS],
    inMemoryImportBatches: new Map(),
    inMemorySavedQuestionRecords: new Map(),
    inMemorySubscriptions: new Map(),
    inMemoryUserPlans: new Map(),
    inMemoryPaymentTransactions: new Map(),
    inMemorySystemSettings: new Map<string, unknown>([
      ["default_pyq_ratio", 80],
      ["ai_auto_approve", false],
      ["maintenance_mode", false],
    ]),
    inMemoryAILogs: [],
    inMemoryWebhookEvents: new Set(),
    inMemoryAIAssistantLogs: [],
    inMemoryGitHubCandidates: new Map(),
    inMemoryAdminAuditLogs: [],
  };
}

let inMemoryExams = g.__mockmaster_store.inMemoryExams || [...ALL_CATALOG_EXAMS];
let inMemorySubjects = g.__mockmaster_store.inMemorySubjects || [...ALL_CATALOG_SUBJECTS];
let inMemoryTopics = g.__mockmaster_store.inMemoryTopics || [...ALL_CATALOG_TOPICS];
const inMemoryMockTests = g.__mockmaster_store.inMemoryMockTests;
const inMemoryMockQuestions = g.__mockmaster_store.inMemoryMockQuestions;
const inMemoryUserSeenQuestions = g.__mockmaster_store.inMemoryUserSeenQuestions;
const inMemorySavedQuestions = g.__mockmaster_store.inMemorySavedQuestions;
const inMemoryUserProgress = g.__mockmaster_store.inMemoryUserProgress;
let dynamicQuestionsBank = g.__mockmaster_store.dynamicQuestionsBank;
const inMemoryImportBatches = g.__mockmaster_store.inMemoryImportBatches;
const inMemorySavedQuestionRecords = g.__mockmaster_store.inMemorySavedQuestionRecords;
const inMemorySubscriptions = g.__mockmaster_store.inMemorySubscriptions;
const inMemoryUserPlans = g.__mockmaster_store.inMemoryUserPlans;
const inMemoryPaymentTransactions =
  g.__mockmaster_store.inMemoryPaymentTransactions || new Map<string, PaymentTransaction>();
const inMemorySystemSettings =
  g.__mockmaster_store.inMemorySystemSettings || new Map<string, unknown>();
const inMemoryAILogs = g.__mockmaster_store.inMemoryAILogs;
const inMemoryWebhookEvents = g.__mockmaster_store.inMemoryWebhookEvents;
if (!g.__mockmaster_store.inMemoryAIAssistantLogs) {
  g.__mockmaster_store.inMemoryAIAssistantLogs = [];
}
if (!g.__mockmaster_store.inMemoryGitHubCandidates) {
  g.__mockmaster_store.inMemoryGitHubCandidates = new Map();
}
if (!g.__mockmaster_store.inMemoryAdminAuditLogs) {
  g.__mockmaster_store.inMemoryAdminAuditLogs = [];
}
const inMemoryAIAssistantLogs = g.__mockmaster_store.inMemoryAIAssistantLogs;
const inMemoryGitHubCandidates = g.__mockmaster_store.inMemoryGitHubCandidates;
const inMemoryAdminAuditLogs = g.__mockmaster_store.inMemoryAdminAuditLogs;

function checkProductionDatabaseGuard() {
  if (isProductionRuntime() && !isSupabaseConfigured()) {
    assertProductionDatabaseConfigured();
  }
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    url !== "https://mockmaster.supabase.co" &&
    !key.includes("placeholder") &&
    !key.includes("mock-")
  );
}

export async function getExams(): Promise<Exam[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (!error && data && data.length > 0) {
        // Merge DB exams with catalog exams so all 22 supported exams are available
        const dbSlugs = new Set((data as Exam[]).map((e) => e.slug));
        const merged = [
          ...(data as Exam[]),
          ...inMemoryExams.filter((e) => e.is_active && !dbSlugs.has(e.slug)),
        ];
        return merged;
      }
    } catch (err) {
      console.warn("Falling back to catalog exams:", err);
    }
  }
  checkProductionDatabaseGuard();
  return inMemoryExams.filter((e) => e.is_active);
}

export async function getAllExamsForAdmin(): Promise<Exam[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("exams").select("*").order("name");
      if (!error && data && data.length > 0) {
        const dbSlugs = new Set((data as Exam[]).map((e) => e.slug));
        return [
          ...(data as Exam[]),
          ...inMemoryExams.filter((e) => !dbSlugs.has(e.slug)),
        ];
      }
    } catch {
      // fallback
    }
  }
  return [...inMemoryExams];
}

export async function getExamBySlug(slug: string): Promise<Exam | null> {
  const exams = await getExams();
  return exams.find((e) => e.slug === slug) || null;
}

export async function getExamById(examId: string): Promise<Exam | null> {
  const exams = await getAllExamsForAdmin();
  return exams.find((e) => e.id === examId) || null;
}

export async function getSubjectsByExamId(examId: string): Promise<Subject[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("exam_id", examId)
        .order("order_index");
      if (!error && data && data.length > 0) {
        return (data as Subject[]).filter((s) => s.is_active !== false);
      }
    } catch (err) {
      console.warn("Falling back to catalog subjects:", err);
    }
  }
  return inMemorySubjects
    .filter((s) => s.exam_id === examId && s.is_active !== false)
    .sort((a, b) => a.order_index - b.order_index);
}

export async function getAllSubjects(includeInactive = false): Promise<Subject[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("subjects").select("*").order("order_index");
      if (!error && data && data.length > 0) {
        const dbIds = new Set((data as Subject[]).map((s) => s.id));
        const merged = [
          ...(data as Subject[]),
          ...inMemorySubjects.filter((s) => !dbIds.has(s.id)),
        ];
        return includeInactive ? merged : merged.filter((s) => s.is_active !== false);
      }
    } catch {
      // fallback
    }
  }
  return includeInactive
    ? [...inMemorySubjects]
    : inMemorySubjects.filter((s) => s.is_active !== false);
}

export async function getTopicsBySubjectId(subjectId: string): Promise<Topic[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("subject_id", subjectId)
        .order("order_index");
      if (!error && data && data.length > 0) {
        return (data as Topic[]).filter((t) => t.is_active !== false);
      }
    } catch (err) {
      console.warn("Falling back to catalog topics:", err);
    }
  }
  return inMemoryTopics
    .filter((t) => t.subject_id === subjectId && t.is_active !== false)
    .sort((a, b) => a.order_index - b.order_index);
}

export async function getAllTopics(includeInactive = false): Promise<Topic[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("topics").select("*").order("order_index");
      if (!error && data && data.length > 0) {
        const dbIds = new Set((data as Topic[]).map((t) => t.id));
        const merged = [
          ...(data as Topic[]),
          ...inMemoryTopics.filter((t) => !dbIds.has(t.id)),
        ];
        return includeInactive ? merged : merged.filter((t) => t.is_active !== false);
      }
    } catch {
      // fallback
    }
  }
  return includeInactive
    ? [...inMemoryTopics]
    : inMemoryTopics.filter((t) => t.is_active !== false);
}

// Admin Taxonomy CRUD
export async function createOrUpdateExam(
  input: Partial<Exam> & { name: string; slug: string }
): Promise<Exam> {
  const id = input.id || `exam-${input.slug}`;
  const existingIdx = inMemoryExams.findIndex((e) => e.id === id || e.slug === input.slug);
  const record: Exam = {
    id,
    name: input.name,
    slug: input.slug,
    category: input.category || "SSC",
    conducting_body: input.conducting_body || "Official Commission",
    description: input.description || `${input.name} competitive examination preparation.`,
    icon_url: input.icon_url || "Award",
    marking_scheme: input.marking_scheme || { correct: 2.0, wrong: -0.5, unattempted: 0 },
    time_limit_minutes: input.time_limit_minutes || input.default_time_minutes || 60,
    default_time_minutes: input.default_time_minutes || input.time_limit_minutes || 60,
    default_questions: input.default_questions || 100,
    is_active: input.is_active ?? true,
    created_at: existingIdx !== -1 ? inMemoryExams[existingIdx].created_at : new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    inMemoryExams[existingIdx] = record;
  } else {
    inMemoryExams.push(record);
  }
  g.__mockmaster_store!.inMemoryExams = inMemoryExams;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("exams").upsert(record);
    } catch {
      // fallback
    }
  }
  return record;
}

export async function toggleExamActive(examId: string, isActive: boolean): Promise<boolean> {
  const exam = inMemoryExams.find((e) => e.id === examId);
  if (exam) {
    exam.is_active = isActive;
  }
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("exams").update({ is_active: isActive }).eq("id", examId);
    } catch {
      // fallback
    }
  }
  return Boolean(exam);
}

export async function createOrUpdateSubject(
  input: Partial<Subject> & { exam_id: string; name: string; slug: string }
): Promise<Subject> {
  const id = input.id || `sub-${input.exam_id}-${input.slug}`;
  const existingIdx = inMemorySubjects.findIndex((s) => s.id === id);
  const examSubjectsCount = inMemorySubjects.filter((s) => s.exam_id === input.exam_id).length;
  const record: Subject = {
    id,
    exam_id: input.exam_id,
    name: input.name,
    slug: input.slug,
    paper_name: input.paper_name || "Paper I",
    order_index: input.order_index ?? examSubjectsCount + 1,
    is_active: input.is_active ?? true,
    created_at:
      existingIdx !== -1 ? inMemorySubjects[existingIdx].created_at : new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    inMemorySubjects[existingIdx] = record;
  } else {
    inMemorySubjects.push(record);
  }
  g.__mockmaster_store!.inMemorySubjects = inMemorySubjects;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("subjects").upsert(record);
    } catch {
      // fallback
    }
  }
  return record;
}

export async function createOrUpdateTopic(
  input: Partial<Topic> & { subject_id: string; name: string; slug: string }
): Promise<Topic> {
  const id = input.id || `top-${input.subject_id}-${input.slug}`;
  const existingIdx = inMemoryTopics.findIndex((t) => t.id === id);
  const subTopicsCount = inMemoryTopics.filter((t) => t.subject_id === input.subject_id).length;
  const record: Topic = {
    id,
    subject_id: input.subject_id,
    name: input.name,
    slug: input.slug,
    order_index: input.order_index ?? subTopicsCount + 1,
    is_active: input.is_active ?? true,
    created_at:
      existingIdx !== -1 ? inMemoryTopics[existingIdx].created_at : new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    inMemoryTopics[existingIdx] = record;
  } else {
    inMemoryTopics.push(record);
  }
  g.__mockmaster_store!.inMemoryTopics = inMemoryTopics;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("topics").upsert(record);
    } catch {
      // fallback
    }
  }
  return record;
}

export async function reorderTopics(subjectId: string, orderedTopicIds: string[]): Promise<boolean> {
  orderedTopicIds.forEach((topicId, idx) => {
    const t = inMemoryTopics.find((item) => item.id === topicId && item.subject_id === subjectId);
    if (t) {
      t.order_index = idx + 1;
    }
  });
  return true;
}

export async function getQuestionsPool({
  examId,
  subjectIds,
  topicIds,
  type,
  userId,
}: {
  examId: string;
  subjectIds?: string[];
  topicIds?: string[];
  type?: "PYQ" | "MODEL";
  userId?: string;
}): Promise<Question[]> {
  let pool: Question[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examId)
        .eq("verification_status", "approved");

      if (type) {
        query = query.eq("type", type);
      }
      if (subjectIds && subjectIds.length > 0) {
        query = query.in("subject_id", subjectIds);
      }
      if (topicIds && topicIds.length > 0) {
        query = query.in("topic_id", topicIds);
      }

      const { data, error } = await query;
      if (!error && data) {
        pool = data as Question[];
      }
    } catch (err) {
      console.warn("Falling back to dynamic questions pool:", err);
    }
  }

  if (pool.length === 0) {
    pool = dynamicQuestionsBank.filter((q) => {
      if (q.exam_id !== examId) return false;
      if (q.verification_status !== "approved") return false;
      if (type && q.type !== type) return false;
      if (subjectIds && subjectIds.length > 0 && !subjectIds.includes(q.subject_id)) return false;
      if (topicIds && topicIds.length > 0 && !topicIds.includes(q.topic_id)) return false;
      return true;
    });
  }

  // Anti-duplicate prioritization: prioritize unseen questions
  const seenSet = userId ? inMemoryUserSeenQuestions.get(userId) || new Set() : new Set();

  return pool.sort((a, b) => {
    const aSeen = seenSet.has(a.id) ? 1 : 0;
    const bSeen = seenSet.has(b.id) ? 1 : 0;
    if (aSeen !== bSeen) return aSeen - bSeen;
    return a.times_shown - b.times_shown;
  });
}

export async function createMockRecord(
  test: MockTest,
  questions: Question[],
  userId?: string
): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error: testErr } = await supabase.from("mock_tests").insert({
        id: test.id,
        user_id: test.user_id,
        exam_id: test.exam_id,
        subject_ids: test.subject_ids,
        topic_ids: test.topic_ids,
        mode: test.mode,
        total_questions: test.total_questions,
        pyq_count: test.pyq_count,
        model_count: test.model_count,
        time_limit_minutes: test.time_limit_minutes,
        marking_scheme: test.marking_scheme,
        status: test.status,
        started_at: test.started_at,
        ratio_warning: test.ratio_warning,
      });

      if (!testErr) {
        const mockQuestionsPayload = questions.map((q, idx) => ({
          mock_test_id: test.id,
          question_id: q.id,
          order_index: idx + 1,
        }));
        await supabase.from("mock_questions").insert(mockQuestionsPayload);
      }
    } catch (err) {
      console.warn("Error inserting mock test to Supabase:", err);
    }
  }

  checkProductionDatabaseGuard();

  // Save to in-memory fallback
  inMemoryMockTests.set(test.id, test);
  const mockQuestionsList: MockQuestion[] = questions.map((q, idx) => ({
    id: `mq-${test.id}-${idx + 1}`,
    mock_test_id: test.id,
    question_id: q.id,
    order_index: idx + 1,
    user_answer: null,
    is_correct: null,
    is_marked_for_review: false,
    time_spent_seconds: 0,
    question: q,
  }));
  inMemoryMockQuestions.set(test.id, mockQuestionsList);

  // Mark questions as seen for anti-duplicate tracking
  if (userId) {
    if (!inMemoryUserSeenQuestions.has(userId)) {
      inMemoryUserSeenQuestions.set(userId, new Set());
    }
    const userSeen = inMemoryUserSeenQuestions.get(userId)!;
    questions.forEach((q) => userSeen.add(q.id));
  }

  return test.id;
}

export async function getMockTestById(
  mockId: string
): Promise<{ test: MockTest; questions: MockQuestion[] } | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: testData, error: testErr } = await supabase
        .from("mock_tests")
        .select("*")
        .eq("id", mockId)
        .single();

      if (!testErr && testData) {
        const { data: qData, error: qErr } = await supabase
          .from("mock_questions")
          .select("*, question:questions(*)")
          .eq("mock_test_id", mockId)
          .order("order_index");

        if (!qErr && qData) {
          return {
            test: testData as MockTest,
            questions: qData as MockQuestion[],
          };
        }
      }
    } catch (err) {
      console.warn("Error loading mock test from Supabase:", err);
    }
  }

  const test = inMemoryMockTests.get(mockId);
  const questions = inMemoryMockQuestions.get(mockId);
  if (!test || !questions) return null;

  return { test, questions };
}

export async function updateMockQuestionAnswer(
  mockId: string,
  orderIndex: number,
  userAnswer: "A" | "B" | "C" | "D",
  isCorrect: boolean,
  timeSpentSeconds: number
) {
  const questions = inMemoryMockQuestions.get(mockId);
  if (questions) {
    const q = questions.find((item) => item.order_index === orderIndex);
    if (q) {
      q.user_answer = userAnswer;
      q.is_correct = isCorrect;
      q.time_spent_seconds = timeSpentSeconds;
      q.answered_at = new Date().toISOString();
    }
  }
}

export async function toggleMarkForReview(mockId: string, orderIndex: number) {
  const questions = inMemoryMockQuestions.get(mockId);
  if (questions) {
    const q = questions.find((item) => item.order_index === orderIndex);
    if (q) {
      q.is_marked_for_review = !q.is_marked_for_review;
      return q.is_marked_for_review;
    }
  }
  return false;
}

export async function updateMockQuestionMistake(
  mockId: string,
  orderIndex: number,
  mistakeCategory: MistakeCategory
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("mock_questions")
        .update({ mistake_category: mistakeCategory })
        .eq("mock_test_id", mockId)
        .eq("order_index", orderIndex);
    } catch (err) {
      console.warn("Error updating mistake category in Supabase:", err);
    }
  }

  const questions = inMemoryMockQuestions.get(mockId);
  if (questions) {
    const q = questions.find((item) => item.order_index === orderIndex);
    if (q) {
      q.mistake_category = mistakeCategory;
      return true;
    }
  }
  return false;
}

export async function finalizeMockTest(
  mockId: string,
  summary: {
    rawScore: number;
    accuracy: number;
    totalCorrect: number;
    totalWrong: number;
    totalUnattempted: number;
  }
) {
  const test = inMemoryMockTests.get(mockId);
  if (test) {
    // Idempotent guard: if already completed, do not corrupt timestamps or results
    if (test.status === "completed") {
      return;
    }

    test.status = "completed";
    test.completed_at = new Date().toISOString();
    test.raw_score = summary.rawScore;
    test.accuracy = summary.accuracy;
    test.total_correct = summary.totalCorrect;
    test.total_wrong = summary.totalWrong;
    test.total_unattempted = summary.totalUnattempted;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("mock_tests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          raw_score: summary.rawScore,
          accuracy: summary.accuracy,
          total_correct: summary.totalCorrect,
          total_wrong: summary.totalWrong,
          total_unattempted: summary.totalUnattempted,
        })
        .eq("id", mockId)
        .eq("status", "in_progress"); // Idempotent check in DB
    } catch (err) {
      console.warn("Error finalizing mock test in Supabase:", err);
    }
  }
}

// Phase 2: Question Bank Explorer & Admin Filters
export async function getAllQuestions(filters?: {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  type?: "PYQ" | "MODEL";
  status?: "pending" | "approved" | "rejected";
  batchId?: string;
  filename?: string;
  search?: string;
}): Promise<Question[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: dbQuestions, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error && dbQuestions && dbQuestions.length > 0) {
        const existingIds = new Set(dynamicQuestionsBank.map((q) => q.id));
        for (const dbQ of dbQuestions as Question[]) {
          if (!existingIds.has(dbQ.id)) {
            dynamicQuestionsBank.unshift(dbQ);
            existingIds.add(dbQ.id);
          }
        }
      }
    } catch {
      // fallback to inMemory bank
    }
  }

  let list = [...dynamicQuestionsBank];

  if (filters?.examId) {
    list = list.filter((q) => q.exam_id === filters.examId);
  }
  if (filters?.subjectId) {
    list = list.filter((q) => q.subject_id === filters.subjectId);
  }
  if (filters?.topicId) {
    list = list.filter((q) => q.topic_id === filters.topicId);
  }
  if (filters?.type) {
    list = list.filter((q) => q.type === filters.type);
  }
  if (filters?.status) {
    list = list.filter((q) => q.verification_status === filters.status);
  }
  if (filters?.batchId) {
    list = list.filter((q) => q.import_batch_id === filters.batchId);
  }
  if (filters?.filename) {
    list = list.filter((q) => q.import_source_filename?.toLowerCase().includes(filters.filename!.toLowerCase()));
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (q) =>
        q.question_text.toLowerCase().includes(s) ||
        q.explanation.concept.toLowerCase().includes(s) ||
        q.explanation.why.toLowerCase().includes(s)
    );
  }

  return list;
}

export async function addQuestionToBank(question: Question): Promise<void> {
  dynamicQuestionsBank.unshift(question);
  if (g.__mockmaster_store) {
    g.__mockmaster_store.dynamicQuestionsBank = dynamicQuestionsBank;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("questions").upsert(question);
    } catch {
      // fallback
    }
  }
}

export async function addQuestionsBatchToBank(questions: Question[]): Promise<number> {
  dynamicQuestionsBank.unshift(...questions);
  if (g.__mockmaster_store) {
    g.__mockmaster_store.dynamicQuestionsBank = dynamicQuestionsBank;
  }

  if (isSupabaseConfigured() && questions.length > 0) {
    try {
      const supabase = await createClient();
      // Ensure referenced exams, subjects, and topics exist in Supabase before inserting questions
      const examIds = Array.from(new Set(questions.map((q) => q.exam_id)));
      const subjectIds = Array.from(new Set(questions.map((q) => q.subject_id)));
      const topicIds = Array.from(new Set(questions.map((q) => q.topic_id)));

      const examsToSync = inMemoryExams.filter((e) => examIds.includes(e.id));
      const subjectsToSync = inMemorySubjects.filter((s) => subjectIds.includes(s.id));
      const topicsToSync = inMemoryTopics.filter((t) => topicIds.includes(t.id));

      if (examsToSync.length > 0) {
        await supabase.from("exams").upsert(examsToSync, { onConflict: "id" });
      }
      if (subjectsToSync.length > 0) {
        await supabase.from("subjects").upsert(subjectsToSync, { onConflict: "id" });
      }
      if (topicsToSync.length > 0) {
        await supabase.from("topics").upsert(topicsToSync, { onConflict: "id" });
      }

      await supabase.from("questions").upsert(questions, { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase addQuestionsBatchToBank sync warning:", err);
    }
  }

  return questions.length;
}

export async function updateQuestionVerification(
  questionId: string,
  status: "pending" | "approved" | "rejected"
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("questions")
        .update({ verification_status: status, updated_at: new Date().toISOString() })
        .eq("id", questionId);
    } catch (e) {
      console.warn("Supabase updateQuestionVerification error:", e);
    }
  }

  const q = dynamicQuestionsBank.find((item) => item.id === questionId);
  if (q) {
    q.verification_status = status;
    q.updated_at = new Date().toISOString();
    return true;
  }
  return false;
}

export async function updateQuestionInBank(
  questionId: string,
  updates: Partial<Question>
): Promise<boolean> {
  const idx = dynamicQuestionsBank.findIndex((item) => item.id === questionId);
  if (idx !== -1) {
    dynamicQuestionsBank[idx] = {
      ...dynamicQuestionsBank[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return true;
  }
  return false;
}

export async function deleteQuestionFromBank(questionId: string): Promise<boolean> {
  const idx = dynamicQuestionsBank.findIndex((q) => q.id === questionId);
  if (idx !== -1) {
    dynamicQuestionsBank.splice(idx, 1);
    return true;
  }
  return false;
}

// Phase 2: Import Batches
export async function createImportBatchRecord(batch: QuestionImportBatch): Promise<void> {
  inMemoryImportBatches.set(batch.id, batch);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const safeBatch = {
        ...batch,
        admin_user_id:
          batch.admin_user_id && /^[0-9a-f-]{36}$/i.test(batch.admin_user_id)
            ? batch.admin_user_id
            : null,
      };
      await supabase.from("question_import_batches").upsert(safeBatch, { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase createImportBatchRecord sync warning:", err);
    }
  }
}

export async function getImportBatches(): Promise<QuestionImportBatch[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("question_import_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data && data.length > 0) {
        for (const b of data as QuestionImportBatch[]) {
          inMemoryImportBatches.set(b.id, b);
        }
      }
    } catch {
      // fallback
    }
  }

  return Array.from(inMemoryImportBatches.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getImportBatchById(batchId: string): Promise<QuestionImportBatch | null> {
  const mem = inMemoryImportBatches.get(batchId);
  if (mem) return mem;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("question_import_batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle();
      if (data) {
        inMemoryImportBatches.set(batchId, data as QuestionImportBatch);
        return data as QuestionImportBatch;
      }
    } catch {
      // fallback
    }
  }

  return null;
}

// Phase 2: Bookmarks & Revision
export async function toggleSaveQuestion(
  questionId: string,
  category: "important" | "difficult" | "revise_later" = "important",
  userId: string = "default-user"
): Promise<{ saved: boolean; category: string }> {
  const key = `${userId}-${questionId}`;
  if (inMemorySavedQuestionRecords.has(key)) {
    inMemorySavedQuestionRecords.delete(key);
    if (isSupabaseConfigured() && /^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const supabase = await createClient();
        await supabase
          .from("saved_questions")
          .delete()
          .eq("user_id", userId)
          .eq("question_id", questionId);
      } catch {
        // fallback
      }
    }
    return { saved: false, category };
  } else {
    const newRecord = {
      id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      question_id: questionId,
      category,
      saved_at: new Date().toISOString(),
    };
    inMemorySavedQuestionRecords.set(key, newRecord);
    if (isSupabaseConfigured() && /^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const supabase = await createClient();
        await supabase.from("saved_questions").upsert(newRecord, {
          onConflict: "user_id,question_id",
        });
      } catch {
        // fallback
      }
    }
    return { saved: true, category };
  }
}

export async function getSavedQuestions(userId: string = "default-user"): Promise<
  Array<{ id: string; category: "important" | "difficult" | "revise_later"; saved_at: string; question: Question }>
> {
  if (isSupabaseConfigured() && /^[0-9a-f-]{36}$/i.test(userId)) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("saved_questions")
        .select("*")
        .eq("user_id", userId)
        .order("saved_at", { ascending: false });
      if (!error && data && data.length > 0) {
        for (const r of data as Array<{
          id: string;
          user_id: string;
          question_id: string;
          category: "important" | "difficult" | "revise_later";
          saved_at: string;
        }>) {
          inMemorySavedQuestionRecords.set(`${r.user_id}-${r.question_id}`, r);
        }
      }
    } catch {
      // fallback
    }
  }

  const results = [];
  for (const record of inMemorySavedQuestionRecords.values()) {
    if (record.user_id === userId) {
      const q = dynamicQuestionsBank.find((item) => item.id === record.question_id);
      if (q) {
        results.push({
          id: record.id,
          category: record.category,
          saved_at: record.saved_at,
          question: q,
        });
      }
    }
  }
  return results;
}

export async function isQuestionSaved(
  questionId: string,
  userId: string = "default-user"
): Promise<boolean> {
  const key = `${userId}-${questionId}`;
  return inMemorySavedQuestionRecords.has(key);
}

// Phase 3: Server-side Paginated Question Explorer
export async function getPaginatedQuestions(filters?: {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  type?: "PYQ" | "MODEL";
  status?: "pending" | "approved" | "rejected";
  difficulty?: "easy" | "moderate" | "hard";
  sourceYear?: number;
  sourcePaper?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ questions: Question[]; pagination: PaginationMetadata }> {
  const page = Math.max(1, filters?.page || 1);
  const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 20));

  let list = [...dynamicQuestionsBank];

  if (filters?.examId && filters.examId !== "all") {
    list = list.filter((q) => q.exam_id === filters.examId);
  }
  if (filters?.subjectId && filters.subjectId !== "all") {
    list = list.filter((q) => q.subject_id === filters.subjectId);
  }
  if (filters?.topicId && filters.topicId !== "all") {
    list = list.filter((q) => q.topic_id === filters.topicId);
  }
  if (filters?.type && (filters.type as string) !== "all") {
    list = list.filter((q) => q.type === filters.type);
  }
  if (filters?.status) {
    list = list.filter((q) => q.verification_status === filters.status);
  }
  if (filters?.difficulty && (filters.difficulty as string) !== "all") {
    list = list.filter((q) => q.difficulty === filters.difficulty);
  }
  if (filters?.sourceYear) {
    list = list.filter((q) => q.source_year === filters.sourceYear);
  }
  if (filters?.sourcePaper && filters.sourcePaper.trim()) {
    const paperTerm = filters.sourcePaper.toLowerCase();
    list = list.filter((q) => q.source_paper?.toLowerCase().includes(paperTerm));
  }
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (q) =>
        q.question_text.toLowerCase().includes(s) ||
        q.explanation.concept.toLowerCase().includes(s) ||
        q.explanation.why.toLowerCase().includes(s)
    );
  }

  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedQuestions = list.slice(startIndex, startIndex + pageSize);

  return {
    questions: paginatedQuestions,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

// Phase 3: Mistake Tracking & Review
export interface UserMistakeItem {
  id: string;
  mockTestId: string;
  orderIndex: number;
  question: Question;
  userAnswer: "A" | "B" | "C" | "D" | null;
  mistakeCategory: MistakeCategory;
  answeredAt?: string | null;
}

export async function getUserMistakes(userId: string = "default-user"): Promise<UserMistakeItem[]> {
  const mistakes: UserMistakeItem[] = [];
  const seenIds = new Set<string>();

  if (isSupabaseConfigured() && /^[0-9a-f-]{36}$/i.test(userId)) {
    try {
      const supabase = await createClient();
      const { data: dbTests } = await supabase
        .from("mock_tests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (dbTests && dbTests.length > 0) {
        const testIds = dbTests.map((t) => t.id);
        const { data: dbQuestions } = await supabase
          .from("mock_questions")
          .select("*, question:questions(*)")
          .in("mock_test_id", testIds)
          .eq("is_correct", false)
          .not("user_answer", "is", null);

        if (dbQuestions) {
          for (const mq of dbQuestions as MockQuestion[]) {
            if (mq.user_answer && !mq.is_correct && mq.question) {
              seenIds.add(mq.id);
              mistakes.push({
                id: mq.id,
                mockTestId: mq.mock_test_id,
                orderIndex: mq.order_index,
                question: mq.question,
                userAnswer: mq.user_answer,
                mistakeCategory: mq.mistake_category || "conceptual",
                answeredAt: mq.answered_at,
              });
            }
          }
        }
      }
    } catch {
      // fallback to inMemory
    }
  }

  for (const [testId, qList] of inMemoryMockQuestions.entries()) {
    const test = inMemoryMockTests.get(testId);
    if (test && test.status === "completed" && test.user_id === userId) {
      qList.forEach((mq) => {
        if (mq.user_answer && !mq.is_correct && mq.question && !seenIds.has(mq.id)) {
          seenIds.add(mq.id);
          mistakes.push({
            id: mq.id,
            mockTestId: testId,
            orderIndex: mq.order_index,
            question: mq.question,
            userAnswer: mq.user_answer,
            mistakeCategory: mq.mistake_category || "conceptual",
            answeredAt: mq.answered_at,
          });
        }
      });
    }
  }

  return mistakes.reverse(); // Most recent first
}

// Phase 3: Non-destructive Retest Drill Generator
export async function createRetestDrill(
  questionIds: string[],
  userId: string = "default-user"
): Promise<string> {
  const questionsToTest: Question[] = [];
  questionIds.forEach((id) => {
    const q = dynamicQuestionsBank.find((item) => item.id === id);
    if (q) questionsToTest.push(q);
  });

  if (questionsToTest.length === 0) {
    throw new Error("No valid questions found for retest drill");
  }

  const exam = inMemoryExams.find((e) => e.id === questionsToTest[0].exam_id) || SEED_EXAMS[0];
  const drillId = `drill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const pyqCount = questionsToTest.filter((q) => q.type === "PYQ").length;
  const modelCount = questionsToTest.filter((q) => q.type === "MODEL").length;

  const drillTest: MockTest = {
    id: drillId,
    user_id: userId,
    exam_id: exam.id,
    subject_ids: [],
    topic_ids: [],
    mode: "practice",
    total_questions: questionsToTest.length,
    pyq_count: pyqCount,
    model_count: modelCount,
    pyq_ratio: questionsToTest.length > 0 ? Math.round((pyqCount / questionsToTest.length) * 100) : 80,
    is_retest: true,
    time_limit_minutes: Math.max(10, Math.ceil(questionsToTest.length * 1.5)),
    marking_scheme: exam.marking_scheme,
    status: "in_progress",
    started_at: new Date().toISOString(),
    completed_at: null,
    raw_score: null,
    accuracy: null,
    total_correct: 0,
    total_wrong: 0,
    total_unattempted: questionsToTest.length,
    ratio_warning: "Retest Drill: Practice targeted questions from your revision/mistake pool.",
    created_at: new Date().toISOString(),
  };

  inMemoryMockTests.set(drillId, drillTest);

  const mockQuestionsList: MockQuestion[] = questionsToTest.map((q, idx) => ({
    id: `mq-${drillId}-${idx + 1}`,
    mock_test_id: drillId,
    question_id: q.id,
    order_index: idx + 1,
    user_answer: null,
    is_correct: null,
    is_marked_for_review: false,
    time_spent_seconds: 0,
    question: q,
  }));

  inMemoryMockQuestions.set(drillId, mockQuestionsList);

  return drillId;
}

// ==========================================
// Phase 4 & 5: Subscriptions, Monetization, Analytics & Audit
// ==========================================

export async function getUserPlan(userId: string = "default-user"): Promise<{ plan: UserPlanType; validUntil: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      // First check active subscriptions
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subError && subData) {
        return {
          plan: ((subData as unknown as { plan?: string; plan_type?: string }).plan ||
            (subData as unknown as { plan?: string; plan_type?: string }).plan_type ||
            "FREE") as UserPlanType,
          validUntil: subData.current_period_end,
        };
      }

      // Check user_plans table for direct plan attribute
      const { data: userPlanData, error: userPlanError } = await supabase
        .from("user_plans")
        .select("plan, valid_until")
        .eq("user_id", userId)
        .maybeSingle();

      if (!userPlanError && userPlanData?.plan) {
        return {
          plan: String(userPlanData.plan).toUpperCase() as UserPlanType,
          validUntil: userPlanData.valid_until || null,
        };
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  const cached = inMemoryUserPlans.get(userId);
  if (cached) {
    return cached;
  }

  // Check inMemorySubscriptions
  for (const sub of inMemorySubscriptions.values()) {
    if (sub.user_id === userId && (sub.status === "active" || sub.status === "trialing")) {
      return {
        plan: (sub.plan || sub.plan_type || "FREE") as UserPlanType,
        validUntil: sub.current_period_end,
      };
    }
  }

  return { plan: "FREE", validUntil: null };
}

export async function updateUserPlan(
  userId: string,
  plan: UserPlanType,
  validUntil: string | null = null
): Promise<void> {
  if (isSupabaseConfigured() && /^[0-9a-f-]{36}$/i.test(userId)) {
    try {
      const supabase = await createClient();
      await supabase.from("user_plans").upsert({
        user_id: userId,
        plan: plan.toLowerCase(),
        valid_until: validUntil,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // continue
    }
  }

  checkProductionDatabaseGuard();
  inMemoryUserPlans.set(userId, { plan, validUntil });
}

export async function getUserSubscription(userId: string = "default-user"): Promise<Subscription | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as Subscription;
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  for (const sub of inMemorySubscriptions.values()) {
    if (sub.user_id === userId) {
      return sub;
    }
  }
  return null;
}

export async function createOrUpdateSubscription(
  subData: (Omit<Subscription, "id" | "created_at" | "updated_at"> | (Partial<Subscription> & { user_id: string; provider: PaymentProvider; status: SubscriptionStatus })) & { id?: string }
): Promise<Subscription> {
  const id = subData.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const planVal = (subData as unknown as { plan?: UserPlanType; plan_type?: UserPlanType }).plan ||
    (subData as unknown as { plan?: UserPlanType; plan_type?: UserPlanType }).plan_type ||
    "PRO";

  const fullSub: Subscription = {
    id,
    user_id: subData.user_id,
    plan: planVal,
    plan_type: planVal,
    provider: subData.provider,
    provider_customer_id: subData.provider_customer_id || null,
    provider_subscription_id: subData.provider_subscription_id || null,
    status: subData.status,
    current_period_start: subData.current_period_start || now,
    current_period_end: subData.current_period_end || null,
    cancel_at_period_end: Boolean(subData.cancel_at_period_end),
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("subscriptions").upsert(fullSub);
      if (fullSub.status === "active" || fullSub.status === "trialing") {
        await supabase.from("user_plans").upsert({
          user_id: fullSub.user_id,
          plan: fullSub.plan.toLowerCase(),
          valid_until: fullSub.current_period_end,
          updated_at: now,
        });
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  inMemorySubscriptions.set(id, fullSub);
  if (fullSub.status === "active" || fullSub.status === "trialing") {
    inMemoryUserPlans.set(fullSub.user_id, {
      plan: fullSub.plan,
      validUntil: fullSub.current_period_end,
    });
  }

  return fullSub;
}

export async function getAllSubscriptionsForAdmin(): Promise<Subscription[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) {
        return data as Subscription[];
      }
    } catch {
      // fallback
    }
  }
  return Array.from(inMemorySubscriptions.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function recordPaymentTransaction(
  tx: Omit<PaymentTransaction, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<PaymentTransaction> {
  const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const fullTx: PaymentTransaction = {
    id,
    user_id: tx.user_id,
    plan: tx.plan,
    plan_code: tx.plan_code,
    billing_cycle: tx.billing_cycle,
    amount_paise: tx.amount_paise,
    currency: tx.currency || "INR",
    provider: tx.provider,
    provider_order_id: tx.provider_order_id,
    provider_payment_id: tx.provider_payment_id || null,
    provider_signature: tx.provider_signature || null,
    status: tx.status,
    metadata: tx.metadata || {},
    created_at: now,
    updated_at: now,
  };

  inMemoryPaymentTransactions.set(id, fullTx);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("payment_transactions").upsert(fullTx);
    } catch {
      // fallback
    }
  }

  return fullTx;
}

export async function updatePaymentTransactionStatus(
  providerOrderId: string,
  updates: Partial<PaymentTransaction>
): Promise<PaymentTransaction | null> {
  const now = new Date().toISOString();
  let matched: PaymentTransaction | null = null;

  for (const [id, tx] of inMemoryPaymentTransactions.entries()) {
    if (tx.provider_order_id === providerOrderId) {
      matched = {
        ...tx,
        ...updates,
        updated_at: now,
      };
      inMemoryPaymentTransactions.set(id, matched);
      break;
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("payment_transactions")
        .update({ ...updates, updated_at: now })
        .eq("provider_order_id", providerOrderId)
        .select("*")
        .maybeSingle();
      if (data) {
        matched = data as PaymentTransaction;
      }
    } catch {
      // fallback
    }
  }

  return matched;
}

export async function getUserPaymentTransactions(
  userId: string = "default-user"
): Promise<PaymentTransaction[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data as PaymentTransaction[];
      }
    } catch {
      // fallback
    }
  }

  const list: PaymentTransaction[] = [];
  for (const tx of inMemoryPaymentTransactions.values()) {
    if (tx.user_id === userId) {
      list.push(tx);
    }
  }
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getAllPaymentTransactionsForAdmin(
  limit: number = 100
): Promise<PaymentTransaction[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) {
        return data as PaymentTransaction[];
      }
    } catch {
      // fallback
    }
  }

  return Array.from(inMemoryPaymentTransactions.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function getSystemSettings(): Promise<Record<string, unknown>> {
  const obj: Record<string, unknown> = {
    default_pyq_ratio: 80,
    ai_auto_approve: false,
    maintenance_mode: false,
  };
  for (const [k, v] of inMemorySystemSettings.entries()) {
    obj[k] = v;
  }
  return obj;
}

export async function updateSystemSetting(key: string, value: unknown): Promise<void> {
  inMemorySystemSettings.set(key, value);
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("system_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
    } catch {
      // fallback
    }
  }
}

export async function hasWebhookEventBeenProcessed(eventId: string): Promise<boolean> {
  if (inMemoryWebhookEvents.has(eventId)) {
    return true;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("payment_webhook_events")
        .select("id")
        .eq("event_id", eventId)
        .maybeSingle();

      if (data) {
        inMemoryWebhookEvents.add(eventId);
        return true;
      }
    } catch {
      // fallback
    }
  }

  return false;
}

export async function recordWebhookEvent(
  event: Omit<PaymentWebhookEvent, "id" | "processed_at"> & { id?: string }
): Promise<void> {
  const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const processed_at = new Date().toISOString();
  const record: PaymentWebhookEvent = {
    id,
    processed_at,
    ...event,
  };

  inMemoryWebhookEvents.add(record.event_id);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("payment_webhook_events").insert(record);
    } catch {
      // fallback
    }
  }
}

export async function recordAIGenerationLog(
  log: Omit<AIGenerationLog, "id" | "created_at">
): Promise<AIGenerationLog> {
  const id = `ai-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullLog: AIGenerationLog = {
    id,
    created_at: new Date().toISOString(),
    ...log,
  };

  inMemoryAILogs.unshift(fullLog);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("ai_generation_logs").insert(fullLog);
    } catch {
      // fallback
    }
  }

  return fullLog;
}

export async function getAIGenerationLogs(limit: number = 50): Promise<AIGenerationLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data as AIGenerationLog[];
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  return inMemoryAILogs.slice(0, limit);
}

export async function getUserDailyMockCount(
  userId: string = "default-user",
  targetDate?: string
): Promise<number> {
  const target = targetDate ? new Date(targetDate) : new Date();
  const startOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999)).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("mock_tests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (!error && typeof count === "number") {
        return count;
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  let count = 0;
  for (const test of inMemoryMockTests.values()) {
    if (test.user_id === userId && !test.is_retest && test.created_at >= startOfDay && test.created_at <= endOfDay) {
      count++;
    }
  }
  return count;
}

export async function getUserDailyRetestCount(
  userId: string = "default-user",
  targetDate?: string
): Promise<number> {
  const target = targetDate ? new Date(targetDate) : new Date();
  const startOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999)).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("mock_tests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_retest", true)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (!error && typeof count === "number") {
        return count;
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  let count = 0;
  for (const test of inMemoryMockTests.values()) {
    if (
      test.user_id === userId &&
      (test.is_retest || test.id.startsWith("drill-")) &&
      test.created_at >= startOfDay &&
      test.created_at <= endOfDay
    ) {
      count++;
    }
  }
  return count;
}

export async function getUserDailyAIGenerationCount(
  userId: string = "default-user",
  targetDate?: string
): Promise<number> {
  const target = targetDate ? new Date(targetDate) : new Date();
  const startOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999)).toISOString();

  let count = 0;
  for (const log of inMemoryAILogs) {
    if (log.user_id === userId && log.created_at >= startOfDay && log.created_at <= endOfDay) {
      count += log.generated_count || 1;
    }
  }
  return count;
}

export async function getUserSavedQuestionCount(userId: string = "default-user"): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("saved_questions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (!error && typeof count === "number") {
        return count;
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  let count = 0;
  for (const record of inMemorySavedQuestionRecords.values()) {
    if (record.user_id === userId) {
      count++;
    }
  }
  return count;
}

// ==========================================
// Phase 5: Real User-Specific Analytics Engine
// ==========================================

export async function getUserAnalytics(
  userId: string = "default-user"
): Promise<UserAnalyticsSummary> {
  const allExams = await getAllExamsForAdmin();
  const allSubjects = await getAllSubjects(true);
  const allTopics = await getAllTopics(true);

  const examMap = new Map<string, Exam>(allExams.map((e) => [e.id, e]));
  const subjectMap = new Map<string, Subject>(allSubjects.map((s) => [s.id, s]));
  const topicMap = new Map<string, Topic>(allTopics.map((t) => [t.id, t]));

  // Gather user's mock tests & questions
  let userTests: MockTest[] = [];
  const userQuestionsByTest = new Map<string, MockQuestion[]>();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: dbTests } = await supabase
        .from("mock_tests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (dbTests && dbTests.length > 0) {
        userTests = dbTests as MockTest[];
        const testIds = userTests.map((t) => t.id);
        const { data: dbQuestions } = await supabase
          .from("mock_questions")
          .select("*, question:questions(*)")
          .in("mock_test_id", testIds);
        if (dbQuestions) {
          for (const mq of dbQuestions as MockQuestion[]) {
            const list = userQuestionsByTest.get(mq.mock_test_id) || [];
            list.push(mq);
            userQuestionsByTest.set(mq.mock_test_id, list);
          }
        }
      }
    } catch {
      // fallback to inMemory
    }
  }

  // Also merge in-memory tests for this user (or default-user in demo/dev)
  for (const [id, test] of inMemoryMockTests.entries()) {
    if (test.user_id === userId && !userTests.some((t) => t.id === id)) {
      userTests.push(test);
      const qList = inMemoryMockQuestions.get(id) || [];
      userQuestionsByTest.set(id, qList);
    }
  }

  // Sort chronologically
  userTests.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const completedTests = userTests.filter((t) => t.status === "completed");
  const hasData = completedTests.length > 0;

  let totalQuestionsAttempted = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;
  let totalTimeSeconds = 0;

  let pyqAttempted = 0;
  let pyqCorrect = 0;
  let modelAttempted = 0;
  let modelCorrect = 0;

  const diffStats = {
    easy: { attempted: 0, correct: 0 },
    moderate: { attempted: 0, correct: 0 },
    hard: { attempted: 0, correct: 0 },
  };

  const subjectStats = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      examName: string;
      attempted: number;
      correct: number;
      wrong: number;
      unattempted: number;
    }
  >();

  const topicStats = new Map<
    string,
    {
      topicId: string;
      topicName: string;
      subjectName: string;
      attempted: number;
      correct: number;
      wrong: number;
    }
  >();

  const mistakeCategoryCounts: Record<string, number> = {
    conceptual: 0,
    factual: 0,
    misread: 0,
    calculation: 0,
    guessing: 0,
    time_pressure: 0,
    other: 0,
    silly_error: 0,
    guessed: 0,
    misread_question: 0,
    memory_gap: 0,
    elimination_failure: 0,
  };

  for (const test of completedTests) {
    totalCorrect += test.total_correct || 0;
    totalWrong += test.total_wrong || 0;
    totalUnattempted += test.total_unattempted || 0;
    totalQuestionsAttempted += (test.total_correct || 0) + (test.total_wrong || 0);

    const mqs = userQuestionsByTest.get(test.id) || [];
    for (const mq of mqs) {
      totalTimeSeconds += mq.time_spent_seconds || 0;
      const q =
        mq.question || dynamicQuestionsBank.find((item) => item.id === mq.question_id);
      if (!q) continue;

      const sub = subjectMap.get(q.subject_id);
      const top = topicMap.get(q.topic_id);
      const ex = examMap.get(q.exam_id);
      const subName = sub?.name || "General Studies";
      const topName = top?.name || "Core Syllabus";
      const exName = ex?.name || "Competitive Exam";

      if (!subjectStats.has(q.subject_id)) {
        subjectStats.set(q.subject_id, {
          subjectId: q.subject_id,
          subjectName: subName,
          examName: exName,
          attempted: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
        });
      }
      const sEntry = subjectStats.get(q.subject_id)!;

      if (!topicStats.has(q.topic_id)) {
        topicStats.set(q.topic_id, {
          topicId: q.topic_id,
          topicName: topName,
          subjectName: subName,
          attempted: 0,
          correct: 0,
          wrong: 0,
        });
      }
      const tEntry = topicStats.get(q.topic_id)!;

      if (mq.user_answer) {
        sEntry.attempted += 1;
        tEntry.attempted += 1;

        if (q.type === "PYQ") {
          pyqAttempted += 1;
          if (mq.is_correct) pyqCorrect += 1;
        } else {
          modelAttempted += 1;
          if (mq.is_correct) modelCorrect += 1;
        }

        const dKey = q.difficulty || "moderate";
        if (diffStats[dKey]) {
          diffStats[dKey].attempted += 1;
          if (mq.is_correct) diffStats[dKey].correct += 1;
        }

        if (mq.is_correct) {
          sEntry.correct += 1;
          tEntry.correct += 1;
        } else {
          sEntry.wrong += 1;
          tEntry.wrong += 1;
          const cat: MistakeCategory = mq.mistake_category || "conceptual";
          mistakeCategoryCounts[cat] = (mistakeCategoryCounts[cat] || 0) + 1;
        }
      } else {
        sEntry.unattempted += 1;
      }
    }
  }

  const rawScores = completedTests.map((t) => Number(t.raw_score ?? 0));
  const averageScore =
    completedTests.length > 0
      ? Math.round((rawScores.reduce((a, b) => a + b, 0) / completedTests.length) * 100) / 100
      : null;
  const bestScore = completedTests.length > 0 ? Math.max(...rawScores) : null;
  const accuracy =
    totalQuestionsAttempted > 0
      ? Math.round((totalCorrect / totalQuestionsAttempted) * 1000) / 10
      : null;

  const pyqAccuracy =
    pyqAttempted > 0 ? Math.round((pyqCorrect / pyqAttempted) * 1000) / 10 : null;
  const modelAccuracy =
    modelAttempted > 0 ? Math.round((modelCorrect / modelAttempted) * 1000) / 10 : null;

  const subjectBreakdown = Array.from(subjectStats.values())
    .map((s) => ({
      ...s,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.attempted - a.attempted);

  const topicBreakdown = Array.from(topicStats.values())
    .map((t) => {
      const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 1000) / 10 : 0;
      return {
        ...t,
        accuracy: acc,
        isWeak: t.attempted >= 1 && acc < 60,
        isStrong: t.attempted >= 1 && acc >= 75,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const performanceTrend = completedTests.slice(-15).map((t) => {
    const ex = examMap.get(t.exam_id);
    const maxScore = Number((t.total_questions * (t.marking_scheme?.correct || 2)).toFixed(2));
    return {
      mockId: t.id,
      examName: ex?.name || "Mock Test",
      date: t.completed_at || t.created_at,
      rawScore: Number(t.raw_score ?? 0),
      maxScore,
      accuracy: Number(t.accuracy ?? 0),
      mode: t.mode,
      pyqRatio:
        typeof t.pyq_ratio === "number"
          ? t.pyq_ratio
          : t.total_questions > 0
          ? Math.round((t.pyq_count / t.total_questions) * 100)
          : 80,
    };
  });

  const recentMocks = [...userTests]
    .reverse()
    .slice(0, 10)
    .map((t) => {
      const ex = examMap.get(t.exam_id);
      const maxScore = Number((t.total_questions * (t.marking_scheme?.correct || 2)).toFixed(2));
      return {
        mockId: t.id,
        examName: ex?.name || "Mock Test",
        examSlug: ex?.slug || "upsc-cse",
        mode: t.mode,
        status: t.status,
        totalQuestions: t.total_questions,
        rawScore: t.raw_score,
        maxScore,
        accuracy: t.accuracy,
        pyqCount: t.pyq_count,
        modelCount: t.model_count,
        pyqRatio:
          typeof t.pyq_ratio === "number"
            ? t.pyq_ratio
            : t.total_questions > 0
            ? Math.round((t.pyq_count / t.total_questions) * 100)
            : 80,
        completedAt: t.completed_at,
        createdAt: t.created_at,
      };
    });

  const savedQuestionsCount = await getUserSavedQuestionCount(userId);
  const retestCount = userTests.filter((t) => t.is_retest || t.id.startsWith("drill-")).length;

  return {
    hasData,
    totalMocksAttempted: completedTests.length,
    totalQuestionsAttempted,
    totalCorrect,
    totalWrong,
    totalUnattempted,
    accuracy,
    averageScore,
    bestScore,
    totalTimeMinutes: Math.max(
      completedTests.length > 0 ? 1 : 0,
      Math.round(totalTimeSeconds / 60)
    ),
    pyqAttempted,
    pyqCorrect,
    pyqAccuracy,
    modelAttempted,
    modelCorrect,
    modelAccuracy,
    difficultyBreakdown: {
      easy: {
        attempted: diffStats.easy.attempted,
        correct: diffStats.easy.correct,
        accuracy:
          diffStats.easy.attempted > 0
            ? Math.round((diffStats.easy.correct / diffStats.easy.attempted) * 1000) / 10
            : null,
      },
      moderate: {
        attempted: diffStats.moderate.attempted,
        correct: diffStats.moderate.correct,
        accuracy:
          diffStats.moderate.attempted > 0
            ? Math.round((diffStats.moderate.correct / diffStats.moderate.attempted) * 1000) / 10
            : null,
      },
      hard: {
        attempted: diffStats.hard.attempted,
        correct: diffStats.hard.correct,
        accuracy:
          diffStats.hard.attempted > 0
            ? Math.round((diffStats.hard.correct / diffStats.hard.attempted) * 1000) / 10
            : null,
      },
    },
    subjectBreakdown,
    topicBreakdown,
    mistakeCategoryCounts,
    savedQuestionsCount,
    mistakesCount: totalWrong,
    retestCount,
    performanceTrend,
    recentMocks,
  };
}

// ==========================================
// Phase 6: AI Assistant Usage, GitHub Import Candidates & Admin Audit Logs
// ==========================================

export async function updateImportBatchRecord(
  batchId: string,
  updates: Partial<QuestionImportBatch>
): Promise<QuestionImportBatch | null> {
  const existing = inMemoryImportBatches.get(batchId);
  if (existing) {
    const updated: QuestionImportBatch = {
      ...existing,
      ...updates,
    };
    inMemoryImportBatches.set(batchId, updated);
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from("question_import_batches").update(updates).eq("id", batchId);
      } catch {
        // fallback
      }
    }
    return updated;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("question_import_batches")
        .update(updates)
        .eq("id", batchId)
        .select("*")
        .maybeSingle();
      if (data) {
        inMemoryImportBatches.set(batchId, data as QuestionImportBatch);
        return data as QuestionImportBatch;
      }
    } catch {
      // fallback
    }
  }

  return null;
}

export async function recordAIAssistantUsageLog(
  log: Omit<AIAssistantUsageLog, "id" | "created_at">
): Promise<AIAssistantUsageLog> {
  const id = `ai-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fullLog: AIAssistantUsageLog = {
    id,
    created_at: new Date().toISOString(),
    ...log,
  };

  inMemoryAIAssistantLogs.unshift(fullLog);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("ai_assistant_usage_logs").insert(fullLog);
    } catch {
      // fallback
    }
  }

  return fullLog;
}

export async function getUserDailyAIAssistantCount(
  userId: string = "default-user",
  targetDate?: string
): Promise<number> {
  const target = targetDate ? new Date(targetDate) : new Date();
  const startOfDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0)
  ).toISOString();
  const endOfDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999)
  ).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("ai_assistant_usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "success")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (!error && typeof count === "number") {
        // Also merge in-memory logs for test runs
        const memCount = inMemoryAIAssistantLogs.filter(
          (l) =>
            l.user_id === userId &&
            l.status === "success" &&
            l.created_at >= startOfDay &&
            l.created_at <= endOfDay
        ).length;
        return Math.max(count, memCount);
      }
    } catch {
      // fallback
    }
  }

  checkProductionDatabaseGuard();
  let count = 0;
  for (const log of inMemoryAIAssistantLogs) {
    if (
      log.user_id === userId &&
      log.status === "success" &&
      log.created_at >= startOfDay &&
      log.created_at <= endOfDay
    ) {
      count += 1;
    }
  }
  return count;
}

export async function getAIAssistantUsageLogs(limit: number = 100): Promise<AIAssistantUsageLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("ai_assistant_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) {
        return data as AIAssistantUsageLog[];
      }
    } catch {
      // fallback
    }
  }
  return inMemoryAIAssistantLogs.slice(0, limit);
}

export async function saveGitHubImportCandidates(
  candidates: GitHubImportCandidate[]
): Promise<void> {
  for (const c of candidates) {
    inMemoryGitHubCandidates.set(c.id, c);
  }

  if (isSupabaseConfigured() && candidates.length > 0) {
    try {
      const supabase = await createClient();
      const examIds = Array.from(new Set(candidates.map((c) => c.exam_id).filter(Boolean))) as string[];
      const subjectIds = Array.from(new Set(candidates.map((c) => c.subject_id).filter(Boolean))) as string[];
      const topicIds = Array.from(new Set(candidates.map((c) => c.topic_id).filter(Boolean))) as string[];

      const examsToSync = inMemoryExams.filter((e) => examIds.includes(e.id));
      const subjectsToSync = inMemorySubjects.filter((s) => subjectIds.includes(s.id));
      const topicsToSync = inMemoryTopics.filter((t) => topicIds.includes(t.id));

      if (examsToSync.length > 0) {
        await supabase.from("exams").upsert(examsToSync, { onConflict: "id" });
      }
      if (subjectsToSync.length > 0) {
        await supabase.from("subjects").upsert(subjectsToSync, { onConflict: "id" });
      }
      if (topicsToSync.length > 0) {
        await supabase.from("topics").upsert(topicsToSync, { onConflict: "id" });
      }

      await supabase.from("github_import_candidates").upsert(candidates, { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase saveGitHubImportCandidates sync warning:", err);
    }
  }
}

export async function getGitHubImportCandidatesByBatchId(
  batchId: string
): Promise<GitHubImportCandidate[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("github_import_candidates")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        for (const c of data as GitHubImportCandidate[]) {
          inMemoryGitHubCandidates.set(c.id, c);
        }
        return data as GitHubImportCandidate[];
      }
    } catch {
      // fallback
    }
  }

  const list: GitHubImportCandidate[] = [];
  for (const c of inMemoryGitHubCandidates.values()) {
    if (c.batch_id === batchId) {
      list.push(c);
    }
  }
  return list;
}

export async function getAllGitHubImportCandidates(): Promise<GitHubImportCandidate[]> {
  return Array.from(inMemoryGitHubCandidates.values());
}

export async function getGitHubImportCandidateById(
  candidateId: string
): Promise<GitHubImportCandidate | null> {
  const mem = inMemoryGitHubCandidates.get(candidateId);
  if (mem) return mem;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("github_import_candidates")
        .select("*")
        .eq("id", candidateId)
        .maybeSingle();
      if (data) {
        inMemoryGitHubCandidates.set(candidateId, data as GitHubImportCandidate);
        return data as GitHubImportCandidate;
      }
    } catch {
      // fallback
    }
  }

  return null;
}

export async function updateGitHubImportCandidate(
  candidateId: string,
  updates: Partial<GitHubImportCandidate>
): Promise<GitHubImportCandidate | null> {
  const existing = await getGitHubImportCandidateById(candidateId);
  if (!existing) return null;

  const updated: GitHubImportCandidate = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  inMemoryGitHubCandidates.set(candidateId, updated);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("github_import_candidates")
        .update({ ...updates, updated_at: updated.updated_at })
        .eq("id", candidateId);
    } catch {
      // fallback
    }
  }

  return updated;
}

export async function recordAdminAuditLog(
  log: Omit<AdminAuditLog, "id" | "created_at">
): Promise<AdminAuditLog> {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fullLog: AdminAuditLog = {
    id,
    created_at: new Date().toISOString(),
    ...log,
  };

  inMemoryAdminAuditLogs.unshift(fullLog);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("admin_audit_logs").insert(fullLog);
    } catch {
      // fallback
    }
  }

  return fullLog;
}

export async function getAdminAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) {
        return data as AdminAuditLog[];
      }
    } catch {
      // fallback
    }
  }
  return inMemoryAdminAuditLogs.slice(0, limit);
}

