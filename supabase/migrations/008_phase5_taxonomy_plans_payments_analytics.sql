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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider payment_provider_enum NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT NOT NULL,
  provider_payment_id TEXT,
  plan_id TEXT NOT NULL,
  plan_type user_plan_type NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_paise INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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

CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all payment transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Public read system settings"
  ON system_settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (public.is_admin());
