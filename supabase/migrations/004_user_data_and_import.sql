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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  total_attempted INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  accuracy DECIMAL NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS question_seen_log (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  seen_count INT NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS saved_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'important' CHECK (category IN ('important', 'difficult', 'revise_later')),
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS question_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
