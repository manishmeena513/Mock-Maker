"use client";

import React, { useState } from "react";
import {
  Check,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Crown,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui/primitives";
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

      // If live Razorpay SDK is loaded and a real key is configured, open Razorpay modal
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
          theme: { color: "#1d4ed8" },
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
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex flex-col items-center gap-2">
        <div
          role="group"
          aria-label="Billing Cycle Toggle"
          className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-white dark:bg-[#131c2e] text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              billingCycle === "yearly"
                ? "bg-white dark:bg-[#131c2e] text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Yearly Pass</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600 text-white">
              Save up to ₹189/yr
            </span>
          </button>
        </div>
        {validUntil && normalizedCurrent !== "FREE" && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Active <strong className="text-slate-800 dark:text-slate-200">{normalizedCurrent}</strong> subscription valid until{" "}
            {new Date(validUntil).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* 3-Tier Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* 1. FREE PLAN */}
        <Card className="p-6 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#131c2e] border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Free</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Essential daily practice &amp; PYQ verification
                </p>
              </div>
              <Badge variant="default">STARTER</Badge>
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-slate-200 dark:border-slate-800">
              <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₹0
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / {billingCycle === "yearly" ? "year" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>3 Mock Tests</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Up to <strong>20 Saved Questions</strong> in Revision Hub</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>2 Retest Drills</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Core Competitive Examinations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Standard score &amp; accuracy summary</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              disabled
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
            >
              {normalizedCurrent === "FREE" ? "Current Active Plan" : "Included Free Tier"}
            </button>
          </div>
        </Card>

        {/* 2. PRO PLAN */}
        <Card className="p-6 sm:p-7 border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-[#131c2e] flex flex-col justify-between relative shadow-md">
          <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs">
            Most Popular
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Pro</span>
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Deep subject, topic &amp; mistake analytics
                </p>
              </div>
              {billingCycle === "yearly" && (
                <Badge variant="success">Save ₹109/yr</Badge>
              )}
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-slate-200 dark:border-slate-800">
              <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₹{billingCycle === "yearly" ? "599" : "59"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / {billingCycle === "yearly" ? "year (₹49.9/mo)" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>20 Mock Tests</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Up to <strong>300 Saved Questions</strong></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>15 Retest Drills</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>Custom PYQ / Model Ratios</strong> (100/0 to 0/100)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>Subject, Topic &amp; 7-Category Mistake</strong> Analytics</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
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
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingPlan?.startsWith("pro_") ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Pro...</span>
                </>
              ) : normalizedCurrent === "PRO" ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Current Active Plan</span>
                </>
              ) : normalizedCurrent === "ELITE" ? (
                <span>Included in Elite</span>
              ) : (
                <>
                  <span>Upgrade to Pro — ₹{billingCycle === "yearly" ? "599/yr" : "59/mo"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Instant activation • UPI, Cards &amp; NetBanking
            </p>
          </div>
        </Card>

        {/* 3. ELITE PLAN */}
        <Card className="p-6 sm:p-7 border border-amber-500/70 dark:border-amber-500/60 bg-white dark:bg-[#131c2e] flex flex-col justify-between relative">
          <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-xs">
            Unlimited Access
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Elite</span>
                  <Crown className="w-4 h-4 text-amber-500" />
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Unrestricted mocks, all 22 exams &amp; full history
                </p>
              </div>
              {billingCycle === "yearly" && (
                <Badge variant="warning">Save ₹189/yr</Badge>
              )}
            </div>

            <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-slate-200 dark:border-slate-800">
              <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₹{billingCycle === "yearly" ? "999" : "99"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / {billingCycle === "yearly" ? "year (₹83.2/mo)" : "month"}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong>Unlimited Mock Tests</strong> (No daily cap)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong>Unlimited Saved Questions</strong> &amp; Bookmarks</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong>Unlimited Retest Drills</strong> from Mistake Pool</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong>All 22 Competitive Exams</strong> Unlocked</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong>Complete Analytics History</strong> &amp; Difficulty Telemetry</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Priority AI Question Generation &amp; New Exam Releases</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={() => handleSubscribe("ELITE")}
              disabled={normalizedCurrent === "ELITE" || Boolean(loadingPlan)}
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingPlan?.startsWith("elite_") ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Elite...</span>
                </>
              ) : normalizedCurrent === "ELITE" ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Current Active Plan</span>
                </>
              ) : (
                <>
                  <span>Upgrade to Elite — ₹{billingCycle === "yearly" ? "999/yr" : "99/mo"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Instant activation • UPI, Cards &amp; NetBanking
            </p>
          </div>
        </Card>
      </div>

      {/* 3-Tier Feature Comparison Matrix */}
      <Card className="p-6 sm:p-8 bg-white dark:bg-[#131c2e] border-slate-200 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Complete Plan Specification Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Feature / Entitlement</th>
                <th className="py-3 px-4">Free (₹0)</th>
                <th className="py-3 px-4 text-blue-600 dark:text-blue-400">Pro (₹59/mo)</th>
                <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Elite (₹99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">Daily Mock Tests</td>
                <td className="py-3.5 px-4">3 / day</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">20 / day</td>
                <td className="py-3.5 px-4 font-semibold text-amber-600 dark:text-amber-400">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">Saved Questions Quota</td>
                <td className="py-3.5 px-4">20 questions</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">300 questions</td>
                <td className="py-3.5 px-4 font-semibold text-amber-600 dark:text-amber-400">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">Daily Retest Drills</td>
                <td className="py-3.5 px-4">2 / day</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">15 / day</td>
                <td className="py-3.5 px-4 font-semibold text-amber-600 dark:text-amber-400">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">Custom PYQ / Model Ratio</td>
                <td className="py-3.5 px-4">80/20 Default</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">100/0 to 0/100</td>
                <td className="py-3.5 px-4 font-semibold text-amber-600 dark:text-amber-400">100/0 to 0/100</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">Subject &amp; Topic Analytics</td>
                <td className="py-3.5 px-4">Basic Overview</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">Included</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">Included + Full History</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">7-Category Mistake Review</td>
                <td className="py-3.5 px-4">Summary</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">Full Diagnostic</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">Full Diagnostic</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">Examinations Access</td>
                <td className="py-3.5 px-4">Core Exams</td>
                <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">All Active Exams</td>
                <td className="py-3.5 px-4 font-semibold text-amber-600 dark:text-amber-400">All 22 Exams + Priority</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Payment History (if any) */}
      {transactions.length > 0 && (
        <Card className="p-6 bg-white dark:bg-[#131c2e] border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Your Payment &amp; Billing History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {new Date(tx.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {tx.plan_code}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-white">
                      ₹{(tx.amount_paise / 100).toFixed(0)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {tx.provider_order_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.status === "captured"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
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
        </Card>
      )}
    </div>
  );
}
