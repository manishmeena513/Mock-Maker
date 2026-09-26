import { Metadata } from "next";
import { PricingClient } from "@/components/pricing/PricingClient";
import { getUserPlanStatus } from "@/lib/plans/limits";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing & Plans — Transparent, Serious Exam Preparation",
  description:
    "Choose between our Free Aspirant plan or Pro for unlimited authentic mock test generation, topic mastery tracking, and unlimited revision bookmarks.",
};

export default async function PricingPage() {
  let userId = "default-user";
  let userEmail = "";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
      userEmail = user.email || "";
    }
  } catch {
    // fallback
  }

  const planStatus = await getUserPlanStatus(userId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Transparent Academic Plans
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
          Straightforward Plans for Serious Aspirants
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
          No streaks, leaderboards, or artificial points. Authentic 80:20 PYQ + Model mock tests engineered for competitive preliminary examinations.
        </p>
      </div>

      <PricingClient currentPlan={planStatus.plan} userEmail={userEmail} />
    </div>
  );
}
