import { canUserCreateMock, canUserSaveQuestion } from "./limits";
import { getUserPlan } from "@/lib/db";
import { UserPlanType } from "@/types/database";

export class PlanLimitExceededError extends Error {
  public code = "PLAN_LIMIT_EXCEEDED";
  public currentCount: number;
  public maxAllowed: number;

  constructor(message: string, currentCount: number, maxAllowed: number) {
    super(message);
    this.name = "PlanLimitExceededError";
    this.currentCount = currentCount;
    this.maxAllowed = maxAllowed;
  }
}

export class PlanUpgradeRequiredError extends Error {
  public code = "PLAN_UPGRADE_REQUIRED";
  public requiredPlan: UserPlanType;

  constructor(message: string, requiredPlan: UserPlanType = "PREMIUM") {
    super(message);
    this.name = "PlanUpgradeRequiredError";
    this.requiredPlan = requiredPlan;
  }
}

export async function assertCanCreateMock(userId: string = "default-user"): Promise<void> {
  const check = await canUserCreateMock(userId);
  if (!check.allowed) {
    throw new PlanLimitExceededError(
      check.reason || "Daily mock test creation limit reached.",
      check.currentCount,
      check.maxAllowed
    );
  }
}

export async function assertCanSaveQuestion(userId: string = "default-user"): Promise<void> {
  const check = await canUserSaveQuestion(userId);
  if (!check.allowed) {
    throw new PlanLimitExceededError(
      check.reason || "Saved questions bookmark limit reached.",
      check.currentCount,
      check.maxAllowed
    );
  }
}

export async function requirePlan(
  userId: string = "default-user",
  requiredPlan: UserPlanType = "PREMIUM",
  featureName: string = "this feature"
): Promise<void> {
  const { plan } = await getUserPlan(userId);
  const normalizedPlan = (plan || "free").toLowerCase();
  const normalizedRequired = (requiredPlan || "premium").toLowerCase();

  if (normalizedRequired === "premium" && normalizedPlan !== "premium") {
    throw new PlanUpgradeRequiredError(
      `Access to ${featureName} requires a MockMaster Premium subscription.`,
      requiredPlan
    );
  }
}
