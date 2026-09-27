export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QuestionType = "PYQ" | "MODEL";
export type DifficultyLevel = "easy" | "moderate" | "hard";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type TestMode = "practice" | "exam";
export type TestStatus = "in_progress" | "completed" | "abandoned";
export type UserRoleType = "student" | "admin";
export type UserPlanType =
  | "free"
  | "pro"
  | "elite"
  | "premium"
  | "FREE"
  | "PRO"
  | "ELITE"
  | "PREMIUM";
export type ImportType = "CSV" | "ZIP";
export type ImportStatus = "processing" | "completed" | "failed" | "partial";

export type PYQModelRatio = 100 | 90 | 80 | 70 | 60 | 50 | 40 | 30 | 20 | 10 | 0;

export const PYQ_MODEL_RATIOS: PYQModelRatio[] = [
  100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0,
];

export type MistakeCategory =
  | "conceptual"
  | "factual"
  | "misread"
  | "calculation"
  | "guessing"
  | "time_pressure"
  | "other";

export const MISTAKE_CATEGORIES: MistakeCategory[] = [
  "conceptual",
  "factual",
  "misread",
  "calculation",
  "guessing",
  "time_pressure",
  "other",
];

export interface SubjectPerformanceSummary {
  id: string;
  name: string;
  examName?: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracy: number;
  score: number;
}

export interface TopicPerformanceSummary {
  id: string;
  name: string;
  subjectName?: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracy: number;
  status: "Strong" | "Needs Revision" | "Weak";
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StructuredExplanation {
  why: string;
  concept: string;
  exam_perspective?: string;
  remember?: string;
  related_concept?: string;
}

export interface MarkingScheme {
  correct: number;
  wrong: number;
  unattempted: number;
}

export interface Exam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url?: string | null;
  category?: string;
  conducting_body?: string;
  marking_scheme: MarkingScheme;
  time_limit_minutes: number;
  default_time_minutes?: number;
  default_questions?: number;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  exam_id: string;
  name: string;
  slug: string;
  paper_name?: string;
  order_index: number;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  order_index: number;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Question {
  id: string;
  exam_id: string;
  subject_id: string;
  topic_id: string;
  type: QuestionType;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: StructuredExplanation;
  difficulty: DifficultyLevel;
  source_year: number | null;
  source_paper: string | null;
  verification_status: VerificationStatus;
  times_shown: number;
  times_correct: number;
  import_batch_id?: string | null;
  import_source_filename?: string | null;
  import_source_row?: number | null;
  created_at: string;
  updated_at: string;
}

export interface MockTest {
  id: string;
  user_id: string | null;
  exam_id: string;
  subject_ids: string[];
  topic_ids: string[];
  mode: TestMode;
  total_questions: number;
  pyq_count: number;
  model_count: number;
  pyq_ratio?: number;
  is_retest?: boolean;
  time_limit_minutes: number;
  marking_scheme: MarkingScheme;
  status: TestStatus;
  started_at: string;
  completed_at: string | null;
  raw_score: number | null;
  accuracy: number | null;
  total_correct: number;
  total_wrong: number;
  total_unattempted: number;
  ratio_warning?: string | null;
  created_at: string;
}

export interface MockQuestion {
  id: string;
  mock_test_id: string;
  question_id: string;
  order_index: number;
  user_answer: "A" | "B" | "C" | "D" | null;
  is_correct: boolean | null;
  is_marked_for_review: boolean;
  time_spent_seconds: number;
  mistake_category?: MistakeCategory | null;
  answered_at?: string | null;
  question?: Question;
}

export interface UserProgress {
  id: string;
  user_id: string;
  exam_id: string;
  subject_id: string;
  topic_id: string;
  total_attempted: number;
  total_correct: number;
  accuracy: number;
  last_attempted_at: string;
}

export interface SavedQuestion {
  id: string;
  user_id: string;
  question_id: string;
  category: "important" | "difficult" | "revise_later";
  saved_at: string;
  question?: Question;
}

export interface QuestionImportBatch {
  id: string;
  admin_user_id: string | null;
  filename: string;
  import_type: ImportType;
  total_files: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  imported_rows: number;
  status: ImportStatus;
  error_log?: Json | null;
  created_at: string;
  completed_at: string | null;
}

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "trialing"
  | "expired";
export type PaymentProvider = "razorpay" | "stripe";

export interface Subscription {
  id: string;
  user_id: string;
  plan: UserPlanType;
  plan_type?: UserPlanType;
  provider: PaymentProvider;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  plan?: UserPlanType;
  plan_code?: string;
  plan_id?: string;
  plan_type?: UserPlanType;
  billing_cycle: "monthly" | "yearly" | "annual";
  amount_paise: number;
  currency: string;
  provider: PaymentProvider;
  provider_order_id: string;
  provider_payment_id: string | null;
  provider_signature?: string | null;
  status: "created" | "paid" | "captured" | "failed" | "refunded";
  failure_reason?: string | null;
  metadata?: Json | null;
  created_at: string;
  updated_at?: string;
  verified_at?: string | null;
}

export interface AIGenerationLog {
  id: string;
  user_id?: string | null;
  admin_user_id?: string | null;
  provider: string;
  model?: string;
  model_name?: string;
  exam_name?: string | null;
  exam_id?: string | null;
  subject_name?: string | null;
  subject_id?: string | null;
  topic_name?: string | null;
  topic_id?: string | null;
  requested_count: number;
  generated_count: number;
  status: "success" | "failed" | "partial";
  latency_ms?: number | null;
  error_message?: string | null;
  error_category?: string | null;
  prompt_preview?: string | null;
  metadata?: Json | null;
  created_at: string;
}

export interface PaymentWebhookEvent {
  id: string;
  event_id: string;
  provider: PaymentProvider;
  event_type: string;
  payload?: Json | null;
  processed_at: string;
}

export interface PlanLimits {
  plan?: UserPlanType;
  dailyMockLimit?: number;
  maxMocksPerDay?: number;
  maxSavedQuestions: number;
  maxDrillQuestions?: number;
  dailyRetestLimit?: number;
  canGenerateAIQuestions?: boolean;
  allowAiGeneration?: boolean;
  dailyAiGenerationLimit?: number;
  hasAdvancedAnalytics: boolean;
  hasDetailedExplanations?: boolean;
  allowedPyqRatios?: number[];
}

export interface UserAnalyticsSummary {
  hasData: boolean;
  totalMocksAttempted: number;
  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnattempted: number;
  accuracy: number | null;
  averageScore: number | null;
  bestScore: number | null;
  totalTimeMinutes: number;
  pyqAttempted: number;
  pyqCorrect: number;
  pyqAccuracy: number | null;
  modelAttempted: number;
  modelCorrect: number;
  modelAccuracy: number | null;
  difficultyBreakdown: {
    easy: { attempted: number; correct: number; accuracy: number | null };
    moderate: { attempted: number; correct: number; accuracy: number | null };
    hard: { attempted: number; correct: number; accuracy: number | null };
  };
  subjectBreakdown: Array<{
    subjectId: string;
    subjectName: string;
    examName: string;
    attempted: number;
    correct: number;
    wrong: number;
    unattempted: number;
    accuracy: number;
  }>;
  topicBreakdown: Array<{
    topicId: string;
    topicName: string;
    subjectName: string;
    attempted: number;
    correct: number;
    wrong: number;
    accuracy: number;
    isWeak: boolean;
    isStrong: boolean;
  }>;
  mistakeCategoryCounts: Record<string, number>;
  savedQuestionsCount: number;
  mistakesCount: number;
  retestCount: number;
  performanceTrend: Array<{
    mockId: string;
    examName: string;
    date: string;
    rawScore: number;
    maxScore: number;
    accuracy: number;
    mode: TestMode;
    pyqRatio: number;
  }>;
  recentMocks: Array<{
    mockId: string;
    examName: string;
    examSlug: string;
    mode: TestMode;
    status: TestStatus;
    totalQuestions: number;
    rawScore: number | null;
    maxScore: number;
    accuracy: number | null;
    pyqCount: number;
    modelCount: number;
    pyqRatio: number;
    completedAt: string | null;
    createdAt: string;
  }>;
}
