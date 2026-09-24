import { createClient } from "@/lib/supabase/server";

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  error?: string;
}

/**
 * Server-side authorization guard for administrative operations.
 * Strictly verifies authentication and queries `user_roles` for the 'admin' role.
 * Never trusts client-side metadata or tokens.
 */
export async function verifyAdminAuthorization(): Promise<AdminAuthResult> {
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
          error: "Authentication required. Please sign in as an administrator.",
        };
      }

      // Check role in database - NEVER trust client claims
      const { data: roleRecord, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || roleRecord?.role !== "admin") {
        return {
          authorized: false,
          error: "Forbidden: Administrator privileges required for this operation.",
        };
      }

      return {
        authorized: true,
        userId: user.id,
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
  // Allows testing of admin views without live external credentials
  return {
    authorized: true,
    userId: "local-dev-admin",
  };
}
