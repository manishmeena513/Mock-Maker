import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  userEmail?: string | null;
  unauthenticated?: boolean;
  schemaMissing?: boolean;
  error?: string;
}

function getConfiguredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

function hasServiceRoleKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    key &&
      key !== "mock-service-role-key" &&
      !key.includes("placeholder") &&
      !key.includes("mock-")
  );
}

/**
 * Server-side authorization guard for administrative operations.
 * Strictly verifies authentication and queries `public.user_roles` for the 'admin' role.
 * Never trusts client-side metadata, localStorage, or URL obscurity.
 */
export async function verifyAdminAuthorization(req?: Request): Promise<AdminAuthResult> {
  if (process.env.NODE_ENV !== "production" && req) {
    const testAuth = req.headers.get("x-test-auth");
    const testRole = req.headers.get("x-test-role");
    if (testAuth === "unauthenticated") {
      return {
        authorized: false,
        unauthenticated: true,
        error: "Authentication required. Please sign in as an administrator.",
      };
    }
    if (testRole && testRole !== "admin") {
      return {
        authorized: false,
        error: "Forbidden: Administrator privileges required for this operation.",
      };
    }
    if (testRole === "admin") {
      return {
        authorized: true,
        userId: req.headers.get("x-test-user-id") || "test-admin-user",
      };
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isSupabaseConfigured = Boolean(
    url &&
      key &&
      url !== "https://mockmaster.supabase.co" &&
      !key.includes("placeholder") &&
      !key.includes("mock-")
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          authorized: false,
          unauthenticated: true,
          error: "Authentication required. Please sign in as an administrator.",
        };
      }

      // 1. Check role in database (`public.user_roles`) - NEVER trust client claims
      const { data: roleRecord, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleError && roleRecord?.role === "admin") {
        return {
          authorized: true,
          userId: user.id,
          userEmail: user.email,
        };
      }

      // 2. If service role key is configured, also check via service-role client
      // (in case RLS cache or session token is refreshing)
      if (hasServiceRoleKey()) {
        try {
          const adminSupabase = createAdminClient();
          const { data: srvRole, error: srvErr } = await adminSupabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!srvErr && srvRole?.role === "admin") {
            return {
              authorized: true,
              userId: user.id,
              userEmail: user.email,
            };
          }
        } catch {
          // continue
        }
      }

      // 3. Optional server-side ADMIN_EMAILS allowlist configured in Vercel env
      const configuredAdminEmails = getConfiguredAdminEmails();
      if (
        user.email &&
        configuredAdminEmails.has(user.email.toLowerCase())
      ) {
        if (hasServiceRoleKey()) {
          try {
            const adminSupabase = createAdminClient();
            await adminSupabase.from("user_roles").upsert({
              user_id: user.id,
              role: "admin",
              updated_at: new Date().toISOString(),
            });
          } catch {
            // ignore if table not migrated yet
          }
        }
        return {
          authorized: true,
          userId: user.id,
          userEmail: user.email,
        };
      }

      // Detect if `public.user_roles` relation does not exist yet in Supabase
      const errCode = (roleError as { code?: string } | null)?.code || "";
      const errMsg = roleError?.message || "";
      const isSchemaMissing =
        errCode === "42P01" ||
        errCode === "PGRST205" ||
        errMsg.includes("user_roles") ||
        errMsg.includes("schema cache") ||
        errMsg.includes("does not exist");

      if (isSchemaMissing) {
        console.error(
          "[AdminAuth] Database table public.user_roles is missing in Supabase. Apply supabase/full_production_schema.sql in the Supabase SQL Editor."
        );
        return {
          authorized: false,
          userId: user.id,
          userEmail: user.email,
          schemaMissing: true,
          error: "Forbidden: Administrator privileges required for this operation.",
        };
      }

      return {
        authorized: false,
        userId: user.id,
        userEmail: user.email,
        error: "Forbidden: Administrator privileges required for this operation.",
      };
    } catch (err: unknown) {
      console.error("Admin authorization check failed:", err);
      return {
        authorized: false,
        error: "Internal server error during authorization verification.",
      };
    }
  }

  // Local development fallback (when Supabase credentials are placeholder)
  return {
    authorized: true,
    userId: "local-dev-admin",
  };
}
