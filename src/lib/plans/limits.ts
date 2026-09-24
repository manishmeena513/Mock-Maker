import { PLAN_LIMITS } from "./config";
import { getUserPlan, getUserDailyMockCount, getUserSavedQuestionCount } from "@/lib/db";
import { UserPlanType } from "@/types/database";

export interface UserPlanStatus {
  plan: UserPlanType;
  validUntil: string | null;
  dailyMocksUsed: number;
  dailyMocksLimit: number;
  dailyMocksRemaining: number;
  savedQuestionsCount: number;
  savedQuestionsLimit: number;
  savedQuestionsRemaining: number;
  hasAdvancedAnalytics: boolean;
  allowAiGeneration: boolean;
}

export async function getUserPlanStatus(userId: string = "default-user"): Promise<UserPlanStatus> {
  const { plan, validUntil } = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

  const [dailyMocksUsed, savedQuestionsCount] = await Promise.all([
    getUserDailyMockCount(userId),
    getUserSavedQuestionCount(userId),
  ]);

  const dailyMocksLimit = limits.dailyMockLimit ?? limits.maxMocksPerDay ?? 3;
  const savedQuestionsLimit = limits.maxSavedQuestions ?? 20;

  const dailyMocksRemaining =
    dailyMocksLimit === Infinity
      ? Infinity
      : Math.max(0, dailyMocksLimit - dailyMocksUsed);

  const savedQuestionsRemaining =
    savedQuestionsLimit === Infinity
      ? Infinity
      : Math.max(0, savedQuestionsLimit - savedQuestionsCount);

  return {
    plan,
    validUntil,
    dailyMocksUsed,
    dailyMocksLimit,
    dailyMocksRemaining,
    savedQuestionsCount,
    savedQuestionsLimit,
    savedQuestionsRemaining,
    hasAdvancedAnalytics: Boolean(limits.hasAdvancedAnalytics),
    allowAiGeneration: Boolean(limits.allowAiGeneration ?? limits.canGenerateAIQuestions),
  };
}

export async function canUserCreateMock(userId: string = "default-user"): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number;
}> {
  const status = await getUserPlanStatus(userId);
  if (status.dailyMocksLimit !== Infinity && status.dailyMocksUsed >= status.dailyMocksLimit) {
    return {
      allowed: false,
      reason: `You have reached the daily limit of ${status.dailyMocksLimit} mock tests for Free plan users. Upgrade to Premium for unlimited test generation.`,
      currentCount: status.dailyMocksUsed,
      maxAllowed: status.dailyMocksLimit,
    };
  }

  return {
    allowed: true,
    currentCount: status.dailyMocksUsed,
    maxAllowed: status.dailyMocksLimit,
  };
}

export async function canUserSaveQuestion(userId: string = "default-user"): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number;
}> {
  const status = await getUserPlanStatus(userId);
  if (status.savedQuestionsLimit !== Infinity && status.savedQuestionsCount >= status.savedQuestionsLimit) {
    return {
      allowed: false,
      reason: `You have reached your bookmark capacity (${status.savedQuestionsLimit} questions) for Free plan users. Upgrade to Premium for unlimited revision bookmarks.`,
      currentCount: status.savedQuestionsCount,
      maxAllowed: status.savedQuestionsLimit,
    };
  }

  return {
    allowed: true,
    currentCount: status.savedQuestionsCount,
    maxAllowed: status.savedQuestionsLimit,
  };
}
