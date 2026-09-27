import React from "react";
import { getUserAnalytics } from "@/lib/db";
import { getUserPlanStatus } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  let userId = "default-user";
  let userName = "Aspirant";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
      const metaName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0];
      if (metaName) userName = String(metaName);
    }
  } catch {
    // fallback to default-user in local demo mode
  }

  const [analytics, planStatus] = await Promise.all([
    getUserAnalytics(userId),
    getUserPlanStatus(userId),
  ]);

  // Empty state label when user has no completed mocks ("No enough data yet")
  const emptyStateLabel = "No enough data yet";

  return (
    <DashboardClient
      userName={userName}
      analytics={analytics}
      planStatus={planStatus}
      emptyStateLabel={emptyStateLabel}
    />
  );
}
