import { PlanLimits, UserPlanType } from "@/types/database";

const freeLimits: PlanLimits = {
  plan: "FREE",
  dailyMockLimit: 3,
  maxMocksPerDay: 3,
  maxSavedQuestions: 20,
  hasAdvancedAnalytics: false,
  hasDetailedExplanations: true, // Standard verified PYQ explanations included
  allowAiGeneration: false,
  canGenerateAIQuestions: false,
};

const premiumLimits: PlanLimits = {
  plan: "PREMIUM",
  dailyMockLimit: Infinity,
  maxMocksPerDay: Infinity,
  maxSavedQuestions: Infinity,
  hasAdvancedAnalytics: true,
  hasDetailedExplanations: true,
  allowAiGeneration: true,
  canGenerateAIQuestions: true,
};

export const PLAN_LIMITS: Record<UserPlanType, PlanLimits> = {
  FREE: freeLimits,
  PREMIUM: premiumLimits,
  free: freeLimits,
  premium: premiumLimits,
};

export const PRICING_PLANS = {
  monthly: {
    id: "premium_monthly",
    name: "Monthly Pro",
    priceInr: 499,
    amountPaise: 49900,
    interval: "month" as const,
    intervalCount: 1,
    description: "Full unlimited access to authentic UPSC, UPPSC & SSC mocks.",
    features: [
      "Unlimited Daily Mock Tests (No 3/day cap)",
      "Unlimited Saved Questions & Revision Bookmarks",
      "Full 80:20 PYQ vs Model Diagnostic Analytics",
      "Topic Mastery Breakdown & Mistake Classification",
      "Authentic Verified PYQs with zero hallucination",
    ],
  },
  annual: {
    id: "premium_annual",
    name: "Annual Aspirant",
    priceInr: 2999,
    amountPaise: 299900,
    interval: "year" as const,
    intervalCount: 1,
    description: "Best value for full exam preparation cycle. Save 50%.",
    features: [
      "Everything in Monthly Pro",
      "Save 50% compared to monthly plan",
      "Priority question bank updates & upcoming exam sets",
      "Unlimited targeted mistake retest drills",
      "Ad-free focused exam environment",
    ],
  },
};
