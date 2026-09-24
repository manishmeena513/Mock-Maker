import { SEED_EXAMS, SEED_SUBJECTS, SEED_TOPICS, SEED_QUESTIONS } from "./data/seedData";
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
} from "@/types/database";
import { createClient } from "./supabase/server";
import { assertProductionDatabaseConfigured, isProductionRuntime } from "@/lib/config/env";

interface GlobalMockMasterStore {
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
  inMemoryAILogs: AIGenerationLog[];
  inMemoryWebhookEvents: Set<string>;
}

const g = globalThis as unknown as { __mockmaster_store?: GlobalMockMasterStore };

if (!g.__mockmaster_store) {
  g.__mockmaster_store = {
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
    inMemoryAILogs: [],
    inMemoryWebhookEvents: new Set(),
  };
}

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
const inMemoryAILogs = g.__mockmaster_store.inMemoryAILogs;
const inMemoryWebhookEvents = g.__mockmaster_store.inMemoryWebhookEvents;

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
        return data as Exam[];
      }
    } catch (err) {
      console.warn("Falling back to seed exams:", err);
    }
  }
  checkProductionDatabaseGuard();
  return SEED_EXAMS.filter((e) => e.is_active);
}

export async function getExamBySlug(slug: string): Promise<Exam | null> {
  const exams = await getExams();
  return exams.find((e) => e.slug === slug) || null;
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
        return data as Subject[];
      }
    } catch (err) {
      console.warn("Falling back to seed subjects:", err);
    }
  }
  return SEED_SUBJECTS.filter((s) => s.exam_id === examId).sort(
    (a, b) => a.order_index - b.order_index
  );
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
        return data as Topic[];
      }
    } catch (err) {
      console.warn("Falling back to seed topics:", err);
    }
  }
  return SEED_TOPICS.filter((t) => t.subject_id === subjectId).sort(
    (a, b) => a.order_index - b.order_index
  );
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
      console.warn("Falling back to seed questions pool:", err);
    }
  }

  if (pool.length === 0) {
    pool = SEED_QUESTIONS.filter((q) => {
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
}

export async function addQuestionsBatchToBank(questions: Question[]): Promise<number> {
  dynamicQuestionsBank = [...questions, ...dynamicQuestionsBank];
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
  const initialLen = dynamicQuestionsBank.length;
  dynamicQuestionsBank = dynamicQuestionsBank.filter((q) => q.id !== questionId);
  return dynamicQuestionsBank.length < initialLen;
}

// Phase 2: Import Batches
export async function createImportBatchRecord(batch: QuestionImportBatch): Promise<void> {
  inMemoryImportBatches.set(batch.id, batch);
}

export async function getImportBatches(): Promise<QuestionImportBatch[]> {
  return Array.from(inMemoryImportBatches.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getImportBatchById(batchId: string): Promise<QuestionImportBatch | null> {
  return inMemoryImportBatches.get(batchId) || null;
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
    return { saved: false, category };
  } else {
    inMemorySavedQuestionRecords.set(key, {
      id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      question_id: questionId,
      category,
      saved_at: new Date().toISOString(),
    });
    return { saved: true, category };
  }
}

export async function getSavedQuestions(userId: string = "default-user"): Promise<
  Array<{ id: string; category: "important" | "difficult" | "revise_later"; saved_at: string; question: Question }>
> {
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

  for (const [testId, qList] of inMemoryMockQuestions.entries()) {
    const test = inMemoryMockTests.get(testId);
    if (test && test.status === "completed") {
      qList.forEach((mq) => {
        if (mq.user_answer && !mq.is_correct && mq.question) {
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

  const exam = SEED_EXAMS[0];
  const drillId = `drill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const drillTest: MockTest = {
    id: drillId,
    user_id: userId,
    exam_id: exam.id,
    subject_ids: [],
    topic_ids: [],
    mode: "practice",
    total_questions: questionsToTest.length,
    pyq_count: questionsToTest.filter((q) => q.type === "PYQ").length,
    model_count: questionsToTest.filter((q) => q.type === "MODEL").length,
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
// Phase 4: Subscriptions, Monetization & Audit
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

      // Check users table for direct plan attribute
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("plan")
        .eq("id", userId)
        .maybeSingle();

      if (!userError && userData?.plan) {
        return {
          plan: userData.plan as UserPlanType,
          validUntil: null,
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
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("users")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("id", userId);
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
    "PREMIUM";

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
        await supabase
          .from("users")
          .update({ plan: fullSub.plan, updated_at: now })
          .eq("id", fullSub.user_id);
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
    if (test.user_id === userId && test.created_at >= startOfDay && test.created_at <= endOfDay) {
      count++;
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



