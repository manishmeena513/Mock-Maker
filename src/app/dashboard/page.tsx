import React from "react";
import { redirect } from "next/navigation";
import { getUserAnalytics } from "@/lib/db";
import { getUserPlanStatus } from "@/lib/plans";
import { getVerifiedServerUser } from "@/lib/auth/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const verified = await getVerifiedServerUser();

  if (verified.isSupabaseConfigured && (!verified.authenticated || !verified.userId)) {
    redirect("/auth/login?redirectTo=%2Fdashboard");
  }

  const userId = verified.userId || "default-user";
  const userName = verified.name || "Aspirant";

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
