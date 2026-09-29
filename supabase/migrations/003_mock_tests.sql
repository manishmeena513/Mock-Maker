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
