import { createClient } from "@/lib/supabase/server";
import { isRealSupabaseConfigured } from "./url";

export interface VerifiedServerUser {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string;
  role: "user" | "admin";
  isSupabaseConfigured: boolean;
}

/**
 * Authoritative server-side authentication check using `supabase.auth.getUser()`.
 * Never relies on unverified `getSession()` or client-supplied user IDs.
 */
export async function getVerifiedServerUser(): Promise<VerifiedServerUser> {
  const configured = isRealSupabaseConfigured();

  if (!configured) {
    return {
      authenticated: true,
      userId: "default-user",
      email: "aspirant@mockmaster.in",
      name: "Aspirant",
      role: "admin",
      isSupabaseConfigured: false,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authenticated: false,
        userId: null,
        email: null,
        name: "Guest",
        role: "user",
        isSupabaseConfigured: true,
      };
    }

    const email = user.email || "";
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      (email ? email.split("@")[0] : "Aspirant");

    let role: "user" | "admin" = "user";

    // Check authoritative public.user_roles table
    try {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleRow?.role === "admin") {
        role = "admin";
      }
    } catch {
      // ignore if user_roles query fails
    }

    if (role !== "admin") {
      const adminEmailsRaw = process.env.ADMIN_EMAILS || "";
      const allowedAdminEmails = adminEmailsRaw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (email && allowedAdminEmails.includes(email.toLowerCase())) {
        role = "admin";
      }
    }

    return {
      authenticated: true,
      userId: user.id,
      email: email || null,
      name: String(name),
      role,
      isSupabaseConfigured: true,
    };
  } catch {
    return {
      authenticated: false,
      userId: null,
      email: null,
      name: "Guest",
      role: "user",
      isSupabaseConfigured: true,
    };
  }
}
