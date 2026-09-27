"use client";

import React, { useState } from "react";
import {
  Check,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PaymentTransaction } from "@/types/database";

interface PricingClientProps {
  currentPlan?: string;
  validUntil?: string | null;
  userEmail?: string;
  transactions?: PaymentTransaction[];
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export function PricingClient({
  currentPlan = "FREE",
  validUntil = null,
  userEmail = "",
  transactions = [],
}: PricingClientProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const normalizedCurrent =
    currentPlan === "PREMIUM" ? "PRO" : (currentPlan || "FREE").toUpperCase();

  const handleSubscribe = async (tier: "PRO" | "ELITE") => {
    const planId =
      tier === "PRO"
        ? billingCycle === "yearly"
          ? "pro_yearly"
          : "pro_monthly"
        : billingCycle === "yearly"
        ? "elite_yearly"
        : "elite_monthly";

    setLoadingPlan(planId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, provider: "razorpay" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment order.");
      }

      const order = data.order;

      if (
        typeof window !== "undefined" &&
        window.Razorpay &&
        order.keyId &&
        order.keyId !== "rzp_test_mock_key"
      ) {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "MockMaster",
          description: `${tier} Plan (${billingCycle === "yearly" ? "Annual" : "Monthly"})`,
          order_id: order.orderId,
          prefill: { email: userEmail || undefined },
          theme: { color: "#a66e1e" },
          handler: async (response) => {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              setErrorMsg(verifyData.error || "Payment verification failed.");
              setLoadingPlan(null);
              return;
            }
            setSuccessMsg(`Successfully upgraded to ${tier} Plan!`);
            setLoadingPlan(null);
            router.push(`/dashboard?upgraded=${tier.toLowerCase()}`);
            router.refresh();
          },
          modal: {
            ondismiss: () => setLoadingPlan(null),
          },
        });
        rzp.open();
        return;
      }

      // Sandbox / Dev instant verification flow
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          paymentId: `pay_${Date.now()}`,
          signature: "mock_verified_signature",
          planId,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Payment verification failed.");
      }

      setSuccessMsg(`Upgraded to ${tier} (${billingCycle}) plan!`);
      router.push(`/dashboard?upgraded=${tier.toLowerCase()}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment initialization failed.";
      setErrorMsg(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-12">
      {errorMsg && (
        <div className="p-4 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-md bg-[var(--sage-muted)] border border-[var(--sage)]/30 text-[var(--sage)] text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Billing Cycle Toggle"
          className="inline-flex items-center p-1 rounded-md bg-[var(--muted)] border border-[var(--border)] self-start"
        >
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              billingCycle === "yearly"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>Yearly Pass</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--accent-muted)] text-[var(--accent)]">
              Save up to ₹189/yr
            </span>
          </button>
        </div>

        {validUntil && normalizedCurrent !== "FREE" && (
          <p className="text-xs font-mono text-[var(--muted-foreground)]">
            Active <strong className="text-[var(--foreground)]">{normalizedCurrent}</strong> subscription valid until{" "}
            {new Date(validUntil).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Editorial 3-Tier Plan Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* 1. FREE PLAN */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-semibold text-[var(--foreground)]">
                  Free
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Daily practice &amp; PYQ verification
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--muted)] text-[var(--muted-foreground)]">
                Starter
              </span>
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-[var(--border)]">
              <span className="font-display text-4xl font-semibold text-[var(--foreground)] tabular-nums">
                ₹0
              </span>
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                / {billingCycle === "yearly" ? "year" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-[var(--foreground)]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>3 Mock Tests</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span>Up to <strong>20 Saved Questions</strong> in Revision Hub</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>2 Retest Drills</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span>Core Competitive Examinations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span>Standard score &amp; accuracy summary</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              disabled
              className="w-full h-10 rounded-md text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
            >
              {normalizedCurrent === "FREE" ? "Current Active Plan" : "Included Free Tier"}
            </button>
          </div>
        </div>

        {/* 2. PRO PLAN */}
        <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)] p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-semibold text-[var(--foreground)]">
                  Pro
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Subject, topic &amp; mistake analytics
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--muted)] text-[var(--foreground)]">
                ₹59/month | ₹599/year
              </span>
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-[var(--border)]">
              <span className="font-display text-4xl font-semibold text-[var(--foreground)] tabular-nums">
                ₹{billingCycle === "yearly" ? "599" : "59"}
              </span>
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                / {billingCycle === "yearly" ? "year" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-[var(--foreground)]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>20 Mock Tests</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span>Up to <strong>300 Saved Questions</strong></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>15 Retest Drills</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>Custom PYQ / Model Ratios</strong> (100/0 to 0/100)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>Subject, Topic &amp; 7-Category Mistake</strong> Analytics</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
                <span><strong>PYQ vs Model</strong> Diagnostic Comparison</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={() => handleSubscribe("PRO")}
              disabled={
                normalizedCurrent === "PRO" ||
                normalizedCurrent === "ELITE" ||
                Boolean(loadingPlan)
              }
              className="w-full h-10 rounded-md text-xs font-medium border border-[var(--foreground)] bg-transparent hover:bg-[var(--muted)] text-[var(--foreground)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingPlan?.startsWith("pro_") ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Pro...</span>
                </>
              ) : normalizedCurrent === "PRO" ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Current Active Plan</span>
                </>
              ) : normalizedCurrent === "ELITE" ? (
                <span>Included in Elite</span>
              ) : (
                <>
                  <span>Select Pro — ₹{billingCycle === "yearly" ? "599/yr" : "59/mo"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. ELITE PLAN (Highlighted with subtle warm gold accent border) */}
        <div className="rounded-lg border-2 border-[var(--accent)] bg-[var(--card)] p-6 sm:p-7 flex flex-col justify-between relative">
          <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--accent)] text-white">
            Recommended • Unlimited
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-semibold text-[var(--foreground)]">
                  Elite
                </h3>
                <p className="text-xs text-[var(--accent)] mt-0.5">
                  Unrestricted mocks, all 22 exams &amp; full archive
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-muted)] text-[var(--accent)]">
                ₹99/month | ₹999/year
              </span>
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-[var(--border)]">
              <span className="font-display text-4xl font-semibold text-[var(--foreground)] tabular-nums">
                ₹{billingCycle === "yearly" ? "999" : "99"}
              </span>
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                / {billingCycle === "yearly" ? "year" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-[var(--foreground)]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span><strong>Unlimited Mock Tests</strong> (No daily cap)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span><strong>Unlimited Saved Questions</strong> &amp; Bookmarks</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span><strong>Unlimited Retest Drills</strong> from Mistake Pool</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span><strong>All 22 Competitive Exams</strong> Unlocked</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span><strong>Complete Analytics History</strong> &amp; Difficulty Telemetry</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span>Priority AI Question Generation &amp; New Exam Releases</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={() => handleSubscribe("ELITE")}
              disabled={normalizedCurrent === "ELITE" || Boolean(loadingPlan)}
              className="w-full h-10 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingPlan?.startsWith("elite_") ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Elite...</span>
                </>
              ) : normalizedCurrent === "ELITE" ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Current Active Plan</span>
                </>
              ) : (
                <>
                  <span>Upgrade to Elite — ₹{billingCycle === "yearly" ? "999/yr" : "99/mo"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Comparison Table */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Plan Specification Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                <th className="py-3.5 px-5">Entitlement</th>
                <th className="py-3.5 px-4">Free (₹0)</th>
                <th className="py-3.5 px-4 text-[var(--foreground)]">Pro (₹59/mo)</th>
                <th className="py-3.5 px-5 text-[var(--accent)]">Elite (₹99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--muted-foreground)]">
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">Daily Mock Tests</td>
                <td className="py-3.5 px-4 font-mono">3 / day</td>
                <td className="py-3.5 px-4 font-mono text-[var(--foreground)]">20 / day</td>
                <td className="py-3.5 px-5 font-mono font-semibold text-[var(--accent)]">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">Saved Questions Quota</td>
                <td className="py-3.5 px-4 font-mono">20 questions</td>
                <td className="py-3.5 px-4 font-mono text-[var(--foreground)]">300 questions</td>
                <td className="py-3.5 px-5 font-mono font-semibold text-[var(--accent)]">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">Daily Retest Drills</td>
                <td className="py-3.5 px-4 font-mono">2 / day</td>
                <td className="py-3.5 px-4 font-mono text-[var(--foreground)]">15 / day</td>
                <td className="py-3.5 px-5 font-mono font-semibold text-[var(--accent)]">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">Custom PYQ / Model Ratio</td>
                <td className="py-3.5 px-4 font-mono">80/20 Default</td>
                <td className="py-3.5 px-4 font-mono text-[var(--foreground)]">100/0 to 0/100</td>
                <td className="py-3.5 px-5 font-mono font-semibold text-[var(--accent)]">100/0 to 0/100</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">Subject &amp; Topic Analytics</td>
                <td className="py-3.5 px-4">Overview</td>
                <td className="py-3.5 px-4 text-[var(--sage)] font-medium">Included</td>
                <td className="py-3.5 px-5 text-[var(--sage)] font-medium">Included + Full History</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">7-Category Mistake Review</td>
                <td className="py-3.5 px-4">Summary</td>
                <td className="py-3.5 px-4 text-[var(--sage)] font-medium">Full Diagnostic</td>
                <td className="py-3.5 px-5 text-[var(--sage)] font-medium">Full Diagnostic</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">Examinations Access</td>
                <td className="py-3.5 px-4">Core Exams</td>
                <td className="py-3.5 px-4 text-[var(--foreground)]">All Active Exams</td>
                <td className="py-3.5 px-5 font-semibold text-[var(--accent)]">All 22 Exams + Priority</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* User Payment History (if any) */}
      {transactions.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Payment &amp; Billing History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 px-5 text-[var(--muted-foreground)]">
                      {new Date(tx.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--foreground)]">
                      {tx.plan_code}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--foreground)]">
                      ₹{(tx.amount_paise / 100).toFixed(0)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--muted-foreground)]">
                      {tx.provider_order_id}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          tx.status === "captured"
                            ? "bg-[var(--sage-muted)] text-[var(--sage)]"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
