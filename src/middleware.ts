import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isRealSupabaseConfigured, sanitizeRedirectPath } from "@/lib/auth/url";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;
  const isCallbackRoute = path.startsWith("/auth/callback") || path.startsWith("/auth/confirm");

  // Always let the dedicated callback route handlers execute without middleware interference
  if (isCallbackRoute) {
    return response;
  }

  const isProtectedRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/revision") ||
    path.startsWith("/admin") ||
    path.startsWith("/test/");

  // Prevent browser Back button from serving stale authenticated pages after logout
  if (isProtectedRoute) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate"
    );
  }

  // If using placeholder credentials in local dev, allow requests through
  if (!isRealSupabaseConfigured()) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const applyPendingCookies = (targetResponse: NextResponse): NextResponse => {
    for (const { name, value, options } of pendingCookies) {
      targetResponse.cookies.set(name, value, options);
    }
    return targetResponse;
  };

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          if (isProtectedRoute) {
            response.headers.set(
              "Cache-Control",
              "private, no-store, no-cache, must-revalidate"
            );
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Fallback safety: if Supabase OAuth redirected to Site URL (e.g. "/?code=...") instead of "/auth/callback",
    // exchange the PKCE authorization code on the server right here and redirect with cookies preserved.
    const oauthCode = request.nextUrl.searchParams.get("code");
    if (oauthCode && !path.startsWith("/api/")) {
      const nextDest = sanitizeRedirectPath(
        request.nextUrl.searchParams.get("next") ||
          request.nextUrl.searchParams.get("redirectTo"),
        "/dashboard"
      );
      const { error: codeError } = await supabase.auth.exchangeCodeForSession(oauthCode);
      if (!codeError) {
        const redirectRes = NextResponse.redirect(new URL(nextDest, request.url));
        redirectRes.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
        return applyPendingCookies(redirectRes);
      }
    }

    // IMPORTANT: Always call getUser() for verified server-side JWT validation
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isGuestOnlyAuthPage = path === "/auth/login" || path === "/auth/signup";

    if (!user && isProtectedRoute) {
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("redirectTo", path);
      const redirectRes = NextResponse.redirect(redirectUrl);
      redirectRes.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
      return applyPendingCookies(redirectRes);
    }

    if (user && isGuestOnlyAuthPage) {
      const nextParam = sanitizeRedirectPath(
        request.nextUrl.searchParams.get("redirectTo") ||
          request.nextUrl.searchParams.get("next"),
        "/dashboard"
      );
      const redirectRes = NextResponse.redirect(new URL(nextParam, request.url));
      return applyPendingCookies(redirectRes);
    }
  } catch (error) {
    console.error("Supabase middleware error:", error);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
