"use server";

import {
  updateQuestionVerification,
  createOrUpdateExam,
  toggleExamActive,
  createOrUpdateSubject,
  createOrUpdateTopic,
  reorderTopics,
  updateSystemSetting,
  updateUserPlan,
} from "@/lib/db";
import { verifyAdminAuthorization } from "@/lib/auth/admin";
import { Exam, Subject, Topic, UserPlanType } from "@/types/database";

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

export async function saveExamAction(
  input: Partial<Exam> & { name: string; slug: string }
) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  const exam = await createOrUpdateExam(input);
  return { success: true, exam };
}

export async function toggleExamActiveAction(examId: string, isActive: boolean) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  const success = await toggleExamActive(examId, isActive);
  return { success, examId, isActive };
}

export async function saveSubjectAction(
  input: Partial<Subject> & { exam_id: string; name: string; slug: string }
) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  const subject = await createOrUpdateSubject(input);
  return { success: true, subject };
}

export async function saveTopicAction(
  input: Partial<Topic> & { subject_id: string; name: string; slug: string }
) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  const topic = await createOrUpdateTopic(input);
  return { success: true, topic };
}

export async function reorderTopicsAction(
  subjectId: string,
  orderedTopicIds: string[]
) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  const success = await reorderTopics(subjectId, orderedTopicIds);
  return { success };
}

export async function updateSystemSettingAction(key: string, value: unknown) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  await updateSystemSetting(key, value);
  return { success: true, key, value };
}

export async function updateUserPlanAdminAction(
  userId: string,
  plan: UserPlanType
) {
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized admin action");
  }
  await updateUserPlan(userId, plan);
  return { success: true, userId, plan };
}
