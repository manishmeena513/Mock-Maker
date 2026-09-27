import { PlanLimits, PYQ_MODEL_RATIOS, UserPlanType } from "@/types/database";

export type CanonicalPlanId = "FREE" | "PRO" | "ELITE";

export type CheckoutPlanId =
  | "pro_monthly"
  | "pro_yearly"
  | "elite_monthly"
  | "elite_yearly"
  | "premium_monthly"
  | "premium_annual";

export interface PlanCheckoutConfig {
  id: CheckoutPlanId;
  code: "PRO_MONTHLY" | "PRO_YEARLY" | "ELITE_MONTHLY" | "ELITE_YEARLY";
  tier: CanonicalPlanId;
  name: string;
  priceInr: number;
  amountPaise: number;
  interval: "month" | "year";
  intervalCount: number;
  savingsLabel?: string;
  description: string;
  features: string[];
}

export function normalizePlanTier(plan?: UserPlanType | string | null): CanonicalPlanId {
  const upper = (plan || "FREE").toString().toUpperCase();
  if (upper === "ELITE" || upper === "PREMIUM") return "ELITE";
  if (upper === "PRO") return "PRO";
  return "FREE";
}

export const FREE_PLAN_LIMITS: PlanLimits = {
  plan: "FREE",
  dailyMockLimit: 3,
  maxMocksPerDay: 3,
  maxSavedQuestions: 20,
  maxDrillQuestions: 15,
  dailyRetestLimit: 2,
  hasAdvancedAnalytics: false,
  hasDetailedExplanations: true,
  allowAiGeneration: false,
  canGenerateAIQuestions: false,
  dailyAiGenerationLimit: 0,
  allowedPyqRatios: [...PYQ_MODEL_RATIOS],
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  plan: "PRO",
  dailyMockLimit: 20,
  maxMocksPerDay: 20,
  maxSavedQuestions: 300,
  maxDrillQuestions: 50,
  dailyRetestLimit: 15,
  hasAdvancedAnalytics: true,
  hasDetailedExplanations: true,
  allowAiGeneration: true,
  canGenerateAIQuestions: true,
  dailyAiGenerationLimit: 25,
  allowedPyqRatios: [...PYQ_MODEL_RATIOS],
};

export const ELITE_PLAN_LIMITS: PlanLimits = {
  plan: "ELITE",
  dailyMockLimit: Infinity,
  maxMocksPerDay: Infinity,
  maxSavedQuestions: Infinity,
  maxDrillQuestions: 100,
  dailyRetestLimit: Infinity,
  hasAdvancedAnalytics: true,
  hasDetailedExplanations: true,
  allowAiGeneration: true,
  canGenerateAIQuestions: true,
  dailyAiGenerationLimit: 100,
  allowedPyqRatios: [...PYQ_MODEL_RATIOS],
};

export const PLAN_LIMITS: Record<UserPlanType, PlanLimits> = {
  FREE: FREE_PLAN_LIMITS,
  PRO: PRO_PLAN_LIMITS,
  ELITE: ELITE_PLAN_LIMITS,
  PREMIUM: { ...ELITE_PLAN_LIMITS, plan: "PREMIUM" },
  free: FREE_PLAN_LIMITS,
  pro: PRO_PLAN_LIMITS,
  elite: ELITE_PLAN_LIMITS,
  premium: { ...ELITE_PLAN_LIMITS, plan: "PREMIUM" },
};

export const CHECKOUT_PLANS: Record<CheckoutPlanId, PlanCheckoutConfig> = {
  pro_monthly: {
    id: "pro_monthly",
    code: "PRO_MONTHLY",
    tier: "PRO",
    name: "Pro Monthly",
    priceInr: 59,
    amountPaise: 5900,
    interval: "month",
    intervalCount: 1,
    description: "Expanded mock tests, subject/topic analytics, and mistake diagnostics.",
    features: [
      "Up to 20 Mock Tests per day",
      "Up to 300 Saved Questions & Revision Bookmarks",
      "Subject, Topic & Difficulty Performance Analytics",
      "PYQ vs Model Accuracy Diagnostics",
      "7-Category Mistake Analysis & 15 Retests/day",
      "Full Custom PYQ/Model Ratio Control (100/0 to 0/100)",
    ],
  },
  pro_yearly: {
    id: "pro_yearly",
    code: "PRO_YEARLY",
    tier: "PRO",
    name: "Pro Annual",
    priceInr: 599,
    amountPaise: 59900,
    interval: "year",
    intervalCount: 1,
    savingsLabel: "Save ₹109/yr (2 months free)",
    description: "Consistent year-round preparation with full diagnostic analytics.",
    features: [
      "Everything in Pro Monthly",
      "Up to 20 Mock Tests per day",
      "Up to 300 Saved Questions & Revision Bookmarks",
      "Subject, Topic & Difficulty Performance Analytics",
      "PYQ vs Model Accuracy Diagnostics",
      "7-Category Mistake Analysis & 15 Retests/day",
    ],
  },
  elite_monthly: {
    id: "elite_monthly",
    code: "ELITE_MONTHLY",
    tier: "ELITE",
    name: "Elite Monthly",
    priceInr: 99,
    amountPaise: 9900,
    interval: "month",
    intervalCount: 1,
    description: "Unrestricted mock generation, unlimited revision, and complete exam coverage.",
    features: [
      "Unlimited Daily Mock Tests",
      "Unlimited Saved Questions & Revision Bookmarks",
      "Unlimited Mistake Retest Drills",
      "Complete Analytics History & Trend Telemetry",
      "Access to All 22+ Competitive Examinations",
      "Maximum AI Model Question Allowance",
    ],
  },
  elite_yearly: {
    id: "elite_yearly",
    code: "ELITE_YEARLY",
    tier: "ELITE",
    name: "Elite Annual",
    priceInr: 999,
    amountPaise: 99900,
    interval: "year",
    intervalCount: 1,
    savingsLabel: "Save ₹189/yr (Best Value)",
    description: "Complete unrestricted access for serious multi-exam aspirants.",
    features: [
      "Everything in Elite Monthly",
      "Unlimited Mock Tests, Bookmarks & Retest Drills",
      "Complete Analytics History & Trend Telemetry",
      "All 22+ Competitive Examinations & Subjects",
      "Priority Access to Newly Verified PYQ Batches",
    ],
  },
  // Legacy compatibility keys for Phase 4 tests
  premium_monthly: {
    id: "premium_monthly",
    code: "ELITE_MONTHLY",
    tier: "ELITE",
    name: "Monthly Pro",
    priceInr: 499,
    amountPaise: 49900,
    interval: "month",
    intervalCount: 1,
    description: "Full unlimited access to authentic mocks.",
    features: ["Unlimited Daily Mock Tests", "Unlimited Saved Questions"],
  },
  premium_annual: {
    id: "premium_annual",
    code: "ELITE_YEARLY",
    tier: "ELITE",
    name: "Annual Aspirant",
    priceInr: 2999,
    amountPaise: 299900,
    interval: "year",
    intervalCount: 1,
    description: "Best value for full exam preparation cycle.",
    features: ["Unlimited Daily Mock Tests", "Unlimited Saved Questions"],
  },
};
