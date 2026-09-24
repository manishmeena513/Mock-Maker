"use server";

import { updateQuestionVerification } from "@/lib/db";
import { verifyAdminAuthorization } from "@/lib/auth/admin";

export async function updateQuestionVerificationAction(
  questionId: string,
  status: "pending" | "approved" | "rejected"
) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }

  const success = await updateQuestionVerification(questionId, status);
  return { success, questionId, status };
}
