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
