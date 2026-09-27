import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Even if Supabase signOut fails or is in dev mode, proceed to clear cookies cleanly
  }

  const response = NextResponse.json(
    { success: true, loggedOut: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    }
  );

  // Clear any Supabase auth cookies or custom session cookies
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name.includes("auth-token") ||
      cookie.name === "mockmaster_session"
    ) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }

  return response;
}
