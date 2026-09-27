"use server";

import { z } from "zod";
import {
  getExamBySlug,
  getQuestionsPool,
  createMockRecord,
  getMockTestById,
  updateMockQuestionAnswer,
  toggleMarkForReview,
  finalizeMockTest,
  updateMockQuestionMistake,
  createRetestDrill,
  getAllSubjects,
  getAllTopics,
} from "@/lib/db";
import { ALL_CATALOG_SUBJECTS, ALL_CATALOG_TOPICS } from "@/lib/data/examTaxonomy";
import {
  MockTest,
  Question,
  TestMode,
  MistakeCategory,
  SubjectPerformanceSummary,
  TopicPerformanceSummary,
} from "@/types/database";
import { assertCanCreateMock, assertCanCreateRetest } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const MockConfigSchema = z.object({
  examSlug: z.string().min(1, "Exam is required"),
  subjectIds: z.array(z.string()).default([]),
  topicIds: z.array(z.string()).default([]),
  questionCount: z.number().int().min(5).max(100).default(25),
  pyqRatio: z.number().int().min(0).max(100).default(80),
  difficulty: z.enum(["easy", "moderate", "hard"]).default("moderate"),
  mode: z.enum(["practice", "exam"]).default("practice"),
  timeLimitMinutes: z.number().int().min(5).max(180).optional(),
});

export type MockConfigInput = z.infer<typeof MockConfigSchema>;

// Randomize option positions (A, B, C, D) so correct answers are evenly and unpredictably distributed
function shuffleQuestionOptions(q: Question): Question {
  const options = [
    { key: "A", text: q.option_a, isCorrect: q.correct_answer === "A" },
    { key: "B", text: q.option_b, isCorrect: q.correct_answer === "B" },
    { key: "C", text: q.option_c, isCorrect: q.correct_answer === "C" },
    { key: "D", text: q.option_d, isCorrect: q.correct_answer === "D" },
  ];

  // Fisher-Yates shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const keys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  let newCorrect: "A" | "B" | "C" | "D" = "A";

  options.forEach((opt, idx) => {
    if (opt.isCorrect) {
      newCorrect = keys[idx];
    }
  });

  return {
    ...q,
    option_a: options[0].text,
    option_b: options[1].text,
    option_c: options[2].text,
    option_d: options[3].text,
    correct_answer: newCorrect,
  };
}

export async function generateMockAction(input: MockConfigInput) {
  const validated = MockConfigSchema.parse(input);

  let userId = "default-user";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {
    // fallback to default-user
  }

  // Centralized plan limit enforcement
  await assertCanCreateMock(userId);

  const exam = await getExamBySlug(validated.examSlug);
  if (!exam) {
    throw new Error(`Exam not found: ${validated.examSlug}`);
  }

  const requestedTotal = validated.questionCount;
  const pyqRatio = typeof validated.pyqRatio === "number" ? validated.pyqRatio : 80;
  const targetPyqCount = Math.round(requestedTotal * (pyqRatio / 100));
  const targetModelCount = requestedTotal - targetPyqCount;

  // 1. Fetch available approved PYQs matching exact selection
  const exactPyqs =
    targetPyqCount > 0
      ? await getQuestionsPool({
          examId: exam.id,
          subjectIds: validated.subjectIds.length > 0 ? validated.subjectIds : undefined,
          topicIds: validated.topicIds.length > 0 ? validated.topicIds : undefined,
          type: "PYQ",
          userId,
        })
      : [];

  // 2. Fetch available approved MODEL questions matching exact selection
  const exactModels =
    targetModelCount > 0
      ? await getQuestionsPool({
          examId: exam.id,
          subjectIds: validated.subjectIds.length > 0 ? validated.subjectIds : undefined,
          topicIds: validated.topicIds.length > 0 ? validated.topicIds : undefined,
          type: "MODEL",
          userId,
        })
      : [];

  const selectedPyqs: Question[] = [];
  const selectedModels: Question[] = [];
  const usedIds = new Set<string>();

  // Add exact PYQs up to targetPyqCount
  exactPyqs.forEach((q) => {
    if (selectedPyqs.length < targetPyqCount && !usedIds.has(q.id)) {
      selectedPyqs.push(q);
      usedIds.add(q.id);
    }
  });

  // Add exact Models up to targetModelCount
  exactModels.forEach((q) => {
    if (selectedModels.length < targetModelCount && !usedIds.has(q.id)) {
      selectedModels.push(q);
      usedIds.add(q.id);
    }
  });

  let ratioWarning: string | null = null;

  // MULTI-TIER FALLBACK: If selected items < requestedTotal, expand pool while respecting targetPyqCount & targetModelCount first
  if (selectedPyqs.length + selectedModels.length < requestedTotal) {
    const initialMatched = selectedPyqs.length + selectedModels.length;

    // Tier 2: Expand to parent subjects if specific topics were filtered
    if (validated.topicIds.length > 0) {
      if (selectedPyqs.length < targetPyqCount) {
        const subjectPyqs = await getQuestionsPool({
          examId: exam.id,
          subjectIds: validated.subjectIds.length > 0 ? validated.subjectIds : undefined,
          type: "PYQ",
          userId,
        });
        subjectPyqs.forEach((q) => {
          if (selectedPyqs.length < targetPyqCount && !usedIds.has(q.id)) {
            selectedPyqs.push(q);
            usedIds.add(q.id);
          }
        });
      }

      if (selectedModels.length < targetModelCount) {
        const subjectModels = await getQuestionsPool({
          examId: exam.id,
          subjectIds: validated.subjectIds.length > 0 ? validated.subjectIds : undefined,
          type: "MODEL",
          userId,
        });
        subjectModels.forEach((q) => {
          if (selectedModels.length < targetModelCount && !usedIds.has(q.id)) {
            selectedModels.push(q);
            usedIds.add(q.id);
          }
        });
      }
    }

    // Tier 3: Expand to entire Exam Pool while strictly respecting targetPyqCount and targetModelCount
    if (selectedPyqs.length < targetPyqCount) {
      const allExamPyqs = await getQuestionsPool({
        examId: exam.id,
        type: "PYQ",
        userId,
      });
      allExamPyqs.forEach((q) => {
        if (selectedPyqs.length < targetPyqCount && !usedIds.has(q.id)) {
          selectedPyqs.push(q);
          usedIds.add(q.id);
        }
      });
    }

    if (selectedModels.length < targetModelCount) {
      const allExamModels = await getQuestionsPool({
        examId: exam.id,
        type: "MODEL",
        userId,
      });
      allExamModels.forEach((q) => {
        if (selectedModels.length < targetModelCount && !usedIds.has(q.id)) {
          selectedModels.push(q);
          usedIds.add(q.id);
        }
      });
    }

    // Tier 4: Only if the entire exam pool lacks enough of one type (PYQ or Model), fill remaining from available approved questions of the exam
    if (selectedPyqs.length + selectedModels.length < requestedTotal) {
      const allExamQuestions = await getQuestionsPool({ examId: exam.id, userId });
      for (const q of allExamQuestions) {
        if (selectedPyqs.length + selectedModels.length >= requestedTotal) break;
        if (!usedIds.has(q.id)) {
          if (q.type === "PYQ") selectedPyqs.push(q);
          else selectedModels.push(q);
          usedIds.add(q.id);
        }
      }
    }

    const finalCount = selectedPyqs.length + selectedModels.length;
    if (
      selectedPyqs.length !== targetPyqCount ||
      selectedModels.length !== targetModelCount
    ) {
      ratioWarning = `Requested ${pyqRatio}/${100 - pyqRatio} ratio (${targetPyqCount} PYQ + ${targetModelCount} Model). Adjusted to ${selectedPyqs.length} PYQ + ${selectedModels.length} Model based on available verified pool for ${exam.name}.`;
    } else if (initialMatched < requestedTotal) {
      ratioWarning = `Included all ${initialMatched} questions from your specific topic selection, plus ${finalCount - initialMatched} sibling syllabus questions to fulfill your ${finalCount}-question (${pyqRatio}/${100 - pyqRatio} PYQ/Model) paper.`;
    }
  }

  // Combine both pools
  const combined = [...selectedPyqs, ...selectedModels];

  if (combined.length === 0) {
    throw new Error(
      `No approved questions are currently in the bank for ${exam.name}. Please select an exam with verified questions (e.g., UPSC CSE, UPPSC PCS, or SSC CGL) or add questions via Admin Import / AI Generation.`
    );
  }

  // Shuffle question order using Fisher-Yates
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  // Randomize options for each question so the correct answer is uniformly unpredictable
  const randomizedCombined = combined.map(shuffleQuestionOptions);

  const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timeLimit =
    validated.timeLimitMinutes ||
    exam.time_limit_minutes ||
    Math.max(15, Math.round(randomizedCombined.length * 1.5));

  const mockTestRecord: MockTest = {
    id: mockId,
    user_id: userId,
    exam_id: exam.id,
    subject_ids: validated.subjectIds,
    topic_ids: validated.topicIds,
    mode: validated.mode as TestMode,
    total_questions: randomizedCombined.length,
    pyq_count: selectedPyqs.length,
    model_count: selectedModels.length,
    pyq_ratio: pyqRatio,
    is_retest: false,
    time_limit_minutes: Math.round(timeLimit),
    marking_scheme: exam.marking_scheme,
    status: "in_progress",
    started_at: new Date().toISOString(),
    completed_at: null,
    raw_score: null,
    accuracy: null,
    total_correct: 0,
    total_wrong: 0,
    total_unattempted: randomizedCombined.length,
    ratio_warning: ratioWarning,
    created_at: new Date().toISOString(),
  };

  await createMockRecord(mockTestRecord, randomizedCombined, userId);

  return {
    success: true,
    mockId,
    totalQuestions: randomizedCombined.length,
    pyqCount: selectedPyqs.length,
    modelCount: selectedModels.length,
    pyqRatio,
    ratioWarning,
  };
}

export async function submitAnswerAction({
  mockId,
  orderIndex,
  selectedOption,
  timeSpentSeconds = 0,
}: {
  mockId: string;
  orderIndex: number;
  selectedOption: "A" | "B" | "C" | "D";
  timeSpentSeconds?: number;
}) {
  const data = await getMockTestById(mockId);
  if (!data) throw new Error("Mock test not found");

  const mockQuestion = data.questions.find((q) => q.order_index === orderIndex);
  if (!mockQuestion || !mockQuestion.question) {
    throw new Error("Question not found in test");
  }

  const isCorrect = selectedOption === mockQuestion.question.correct_answer;
  await updateMockQuestionAnswer(mockId, orderIndex, selectedOption, isCorrect, timeSpentSeconds);

  return {
    success: true,
    isCorrect,
    correctAnswer: mockQuestion.question.correct_answer,
    explanation: mockQuestion.question.explanation,
    type: mockQuestion.question.type,
    sourceYear: mockQuestion.question.source_year,
  };
}

export async function toggleReviewAction({
  mockId,
  orderIndex,
}: {
  mockId: string;
  orderIndex: number;
}) {
  const isMarked = await toggleMarkForReview(mockId, orderIndex);
  return { success: true, isMarked };
}

export async function recordMistakeCategoryAction({
  mockId,
  orderIndex,
  category,
}: {
  mockId: string;
  orderIndex: number;
  category: MistakeCategory;
}) {
  const success = await updateMockQuestionMistake(mockId, orderIndex, category);
  return { success, category };
}

export async function generateRetestDrillAction({
  questionIds,
}: {
  questionIds: string[];
}) {
  if (!questionIds || questionIds.length === 0) {
    throw new Error("No question IDs provided for retest drill");
  }
  let userId = "default-user";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {
    // fallback
  }

  await assertCanCreateRetest(userId);
  const drillId = await createRetestDrill(questionIds, userId);
  return { success: true, drillId };
}

export async function finalizeMockAction(mockId: string) {
  const data = await getMockTestById(mockId);
  if (!data) throw new Error("Mock test not found");

  const { test, questions } = data;
  const scheme = test.marking_scheme;
  const allSubjects = await getAllSubjects(true);
  const allTopics = await getAllTopics(true);

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;
  let rawScore = 0;

  // Breakdown by question type
  let pyqAttempted = 0;
  let pyqCorrect = 0;
  let modelAttempted = 0;
  let modelCorrect = 0;

  // Subject and Topic Aggregators
  const subjectAgg: Record<
    string,
    { id: string; name: string; total: number; attempted: number; correct: number; wrong: number; unattempted: number; score: number }
  > = {};

  const topicAgg: Record<
    string,
    { id: string; name: string; subjectName: string; total: number; attempted: number; correct: number; wrong: number; unattempted: number }
  > = {};

  questions.forEach((mq) => {
    const q = mq.question;
    const subId = q?.subject_id || "general-subject";
    const topId = q?.topic_id || "general-topic";

    const subName =
      allSubjects.find((s) => s.id === subId)?.name ||
      ALL_CATALOG_SUBJECTS.find((s) => s.id === subId)?.name ||
      "General Subject";
    const topName =
      allTopics.find((t) => t.id === topId)?.name ||
      ALL_CATALOG_TOPICS.find((t) => t.id === topId)?.name ||
      q?.explanation?.concept ||
      "Topic Concept";

    if (!subjectAgg[subId]) {
      subjectAgg[subId] = {
        id: subId,
        name: subName,
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        score: 0,
      };
    }
    subjectAgg[subId].total += 1;

    if (!topicAgg[topId]) {
      topicAgg[topId] = {
        id: topId,
        name: topName,
        subjectName: subName,
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
      };
    }
    topicAgg[topId].total += 1;

    if (!mq.user_answer) {
      totalUnattempted += 1;
      subjectAgg[subId].unattempted += 1;
      topicAgg[topId].unattempted += 1;
      rawScore += scheme.unattempted || 0;
      subjectAgg[subId].score += scheme.unattempted || 0;
    } else {
      subjectAgg[subId].attempted += 1;
      topicAgg[topId].attempted += 1;

      if (mq.is_correct) {
        totalCorrect += 1;
        subjectAgg[subId].correct += 1;
        topicAgg[topId].correct += 1;
        rawScore += scheme.correct;
        subjectAgg[subId].score += scheme.correct;

        if (q?.type === "PYQ") {
          pyqAttempted += 1;
          pyqCorrect += 1;
        } else {
          modelAttempted += 1;
          modelCorrect += 1;
        }
      } else {
        totalWrong += 1;
        subjectAgg[subId].wrong += 1;
        topicAgg[topId].wrong += 1;
        rawScore += scheme.wrong; // applies negative marking
        subjectAgg[subId].score += scheme.wrong;

        if (q?.type === "PYQ") {
          pyqAttempted += 1;
        } else {
          modelAttempted += 1;
        }
      }
    }
  });

  const attemptedCount = totalCorrect + totalWrong;
  const accuracy = attemptedCount > 0 ? Math.round((totalCorrect / attemptedCount) * 100) : 0;
  const roundedScore = Math.round(rawScore * 100) / 100;

  // Finalize in database (Idempotent)
  await finalizeMockTest(mockId, {
    rawScore: roundedScore,
    accuracy,
    totalCorrect,
    totalWrong,
    totalUnattempted,
  });

  // Calculate separate PYQ vs MODEL metrics
  const pyqWrong = pyqAttempted - pyqCorrect;
  const pyqScoreContrib = Math.round(((pyqCorrect * scheme.correct) + (pyqWrong * scheme.wrong)) * 100) / 100;

  const modelWrong = modelAttempted - modelCorrect;
  const modelScoreContrib = Math.round(((modelCorrect * scheme.correct) + (modelWrong * scheme.wrong)) * 100) / 100;

  // Build Subject Analysis List
  const subjectAnalysis: SubjectPerformanceSummary[] = Object.values(subjectAgg).map((s) => ({
    id: s.id,
    name: s.name,
    totalQuestions: s.total,
    attempted: s.attempted,
    correct: s.correct,
    wrong: s.wrong,
    unattempted: s.unattempted,
    accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    score: Math.round(s.score * 100) / 100,
  }));

  // Build Topic Analysis List with Strong / Needs Revision / Weak status
  const topicAnalysis: TopicPerformanceSummary[] = Object.values(topicAgg).map((t) => {
    const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0;
    let status: "Strong" | "Needs Revision" | "Weak" = "Needs Revision";
    if (t.attempted === 0 || acc < 50) {
      status = "Weak";
    } else if (acc >= 75) {
      status = "Strong";
    }

    return {
      id: t.id,
      name: t.name,
      subjectName: t.subjectName,
      totalQuestions: t.total,
      attempted: t.attempted,
      correct: t.correct,
      wrong: t.wrong,
      unattempted: t.unattempted,
      accuracy: acc,
      status,
    };
  });

  // Identify weak topics for quick practice shortcut
  const weakTopics = topicAnalysis
    .filter((t) => t.status === "Weak")
    .map((t) => ({
      id: t.id,
      name: t.name,
      accuracy: t.accuracy,
      attempted: t.attempted,
      total: t.totalQuestions,
    }));

  return {
    success: true,
    mockId,
    score: roundedScore,
    maxPossibleScore: questions.length * scheme.correct,
    accuracy,
    totalCorrect,
    totalWrong,
    totalUnattempted,
    pyqStats: {
      total: test.pyq_count,
      attempted: pyqAttempted,
      correct: pyqCorrect,
      wrong: pyqWrong,
      accuracy: pyqAttempted > 0 ? Math.round((pyqCorrect / pyqAttempted) * 100) : 0,
      scoreContribution: pyqScoreContrib,
    },
    modelStats: {
      total: test.model_count,
      attempted: modelAttempted,
      correct: modelCorrect,
      wrong: modelWrong,
      accuracy: modelAttempted > 0 ? Math.round((modelCorrect / modelAttempted) * 100) : 0,
      scoreContribution: modelScoreContrib,
    },
    subjectAnalysis,
    topicAnalysis,
    weakTopics,
  };
}
