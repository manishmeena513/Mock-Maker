"use server";

import { toggleSaveQuestion, getSavedQuestions, isQuestionSaved } from "@/lib/db";
import { assertCanSaveQuestion } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

async function getActionUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {
    // fallback
  }
  return "default-user";
}

export async function toggleBookmarkAction(
  questionId: string,
  category: "important" | "difficult" | "revise_later" = "important"
) {
  const userId = await getActionUserId();
  const currentlySaved = await isQuestionSaved(questionId, userId);

  // If user is trying to save a new question, verify their plan quota
  if (!currentlySaved) {
    await assertCanSaveQuestion(userId);
  }

  const result = await toggleSaveQuestion(questionId, category, userId);
  return result;
}

export async function checkBookmarkAction(questionId: string) {
  const userId = await getActionUserId();
  return isQuestionSaved(questionId, userId);
}

export async function fetchUserBookmarksAction() {
  const userId = await getActionUserId();
  return getSavedQuestions(userId);
}
