import { getUserEntitlements, UserEntitlements } from "./entitlements";
import { getUserDailyRetestCount } from "@/lib/db";
import { UserPlanType } from "@/types/database";

export interface UserPlanStatus extends UserEntitlements {
  plan: UserPlanType;
}

export async function getUserPlanStatus(userId: string = "default-user"): Promise<UserPlanStatus> {
  const ent = await getUserEntitlements(userId);
  return {
    ...ent,
    plan: ent.rawPlan,
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
      reason: `You have reached the daily limit of ${status.dailyMocksLimit} mock tests for ${status.tier} plan users. Upgrade to Pro (₹59/mo) or Elite (₹99/mo) for higher or unlimited daily mock tests.`,
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
      reason: `You have reached your bookmark capacity (${status.savedQuestionsLimit} questions) for ${status.tier} plan users. Upgrade to Pro or Elite for expanded revision capacity.`,
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

export async function canUserCreateRetest(userId: string = "default-user"): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number;
}> {
  const [status, dailyRetestsUsed] = await Promise.all([
    getUserPlanStatus(userId),
    getUserDailyRetestCount(userId),
  ]);
  const limit = status.dailyRetestLimit ?? 2;
  if (limit !== Infinity && dailyRetestsUsed >= limit) {
    return {
      allowed: false,
      reason: `You have reached the daily limit of ${limit} mistake retest drills for ${status.tier} plan users. Upgrade to Pro (15/day) or Elite (Unlimited) for more retests.`,
      currentCount: dailyRetestsUsed,
      maxAllowed: limit,
    };
  }

  return {
    allowed: true,
    currentCount: dailyRetestsUsed,
    maxAllowed: limit,
  };
}
