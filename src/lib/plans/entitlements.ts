import { PLAN_LIMITS, normalizePlanTier, CanonicalPlanId, getAiAssistantDailyLimit } from "./plans";
import {
  getUserPlan,
  getUserDailyMockCount,
  getUserSavedQuestionCount,
  getUserDailyAIAssistantCount,
} from "@/lib/db";
import { UserPlanType } from "@/types/database";

export interface UserEntitlements {
  userId: string;
  rawPlan: UserPlanType;
  tier: CanonicalPlanId;
  isFree: boolean;
  isPro: boolean;
  isElite: boolean;
  isPaid: boolean;
  validUntil: string | null;
  dailyMocksUsed: number;
  dailyMocksLimit: number;
  dailyMocksRemaining: number;
  savedQuestionsCount: number;
  savedQuestionsLimit: number;
  savedQuestionsRemaining: number;
  dailyRetestLimit: number;
  hasAdvancedAnalytics: boolean;
  hasDetailedExplanations: boolean;
  allowAiGeneration: boolean;
  dailyAiGenerationLimit: number;
  dailyAiAssistantUsed: number;
  dailyAiAssistantLimit: number;
  dailyAiAssistantRemaining: number;
  allowedPyqRatios: number[];
}

export async function getUserEntitlements(userId: string = "default-user"): Promise<UserEntitlements> {
  const { plan, validUntil } = await getUserPlan(userId);
  const tier = normalizePlanTier(plan);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS[tier] || PLAN_LIMITS.FREE;

  const [dailyMocksUsed, savedQuestionsCount, dailyAiAssistantUsed] = await Promise.all([
    getUserDailyMockCount(userId),
    getUserSavedQuestionCount(userId),
    getUserDailyAIAssistantCount(userId),
  ]);

  const dailyMocksLimit = limits.dailyMockLimit ?? limits.maxMocksPerDay ?? 3;
  const savedQuestionsLimit = limits.maxSavedQuestions ?? 20;
  const dailyAiAssistantLimit = getAiAssistantDailyLimit(tier);

  const dailyMocksRemaining =
    dailyMocksLimit === Infinity
      ? Infinity
      : Math.max(0, dailyMocksLimit - dailyMocksUsed);

  const savedQuestionsRemaining =
    savedQuestionsLimit === Infinity
      ? Infinity
      : Math.max(0, savedQuestionsLimit - savedQuestionsCount);

  const dailyAiAssistantRemaining =
    dailyAiAssistantLimit === Infinity
      ? Infinity
      : Math.max(0, dailyAiAssistantLimit - dailyAiAssistantUsed);

  return {
    userId,
    rawPlan: plan,
    tier,
    isFree: tier === "FREE",
    isPro: tier === "PRO",
    isElite: tier === "ELITE",
    isPaid: tier === "PRO" || tier === "ELITE",
    validUntil,
    dailyMocksUsed,
    dailyMocksLimit,
    dailyMocksRemaining,
    savedQuestionsCount,
    savedQuestionsLimit,
    savedQuestionsRemaining,
    dailyRetestLimit: limits.dailyRetestLimit ?? 2,
    hasAdvancedAnalytics: Boolean(limits.hasAdvancedAnalytics),
    hasDetailedExplanations: Boolean(limits.hasDetailedExplanations ?? true),
    allowAiGeneration: Boolean(limits.allowAiGeneration ?? limits.canGenerateAIQuestions),
    dailyAiGenerationLimit: limits.dailyAiGenerationLimit ?? 0,
    dailyAiAssistantUsed,
    dailyAiAssistantLimit,
    dailyAiAssistantRemaining,
    allowedPyqRatios: limits.allowedPyqRatios || [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0],
  };
}
