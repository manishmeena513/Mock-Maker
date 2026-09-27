import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const planInfo = await getUserPlan(authUser.id);
      plan = planInfo.plan === "PREMIUM" ? "PRO" : planInfo.plan;
      user = {
        id: authUser.id,
        email: authUser.email || "aspirant@mockmaster.in",
        name:
          (authUser.user_metadata?.full_name as string) ||
          (authUser.user_metadata?.name as string) ||
          authUser.email?.split("@")[0] ||
          "Aspirant",
        role:
          (authUser.user_metadata?.role as "user" | "admin") ||
          (authUser.email?.includes("admin") ? "admin" : "user"),
      };
    } else {
      const planInfo = await getUserPlan("default-user");
      plan = planInfo.plan === "PREMIUM" ? "PRO" : planInfo.plan;
    }
  } catch {
    const planInfo = await getUserPlan("default-user");
    plan = planInfo.plan === "PREMIUM" ? "PRO" : planInfo.plan;
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
