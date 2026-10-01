"use server";

import { toggleSaveQuestion, getSavedQuestions, isQuestionSaved } from "@/lib/db";
import { assertCanSaveQuestion } from "@/lib/plans";
import { getVerifiedServerUser } from "@/lib/auth/server";

async function getActionUserId(requireAuthWhenConfigured: boolean): Promise<string | null> {
  const verified = await getVerifiedServerUser();
  if (verified.authenticated && verified.userId) {
    return verified.userId;
  }
  if (verified.isSupabaseConfigured && requireAuthWhenConfigured) {
    throw new Error("Sign in first to use this feature.");
  }
  if (verified.isSupabaseConfigured) {
    return null;
  }
  return "default-user";
}

export async function toggleBookmarkAction(
  questionId: string,
  category: "important" | "difficult" | "revise_later" = "important"
) {
  const userId = await getActionUserId(true);
  if (!userId) {
    throw new Error("Sign in first to use this feature.");
  }
  const currentlySaved = await isQuestionSaved(questionId, userId);

  // If user is trying to save a new question, verify their plan quota
  if (!currentlySaved) {
    await assertCanSaveQuestion(userId);
  }

  const result = await toggleSaveQuestion(questionId, category, userId);
  return result;
}

export async function checkBookmarkAction(questionId: string) {
  const userId = await getActionUserId(false);
  if (!userId) return false;
  return isQuestionSaved(questionId, userId);
}

export async function fetchUserBookmarksAction() {
  const userId = await getActionUserId(false);
  if (!userId) return [];
  return getSavedQuestions(userId);
}
