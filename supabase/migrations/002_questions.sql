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
