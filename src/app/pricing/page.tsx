import { Metadata } from "next";
import { PricingClient } from "@/components/pricing/PricingClient";
import { getUserPlanStatus } from "@/lib/plans/limits";
import { getUserPaymentTransactions } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing & Plans — Free, Pro (₹59/mo) & Elite (₹99/mo)",
  description:
    "Choose between Free, Pro (₹59/month or ₹599/year), and Elite (₹99/month or ₹999/year) plans for authentic PYQ + Model competitive exam preparation.",
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

  const [planStatus, transactions] = await Promise.all([
    getUserPlanStatus(userId),
    getUserPaymentTransactions(userId),
  ]);

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="max-w-2xl space-y-3 pb-6 border-b border-[var(--border)]">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>Academic Subscriptions</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Student-Friendly Pricing for Serious Preparation
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
          Start free, upgrade to Pro at ₹59/month for deep subject &amp; mistake analytics, or unlock unrestricted preparation across all 22 exams with Elite at ₹99/month.
        </p>
      </div>

      <PricingClient
        currentPlan={planStatus.plan}
        validUntil={planStatus.validUntil}
        userEmail={userEmail}
        transactions={transactions}
      />
    </div>
  );
}
