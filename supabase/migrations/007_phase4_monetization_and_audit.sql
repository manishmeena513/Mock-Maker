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
