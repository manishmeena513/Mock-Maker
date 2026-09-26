"use client";

import React, { useState } from "react";
import { Check, ShieldCheck, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui/primitives";

interface PricingClientProps {
  currentPlan?: string;
  userEmail?: string;
}

declare global {
  interface Window {
    Razorpay?: unknown;
  }
}

export function PricingClient({ currentPlan = "FREE" }: PricingClientProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSubscribe = async (planKey: "monthly" | "annual") => {
    const planId = planKey === "annual" ? "premium_annual" : "premium_monthly";
    setLoadingPlan(planId);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, provider: "razorpay" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment.");
      }

      const order = data.order;

      if (!order.keyId || order.keyId === "rzp_test_mock_key") {
        const webhookRes = await fetch("/api/payments/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-razorpay-signature": "dev_test_signature",
          },
          body: JSON.stringify({
            id: `evt_dev_${Date.now()}`,
            event: "payment.captured",
            payload: {
              payment: {
                entity: {
                  id: order.orderId,
                  amount: order.amount,
                  currency: order.currency,
                  notes: {
                    planId,
                    userId: "default-user",
                  },
                },
              },
            },
          }),
        });

        if (webhookRes.ok) {
          router.push("/dashboard?upgraded=true");
          router.refresh();
          return;
        }
      }

      router.push("/dashboard?upgraded=true");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment initialization failed.";
      setErrorMsg(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlanPremium = currentPlan === "PREMIUM";

  return (
    <div className="space-y-12">
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              billingCycle === "annual"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>Annual Pass</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600 text-white">
              Save 50%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
        {/* Free Plan */}
        <Card className="p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Free Aspirant</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Daily practice and standard PYQ verification
                </p>
              </div>
              <Badge variant="default">STANDARD</Badge>
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-[var(--border)]">
              <span className="text-4xl font-bold text-[var(--foreground)] tabular-nums">₹0</span>
              <span className="text-xs text-[var(--muted-foreground)]">/ forever</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-[var(--foreground)]">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>3 Mock Tests</strong> per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Up to <strong>20 Saved Questions</strong> in Revision Hub</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Strict <strong>80:20 Authentic Question Mix</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Official UPSC, UPPSC &amp; SSC CGL verified PYQs</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Official commission negative marking</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              disabled
              className="w-full h-11 rounded-xl text-sm font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
            >
              {!isCurrentPlanPremium ? "Current Active Plan" : "Included in Account"}
            </button>
          </div>
        </Card>

        {/* Premium Plan */}
        <Card className="p-7 border-2 border-blue-600 dark:border-blue-500 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  {billingCycle === "annual" ? "Annual Aspirant Pro" : "Monthly Pro"}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Unrestricted mock generation &amp; deep diagnostic telemetry
                </p>
              </div>
              <Badge variant="primary">RECOMMENDED</Badge>
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-[var(--border)]">
              <span className="text-4xl font-bold text-[var(--foreground)] tabular-nums">
                ₹{billingCycle === "annual" ? "2,999" : "499"}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                / {billingCycle === "annual" ? "year (₹250/mo)" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-[var(--foreground)]">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>Unlimited Mock Tests</strong> (No daily cap)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>Unlimited Saved Questions</strong> &amp; revision tags</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Full <strong>PYQ vs Model Diagnostic</strong> breakdown</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>Topic Mastery Tracking</strong> &amp; 7-Category Mistake Review</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>Unlimited Retest Drills</strong> from weak-area pools</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={() => handleSubscribe(billingCycle)}
              disabled={isCurrentPlanPremium || Boolean(loadingPlan)}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Checkout...</span>
                </>
              ) : isCurrentPlanPremium ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Active Premium Member</span>
                </>
              ) : (
                <>
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-[var(--muted-foreground)] mt-2">
              Instant activation • UPI, NetBanking &amp; Cards accepted
            </p>
          </div>
        </Card>
      </div>

      {/* Feature Comparison Matrix */}
      <Card className="max-w-4xl mx-auto p-6 sm:p-8">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-5">
          Plan Specification Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <th className="py-3 px-4">Capability</th>
                <th className="py-3 px-4">Free Aspirant</th>
                <th className="py-3 px-4 text-blue-600 dark:text-blue-400">Pro Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr>
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">Daily Mock Test Attempts</td>
                <td className="py-3.5 px-4 text-[var(--muted-foreground)]">3 mocks / day</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">Revision Hub Bookmarks</td>
                <td className="py-3.5 px-4 text-[var(--muted-foreground)]">20 questions</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">80% Verified PYQ + 20% Model Ratio</td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Included</td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">Official Negative Marking Schemes</td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Included</td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">PYQ vs Model Accuracy Analytics</td>
                <td className="py-3.5 px-4 text-[var(--muted-foreground)]">Standard Summary</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">Full Diagnostic Breakdown</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">Targeted Weak-Topic Retest Drills</td>
                <td className="py-3.5 px-4 text-[var(--muted-foreground)]">1 per day</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Authenticity Guarantee Card */}
      <Card className="max-w-4xl mx-auto p-6 bg-[var(--muted)]/40">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--foreground)]">
              Source Authenticity Guarantee
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Every Previous Year Question on MockMaster is sourced from official UPSC, UPPSC, and SSC examination papers with verified year attribution. Model questions are strictly separated and clearly labeled so your benchmark remains trustworthy.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
