import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If using placeholder credentials in local dev, allow requests through
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseKey === "mock-anon-key-placeholder" ||
    supabaseKey === "mock-anon-key"
  ) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
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

    // IMPORTANT: Always call getUser() for secure JWT verification
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthRoute = path.startsWith("/auth");

    if (!user && isProtectedRoute) {
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("redirectTo", path);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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
