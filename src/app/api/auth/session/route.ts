import { NextResponse } from "next/server";
import { getVerifiedServerUser } from "@/lib/auth/server";
import { getUserPlan } from "@/lib/db";

export async function GET() {
  let user: {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  } | null = null;
  let plan = "FREE";

  try {
    const verified = await getVerifiedServerUser();

    if (verified.authenticated && verified.userId) {
      const planInfo = await getUserPlan(verified.userId);
      plan = planInfo.plan === "PREMIUM" ? "PRO" : planInfo.plan;
      user = {
        id: verified.userId,
        email: verified.email || "aspirant@mockmaster.in",
        name: verified.name || "Aspirant",
        role: verified.role,
      };
    }
  } catch {
    user = null;
    plan = "FREE";
  }

  return NextResponse.json(
    {
      authenticated: Boolean(user),
      user,
      plan,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    }
  );
}
