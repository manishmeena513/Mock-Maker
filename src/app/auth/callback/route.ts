import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  getServerRequestOrigin,
  isRealSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/auth/url";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getServerRequestOrigin(request.url, request.headers);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") || searchParams.get("redirectTo") || "/dashboard";
  const safeNext = sanitizeRedirectPath(nextParam, "/dashboard");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  if (oauthError) {
    const loginErrorUrl = new URL("/auth/login", `${origin}/`);
    loginErrorUrl.searchParams.set("error", oauthError);
    if (safeNext !== "/dashboard") {
      loginErrorUrl.searchParams.set("redirectTo", safeNext);
    }
    return NextResponse.redirect(loginErrorUrl);
  }

  if (!isRealSupabaseConfigured()) {
    return NextResponse.redirect(new URL(safeNext, `${origin}/`));
  }

  const cookieStore = await cookies();
  const cookiesToApply: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToApply.push({ name, value, options });
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Still applied to redirectResponse below
            }
          });
        },
      },
    }
  );

  const buildRedirectResponse = (targetUrl: URL): NextResponse => {
    const response = NextResponse.redirect(targetUrl);
    response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    for (const { name, value, options } of cookiesToApply) {
      response.cookies.set(name, value, options);
    }
    return response;
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return buildRedirectResponse(new URL(safeNext, `${origin}/`));
    }
    const loginErrorUrl = new URL("/auth/login", `${origin}/`);
    loginErrorUrl.searchParams.set(
      "error",
      error.message || "Unable to complete Google sign-in. Please try again."
    );
    if (safeNext !== "/dashboard") {
      loginErrorUrl.searchParams.set("redirectTo", safeNext);
    }
    return buildRedirectResponse(loginErrorUrl);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return buildRedirectResponse(new URL(safeNext, `${origin}/`));
    }
    const loginErrorUrl = new URL("/auth/login", `${origin}/`);
    loginErrorUrl.searchParams.set(
      "error",
      error.message || "Email verification link expired or invalid. Please sign in."
    );
    return buildRedirectResponse(loginErrorUrl);
  }

  // If neither code nor token_hash was present, check if user already has a valid session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return buildRedirectResponse(new URL(safeNext, `${origin}/`));
  }

  const loginUrl = new URL("/auth/login", `${origin}/`);
  if (safeNext !== "/dashboard") {
    loginUrl.searchParams.set("redirectTo", safeNext);
  }
  return buildRedirectResponse(loginUrl);
}
