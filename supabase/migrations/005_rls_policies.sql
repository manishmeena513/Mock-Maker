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
