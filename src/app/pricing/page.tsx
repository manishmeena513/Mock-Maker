import { Metadata } from "next";
import { PricingClient } from "@/components/pricing/PricingClient";
import { getUserPlanStatus } from "@/lib/plans/limits";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing & Plans — Transparent, Serious Exam Preparation",
  description:
    "Choose between our generous Free plan or Premium for unlimited authentic mock test generation, topic mastery tracking, and unlimited revision bookmarks.",
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
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Transparent Pricing
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Straightforward Plans for Serious Aspirants
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          No games, streaks, or fake points. Authentic 80:20 mocks designed to help you clear prelims with confidence.
        </p>
      </div>

      <PricingClient currentPlan={planStatus.plan} userEmail={userEmail} />
    </div>
  );
}
