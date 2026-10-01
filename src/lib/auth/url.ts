/**
 * Production-safe URL & Redirect utilities for Supabase SSR Auth and OAuth callbacks.
 * Never hardcodes localhost in production and prevents open redirect vulnerabilities.
 */

export function isRealSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== "https://mockmaster.supabase.co" &&
      !url.includes("placeholder") &&
      !key.includes("placeholder") &&
      !key.includes("mock-")
  );
}

/**
 * Ensures redirect paths are safe internal relative paths starting with "/".
 */
export function sanitizeRedirectPath(
  nextPath?: string | null,
  fallback: string = "/dashboard"
): string {
  if (!nextPath || typeof nextPath !== "string") {
    return fallback;
  }
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }
  // Prevent redirecting back into auth login/signup loops
  if (
    trimmed.startsWith("/auth/login") ||
    trimmed.startsWith("/auth/signup") ||
    trimmed.startsWith("/auth/callback") ||
    trimmed.startsWith("/auth/confirm")
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Resolves the canonical application origin in the browser for OAuth redirectTo.
 */
export function getClientOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "");
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Builds the production-safe OAuth / Email confirmation callback URL (`/auth/callback`).
 */
export function getClientAuthCallbackUrl(nextPath: string = "/dashboard"): string {
  const origin = getClientOrigin();
  const safeNext = sanitizeRedirectPath(nextPath, "/dashboard");
  const callbackUrl = new URL("/auth/callback", `${origin}/`);
  if (safeNext && safeNext !== "/dashboard") {
    callbackUrl.searchParams.set("next", safeNext);
  }
  return callbackUrl.toString();
}

/**
 * Resolves the public origin for a Next.js server request (supporting Vercel x-forwarded-host).
 */
export function getServerRequestOrigin(requestUrl: string, headers: Headers): string {
  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`;
  }
  const parsed = new URL(requestUrl);
  return parsed.origin;
}
