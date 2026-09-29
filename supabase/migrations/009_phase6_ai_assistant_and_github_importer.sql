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
