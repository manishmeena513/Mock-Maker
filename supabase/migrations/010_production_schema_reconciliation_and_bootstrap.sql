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
