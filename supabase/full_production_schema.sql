-- ============================================================================
-- MOCKMASTER COMPLETE PRODUCTION DATABASE SCHEMA (MIGRATIONS 001 THROUGH 010)
-- Safe, idempotent execution in Supabase SQL Editor. Does NOT drop auth.users.
-- ============================================================================

-- >>> BEGIN 001_exam_taxonomy.sql <<<
-- Migration 001: Exam Taxonomy
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  marking_scheme JSONB NOT NULL, -- e.g. {"correct": 2, "wrong": -0.66, "unattempted": 0}
  time_limit_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INT DEFAULT 0,
  UNIQUE(exam_id, slug)
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INT DEFAULT 0,
  UNIQUE(subject_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subjects_exam ON subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
-- >>> END 001_exam_taxonomy.sql <<<

-- >>> BEGIN 002_questions.sql <<<
-- Migration 002: Questions Bank
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('PYQ', 'MODEL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,

  -- Strict integrity field: 'PYQ' or 'MODEL'. AI questions can NEVER be marked PYQ.
  type question_type NOT NULL,

  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),

  -- Structured explanation: { why, concept, exam_perspective, remember, related_concept }
  explanation JSONB NOT NULL,

  difficulty difficulty_level NOT NULL DEFAULT 'moderate',

  -- PYQ specific metadata (NULL for MODEL questions)
  source_year INT,
  source_paper TEXT,

  verification_status verification_status NOT NULL DEFAULT 'pending',

  -- Statistics & Anti-duplicate tracking
  times_shown INT DEFAULT 0,
  times_correct INT DEFAULT 0,

  -- Audit & Source tracking for bulk imports
  import_batch_id TEXT,
  import_source_filename TEXT,
  import_source_row INT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_lookup ON questions(exam_id, subject_id, topic_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type, verification_status);
CREATE INDEX IF NOT EXISTS idx_questions_import_batch ON questions(import_batch_id);
-- >>> END 002_questions.sql <<<

-- >>> BEGIN 003_mock_tests.sql <<<
-- Migration 003: Mock Tests & Questions Attempts
DO $$ BEGIN
  CREATE TYPE test_mode AS ENUM ('practice', 'exam');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE test_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS mock_tests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  subject_ids TEXT[] NOT NULL DEFAULT '{}',
  topic_ids TEXT[] NOT NULL DEFAULT '{}',

  mode test_mode NOT NULL DEFAULT 'practice',
  total_questions INT NOT NULL,
  pyq_count INT NOT NULL,
  model_count INT NOT NULL,
  time_limit_minutes INT NOT NULL,
  marking_scheme JSONB NOT NULL,

  status test_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  raw_score DECIMAL,
  accuracy DECIMAL,
  total_correct INT DEFAULT 0,
  total_wrong INT DEFAULT 0,
  total_unattempted INT DEFAULT 0,

  ratio_warning TEXT, -- Stores warning if target PYQ/Model ratio could not be strictly met

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mock_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mock_test_id TEXT NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  order_index INT NOT NULL,

  user_answer CHAR(1) CHECK (user_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  is_marked_for_review BOOLEAN DEFAULT false,
  time_spent_seconds INT DEFAULT 0,
  mistake_category TEXT,

  answered_at TIMESTAMPTZ,
  UNIQUE(mock_test_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_mock_tests_user ON mock_tests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mock_questions_test ON mock_questions(mock_test_id, order_index);
-- >>> END 003_mock_tests.sql <<<

-- >>> BEGIN 004_user_data_and_import.sql <<<
-- Migration 004: User Data & Import Tracking
DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('student', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_plan_type AS ENUM ('free', 'premium');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE import_type_enum AS ENUM ('CSV', 'ZIP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE import_status_enum AS ENUM ('processing', 'completed', 'failed', 'partial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'student',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan user_plan_type NOT NULL DEFAULT 'free',
  valid_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  total_attempted INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  accuracy DECIMAL NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS question_seen_log (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  seen_count INT NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS saved_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'important' CHECK (category IN ('important', 'difficult', 'revise_later')),
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS question_import_batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  import_type import_type_enum NOT NULL,
  total_files INT NOT NULL DEFAULT 1,
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  invalid_rows INT NOT NULL DEFAULT 0,
  duplicate_rows INT NOT NULL DEFAULT 0,
  imported_rows INT NOT NULL DEFAULT 0,
  status import_status_enum NOT NULL DEFAULT 'processing',
  error_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_progress_user_exam ON user_progress(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_seen_log_user ON question_seen_log(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_user ON saved_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_admin ON question_import_batches(admin_user_id);
-- >>> END 004_user_data_and_import.sql <<<

-- >>> BEGIN 005_rls_policies.sql <<<
-- Migration 005: Row Level Security Policies
-- Enable RLS on every table
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_seen_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_import_batches ENABLE ROW LEVEL SECURITY;

-- Helper admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Exams / Subjects / Topics: Publicly readable when active, admin manageable
DROP POLICY IF EXISTS "Public read active exams" ON exams;
CREATE POLICY "Public read active exams" ON exams
  FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Admin manage exams" ON exams;
CREATE POLICY "Admin manage exams" ON exams
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read subjects" ON subjects;
CREATE POLICY "Public read subjects" ON subjects
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admin manage subjects" ON subjects;
CREATE POLICY "Admin manage subjects" ON subjects
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read topics" ON topics;
CREATE POLICY "Public read topics" ON topics
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admin manage topics" ON topics;
CREATE POLICY "Admin manage topics" ON topics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Questions: Approved questions readable by authenticated users; admins have full access
DROP POLICY IF EXISTS "Read approved questions" ON questions;
CREATE POLICY "Read approved questions" ON questions
  FOR SELECT TO authenticated USING (verification_status = 'approved');

DROP POLICY IF EXISTS "Admin manage questions" ON questions;
CREATE POLICY "Admin manage questions" ON questions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Mock Tests: Users can read and insert their own mock tests
DROP POLICY IF EXISTS "Users access own mock tests" ON mock_tests;
CREATE POLICY "Users access own mock tests" ON mock_tests
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own mock questions" ON mock_questions;
CREATE POLICY "Users access own mock questions" ON mock_questions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM mock_tests
      WHERE mock_tests.id = mock_questions.mock_test_id AND mock_tests.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM mock_tests
      WHERE mock_tests.id = mock_questions.mock_test_id AND mock_tests.user_id = auth.uid()
    )
  );

-- User Progress & Seen Log & Bookmarks: Private to user
DROP POLICY IF EXISTS "Users manage own progress" ON user_progress;
CREATE POLICY "Users manage own progress" ON user_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own seen log" ON question_seen_log;
CREATE POLICY "Users manage own seen log" ON question_seen_log
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own saved questions" ON saved_questions;
CREATE POLICY "Users manage own saved questions" ON saved_questions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own role" ON user_roles;
CREATE POLICY "Users read own role" ON user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin manage roles" ON user_roles;
CREATE POLICY "Admin manage roles" ON user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own plan" ON user_plans;
CREATE POLICY "Users read own plan" ON user_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin manage plans" ON user_plans;
CREATE POLICY "Admin manage plans" ON user_plans
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage import batches" ON question_import_batches;
CREATE POLICY "Admin manage import batches" ON question_import_batches
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
-- >>> END 005_rls_policies.sql <<<

-- >>> BEGIN 006_phase3_performance_and_indexes.sql <<<
-- Migration 006: Phase 3 Performance Optimization, Indexes & Data Integrity

-- 1. Performance Indexes for Questions Bank
CREATE INDEX IF NOT EXISTS idx_questions_source_year ON questions(source_year);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_exam_subject ON questions(exam_id, subject_id);

-- 2. Performance Indexes for Mock Tests & Attempts
CREATE INDEX IF NOT EXISTS idx_mock_tests_created_at ON mock_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_tests_exam ON mock_tests(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_mock_questions_qid ON mock_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_mock_questions_is_correct ON mock_questions(is_correct);

-- 3. Performance Indexes for User Features (Saved, Seen, Progress)
CREATE INDEX IF NOT EXISTS idx_saved_questions_qid ON saved_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_category ON saved_questions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_seen_log_qid ON question_seen_log(question_id);

-- 4. Mistake Category Validation (supports all MistakeCategory values in database.ts)
DO $$ BEGIN
  ALTER TABLE mock_questions
  DROP CONSTRAINT IF EXISTS chk_mock_questions_mistake_category;
  ALTER TABLE mock_questions
  ADD CONSTRAINT chk_mock_questions_mistake_category
  CHECK (
    mistake_category IS NULL OR
    mistake_category IN (
      'conceptual',
      'factual',
      'factual_gap',
      'misread',
      'misread_question',
      'calculation',
      'guessing',
      'guessed',
      'silly',
      'silly_error',
      'confused_options',
      'memory_gap',
      'elimination_failure',
      'time_pressure',
      'other'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
-- >>> END 006_phase3_performance_and_indexes.sql <<<

-- >>> BEGIN 007_phase4_monetization_and_audit.sql <<<
-- Migration 007: Phase 4 Monetization, Subscriptions, AI Generation Audit & Webhook Idempotency

-- 1. Custom Types
DO $$ BEGIN
  CREATE TYPE subscription_status_enum AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider_enum AS ENUM ('razorpay', 'stripe');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'PRO',
  plan_type TEXT,
  provider payment_provider_enum NOT NULL DEFAULT 'razorpay',
  provider_customer_id TEXT,
  provider_subscription_id TEXT UNIQUE,
  status subscription_status_enum NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub ON subscriptions(provider_subscription_id);

-- 3. AI Generation Audit Logs Table
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  model_name TEXT,
  exam_name TEXT,
  exam_id TEXT,
  subject_name TEXT,
  subject_id TEXT,
  topic_name TEXT,
  topic_id TEXT,
  requested_count INT NOT NULL,
  generated_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  latency_ms INT,
  error_message TEXT,
  error_category TEXT,
  prompt_preview TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for AI generation logs
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user ON ai_generation_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created ON ai_generation_logs(created_at DESC);

-- 4. Payment Webhook Events (Idempotency & Replay Protection)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL UNIQUE,
  provider payment_provider_enum NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_id ON payment_webhook_events(event_id);

-- 5. Row Level Security Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can read their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Subscriptions: Service role & Admins can manage subscriptions
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON subscriptions;
CREATE POLICY "Admins manage all subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- AI Generation Logs: Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view AI generation logs" ON ai_generation_logs;
CREATE POLICY "Admins can view AI generation logs"
  ON ai_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert AI generation logs" ON ai_generation_logs;
CREATE POLICY "Admins can insert AI generation logs"
  ON ai_generation_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Payment Webhook Events: Admin/Service access only
DROP POLICY IF EXISTS "Admins can view payment webhook events" ON payment_webhook_events;
CREATE POLICY "Admins can view payment webhook events"
  ON payment_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin());
-- >>> END 007_phase4_monetization_and_audit.sql <<<

-- >>> BEGIN 008_phase5_taxonomy_plans_payments_analytics.sql <<<
-- Migration 008: Phase 5 Taxonomy Expansion, 3-Tier Plans (Free/Pro/Elite), Payment Transactions, PYQ/Model Ratio & Performance Indexes

-- 1. Extend user_plan_type enum safely to support 'pro' and 'elite' alongside 'free' and 'premium'
ALTER TYPE user_plan_type ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE user_plan_type ADD VALUE IF NOT EXISTS 'elite';

-- 2. Extend exams and subjects tables for richer multi-exam taxonomy
ALTER TABLE exams ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Civil Services & Government';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS conducting_body TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks NUMERIC;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS default_questions INT DEFAULT 100;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paper_name TEXT DEFAULT 'Paper I';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE topics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add user-controlled pyq_ratio column to mock_tests (0 to 100, default 80)
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS pyq_ratio INT NOT NULL DEFAULT 80 CHECK (pyq_ratio >= 0 AND pyq_ratio <= 100);
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS is_retest BOOLEAN NOT NULL DEFAULT false;

-- 4. Payment Transactions Table (Server-verified order & payment ledger)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider payment_provider_enum NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT NOT NULL,
  provider_payment_id TEXT,
  provider_signature TEXT,
  plan TEXT,
  plan_code TEXT,
  plan_id TEXT,
  plan_type TEXT,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'annual')),
  amount_paise INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'captured', 'failed', 'refunded')),
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment ON payment_transactions(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- 5. System Settings Table (Admin-configurable PYQ/Model ratios, plan flags, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Additional Performance Indexes for Analytics & Filtering
CREATE INDEX IF NOT EXISTS idx_questions_type_status ON questions(type, verification_status);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type_status ON questions(exam_id, type, verification_status);
CREATE INDEX IF NOT EXISTS idx_questions_subject_status ON questions(subject_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_questions_topic_status ON questions(topic_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_mock_tests_user_completed ON mock_tests(user_id, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_questions_test_correct ON mock_questions(mock_test_id, is_correct);

-- 7. Row Level Security for new tables
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payment transactions" ON payment_transactions;
CREATE POLICY "Users can insert own payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payment transactions" ON payment_transactions;
CREATE POLICY "Users can update own payment transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all payment transactions" ON payment_transactions;
CREATE POLICY "Admins manage all payment transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read system settings" ON system_settings;
CREATE POLICY "Public read system settings"
  ON system_settings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins manage system settings" ON system_settings;
CREATE POLICY "Admins manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
-- >>> END 008_phase5_taxonomy_plans_payments_analytics.sql <<<

-- >>> BEGIN 009_phase6_ai_assistant_and_github_importer.sql <<<
-- Migration 009: Phase 6 MockMaster AI Assistant & Admin GitHub Question Importer

-- 1. Extend import_type_enum to support 'GITHUB'
ALTER TYPE import_type_enum ADD VALUE IF NOT EXISTS 'GITHUB';

-- 2. Extend question_import_batches with GitHub repository and review counters
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS source_repository TEXT;
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS source_branch TEXT DEFAULT 'main';
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS source_path TEXT;
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS files_scanned INT NOT NULL DEFAULT 0;
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS questions_extracted INT NOT NULL DEFAULT 0;
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS approved_count INT NOT NULL DEFAULT 0;
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS rejected_count INT NOT NULL DEFAULT 0;
ALTER TABLE question_import_batches ADD COLUMN IF NOT EXISTS pending_count INT NOT NULL DEFAULT 0;

-- 3. Extend questions table with traceable GitHub provenance fields
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_repository TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_path TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_commit TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC;

-- 4. GitHub Import Candidates Table (Staging & Admin Review Queue before publishing to questions)
CREATE TABLE IF NOT EXISTS github_import_candidates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  batch_id TEXT NOT NULL REFERENCES question_import_batches(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  normalized_question_text TEXT NOT NULL DEFAULT '',
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT CHECK (correct_answer IS NULL OR correct_answer IN ('A', 'B', 'C', 'D')),
  requires_answer_verification BOOLEAN NOT NULL DEFAULT false,
  explanation JSONB NOT NULL DEFAULT '{"why": "", "concept": ""}'::jsonb,
  exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  exam_name TEXT,
  subject_name TEXT,
  topic_name TEXT,
  question_type question_type NOT NULL DEFAULT 'MODEL',
  difficulty difficulty_level NOT NULL DEFAULT 'moderate',
  source_repository TEXT NOT NULL,
  source_branch TEXT DEFAULT 'main',
  source_path TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  source_line INT,
  source_year INT,
  source_paper TEXT,
  source_url TEXT,
  source_commit TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 100),
  duplicate_status TEXT NOT NULL DEFAULT 'new' CHECK (duplicate_status IN ('new', 'duplicate', 'possible_duplicate')),
  duplicate_match_id TEXT,
  duplicate_similarity NUMERIC,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  promoted_question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_candidates_batch ON github_import_candidates(batch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_github_candidates_status ON github_import_candidates(batch_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_github_candidates_dup ON github_import_candidates(batch_id, duplicate_status);

-- 5. AI Assistant Usage Tracking Table
CREATE TABLE IF NOT EXISTS ai_assistant_usage_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT,
  message_length INT NOT NULL DEFAULT 0,
  response_length INT NOT NULL DEFAULT 0,
  latency_ms INT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rate_limited')),
  context_exam TEXT,
  context_subject TEXT,
  context_topic TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_assistant_usage_user_date ON ai_assistant_usage_logs(user_id, created_at DESC);

-- 6. Admin Audit Logs Table (Traceable provenance for imports, approvals, rejections, edits)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id, created_at DESC);

-- 7. Row Level Security
ALTER TABLE github_import_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage github_import_candidates" ON github_import_candidates;
CREATE POLICY "Admins manage github_import_candidates"
  ON github_import_candidates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own AI assistant usage logs" ON ai_assistant_usage_logs;
CREATE POLICY "Users can view own AI assistant usage logs"
  ON ai_assistant_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI assistant usage logs" ON ai_assistant_usage_logs;
CREATE POLICY "Users can insert own AI assistant usage logs"
  ON ai_assistant_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all AI assistant usage logs" ON ai_assistant_usage_logs;
CREATE POLICY "Admins view all AI assistant usage logs"
  ON ai_assistant_usage_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage admin_audit_logs" ON admin_audit_logs;
CREATE POLICY "Admins manage admin_audit_logs"
  ON admin_audit_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
-- >>> END 009_phase6_ai_assistant_and_github_importer.sql <<<

-- >>> BEGIN 010_production_schema_reconciliation_and_bootstrap.sql <<<
-- Migration 010: Production Schema Reconciliation, Auth Triggers, Admin Assignment & Bootstrap
-- Safely reconciles existing auth.users with public.user_roles and public.user_plans,
-- installs the post-signup trigger, and provides safe server-side admin role assignment.

-- 1. Post-Signup Trigger Function: Automatically initialize user_roles ('student') and user_plans ('free')
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, updated_at)
  VALUES (NEW.id, 'student', now())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_plans (user_id, plan, updated_at)
  VALUES (NEW.id, 'free', now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Backfill existing auth.users into public.user_roles and public.user_plans without overwriting existing roles/plans
INSERT INTO public.user_roles (user_id, role, updated_at)
SELECT id, 'student'::user_role_type, now()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_plans (user_id, plan, updated_at)
SELECT id, 'free'::user_plan_type, now()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Safe Admin Assignment Helper Function (by existing auth.users email)
CREATE OR REPLACE FUNCTION public.assign_admin_by_email(target_email TEXT)
RETURNS UUID AS $$
DECLARE
  target_uid UUID;
BEGIN
  SELECT id INTO target_uid
  FROM auth.users
  WHERE lower(email) = lower(trim(target_email))
  ORDER BY created_at ASC
  LIMIT 1;

  IF target_uid IS NULL THEN
    RAISE EXCEPTION 'No existing auth.users account found for email: %', target_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role, updated_at)
  VALUES (target_uid, 'admin', now())
  ON CONFLICT (user_id)
  DO UPDATE SET role = 'admin', updated_at = now();

  RETURN target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Revoke public/authenticated execution of assign_admin_by_email so only SQL Editor (postgres/service_role) can call it
REVOKE ALL ON FUNCTION public.assign_admin_by_email(TEXT) FROM PUBLIC, anon, authenticated;

-- 4. Initial Owner Bootstrap: If no admin exists yet in public.user_roles, promote the primary (earliest) auth.users account
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, updated_at)
      VALUES (first_user_id, 'admin', now())
      ON CONFLICT (user_id)
      DO UPDATE SET role = 'admin', updated_at = now();
    END IF;
  END IF;
END $$;

-- 5. Seed Default System Settings (Idempotent)
INSERT INTO public.system_settings (key, value, updated_at)
VALUES
  ('default_pyq_ratio', '80'::jsonb, now()),
  ('ai_auto_approve', 'false'::jsonb, now()),
  ('maintenance_mode', 'false'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
-- >>> END 010_production_schema_reconciliation_and_bootstrap.sql <<<

