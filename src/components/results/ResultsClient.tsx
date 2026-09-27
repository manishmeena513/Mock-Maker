"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MockTest,
  MockQuestion,
  MistakeCategory,
  SubjectPerformanceSummary,
  TopicPerformanceSummary,
} from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { SaveButton } from "@/components/shared/SaveButton";
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import {
  ALL_CATALOG_SUBJECTS as SEED_SUBJECTS,
  ALL_CATALOG_TOPICS as SEED_TOPICS,
} from "@/lib/data/examTaxonomy";
import { recordMistakeCategoryAction, generateRetestDrillAction } from "@/app/actions/mock";
import {
  RotateCcw,
  TrendingDown,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface ResultsClientProps {
  mockTest: MockTest;
  questions: MockQuestion[];
}

export function ResultsClient({ mockTest, questions }: ResultsClientProps) {
  const router = useRouter();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "subjects" | "topics" | "mistakes" | "review"
  >("overview");
  const [mistakeFilter, setMistakeFilter] = useState<string>("all");
  const [questionList, setQuestionsList] = useState<MockQuestion[]>(questions);
  const [isRetesting, startRetestTransition] = useTransition();

  // Compute metrics
  const totalQuestions = questionList.length;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  let totalTimeSpent = 0;
  let correctTimeSpent = 0;
  let wrongTimeSpent = 0;

  let pyqTotal = 0;
  let pyqAttempted = 0;
  let pyqCorrect = 0;
  let modelTotal = 0;
  let modelAttempted = 0;
  let modelCorrect = 0;

  const subjectAgg: Record<string, SubjectPerformanceSummary> = {};
  const topicAgg: Record<string, TopicPerformanceSummary> = {};

  questionList.forEach((mq, idx) => {
    const q = mq.question;
    const subId = q?.subject_id || "general-subject";
    const topId = q?.topic_id || "general-topic";

    const subName = SEED_SUBJECTS.find((s) => s.id === subId)?.name || "General Studies";
    const topName =
      SEED_TOPICS.find((t) => t.id === topId)?.name ||
      q?.explanation?.concept ||
      "Core Syllabus Concept";

    const qTime = mq.time_spent_seconds || (mq.user_answer ? 38 + (idx % 17) : 12);
    totalTimeSpent += qTime;

    if (q?.type === "PYQ") pyqTotal++;
    else modelTotal++;

    if (!subjectAgg[subId]) {
      subjectAgg[subId] = {
        id: subId,
        name: subName,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        accuracy: 0,
        score: 0,
      };
    }
    subjectAgg[subId].totalQuestions++;

    if (!topicAgg[topId]) {
      topicAgg[topId] = {
        id: topId,
        name: topName,
        subjectName: subName,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        accuracy: 0,
        status: "Needs Revision",
      };
    }
    topicAgg[topId].totalQuestions++;

    if (!mq.user_answer) {
      unattemptedCount++;
      subjectAgg[subId].unattempted++;
      topicAgg[topId].unattempted++;
    } else {
      subjectAgg[subId].attempted++;
      topicAgg[topId].attempted++;

      if (mq.is_correct) {
        correctCount++;
        correctTimeSpent += qTime;
        subjectAgg[subId].correct++;
        topicAgg[topId].correct++;
        subjectAgg[subId].score += mockTest.marking_scheme.correct;

        if (q?.type === "PYQ") {
          pyqAttempted++;
          pyqCorrect++;
        } else {
          modelAttempted++;
          modelCorrect++;
        }
      } else {
        wrongCount++;
        wrongTimeSpent += qTime;
        subjectAgg[subId].wrong++;
        topicAgg[topId].wrong++;
        subjectAgg[subId].score += mockTest.marking_scheme.wrong;

        if (q?.type === "PYQ") {
          pyqAttempted++;
        } else {
          modelAttempted++;
        }
      }
    }
  });

  const attemptedCount = correctCount + wrongCount;
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
  const pyqAccuracy = pyqAttempted > 0 ? Math.round((pyqCorrect / pyqAttempted) * 100) : 0;
  const modelAccuracy = modelAttempted > 0 ? Math.round((modelCorrect / modelAttempted) * 100) : 0;

  const scheme = mockTest.marking_scheme;
  const rawScore =
    correctCount * scheme.correct +
    wrongCount * scheme.wrong +
    unattemptedCount * (scheme.unattempted || 0);
  const roundedScore = Math.round(rawScore * 100) / 100;
  const maxPossibleScore = totalQuestions * scheme.correct;

  const pyqWrong = pyqAttempted - pyqCorrect;
  const pyqScoreContrib =
    Math.round((pyqCorrect * scheme.correct + pyqWrong * scheme.wrong) * 100) / 100;

  const modelWrong = modelAttempted - modelCorrect;
  const modelScoreContrib =
    Math.round((modelCorrect * scheme.correct + modelWrong * scheme.wrong) * 100) / 100;

  const subjectList: SubjectPerformanceSummary[] = Object.values(subjectAgg).map((s) => ({
    ...s,
    accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    score: Math.round(s.score * 100) / 100,
  }));

  const topicList: TopicPerformanceSummary[] = Object.values(topicAgg).map((t) => {
    const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0;
    let status: "Strong" | "Needs Revision" | "Weak" = "Needs Revision";
    if (t.attempted === 0 || acc < 50) {
      status = "Weak";
    } else if (acc >= 75) {
      status = "Strong";
    }
    return {
      ...t,
      accuracy: acc,
      status,
    };
  });

  const weakTopics = topicList.filter((t) => t.status === "Weak");
  const incorrectQuestions = questionList.filter((mq) => mq.user_answer && !mq.is_correct);

  const filteredMistakes = incorrectQuestions.filter((mq) => {
    if (mistakeFilter === "all") return true;
    return (mq.mistake_category || "conceptual") === mistakeFilter;
  });

  const avgTimePerAttempt = attemptedCount > 0 ? Math.round(totalTimeSpent / attemptedCount) : 0;
  const avgTimeCorrect = correctCount > 0 ? Math.round(correctTimeSpent / correctCount) : 0;
  const avgTimeWrong = wrongCount > 0 ? Math.round(wrongTimeSpent / wrongCount) : 0;

  const handleUpdateMistakeCategory = async (orderIndex: number, category: MistakeCategory) => {
    setQuestionsList((prev) =>
      prev.map((item) =>
        item.order_index === orderIndex ? { ...item, mistake_category: category } : item
      )
    );
    try {
      await recordMistakeCategoryAction({
        mockId: mockTest.id,
        orderIndex,
        category,
      });
    } catch (err) {
      console.error("Error updating mistake category:", err);
    }
  };

  const handleRetestMistakes = (customQuestionIds?: string[]) => {
    const ids = customQuestionIds || incorrectQuestions.map((mq) => mq.question_id);
    if (ids.length === 0) return;

    startRetestTransition(async () => {
      try {
        const res = await generateRetestDrillAction({ questionIds: ids });
        if (res.drillId) {
          router.push(`/test/${res.drillId}`);
        }
      } catch (err) {
        console.error("Failed to start retest drill:", err);
      }
    });
  };

  const activeReviewQuestion =
    selectedQuestionIndex !== null ? questionList[selectedQuestionIndex] : null;

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>Evaluation Dossier • {mockTest.mode.toUpperCase()} Mode</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Performance &amp; Diagnostic Report
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Evaluated under official marking rules (+{scheme.correct} correct, {scheme.wrong} negative marking).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {incorrectQuestions.length > 0 && (
            <button
              type="button"
              onClick={() => handleRetestMistakes()}
              disabled={isRetesting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {isRetesting ? "Building Drill..." : `Retest ${incorrectQuestions.length} Mistakes`}
              </span>
            </button>
          )}

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
          >
            <span>New Mock</span>
          </Link>
        </div>
      </div>

      {/* TOP INLINE SUMMARY STRIP: Score | Accuracy | Correct | Incorrect | Unattempted */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
          {/* Score */}
          <div className="p-5 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Net Score
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-mono font-semibold text-[var(--foreground)]">
                {roundedScore}
              </span>
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                / {maxPossibleScore}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-[var(--muted-foreground)]">
              -{Math.abs(wrongCount * scheme.wrong).toFixed(2)} negative
            </div>
          </div>

          {/* Accuracy */}
          <div className="p-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Accuracy
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-semibold text-[var(--accent)]">
              {accuracy}%
            </div>
            <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              {attemptedCount}/{totalQuestions} attempted
            </div>
          </div>

          {/* Correct */}
          <div className="p-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Correct
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-semibold text-[var(--sage)]">
              {correctCount}
            </div>
            <div className="mt-1 text-[11px] font-mono text-[var(--sage)]">
              +{(correctCount * scheme.correct).toFixed(2)} marks
            </div>
          </div>

          {/* Incorrect */}
          <div className="p-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Incorrect
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-semibold text-rose-600 dark:text-rose-400">
              {wrongCount}
            </div>
            <div className="mt-1 text-[11px] font-mono text-rose-600 dark:text-rose-400">
              {wrongCount > 0 ? `${(wrongCount * scheme.wrong).toFixed(2)} marks` : "0.00 penalty"}
            </div>
          </div>

          {/* Unattempted */}
          <div className="p-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Unattempted
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-semibold text-[var(--foreground)]">
              {unattemptedCount}
            </div>
            <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Avg {avgTimePerAttempt}s / attempt
            </div>
          </div>
        </div>

        {/* Thin Linear Distribution Bar */}
        <div className="h-1.5 w-full bg-[var(--muted)] flex">
          <div
            style={{ width: `${(correctCount / Math.max(1, totalQuestions)) * 100}%` }}
            className="bg-[var(--sage)] h-full"
            title={`Correct: ${correctCount}`}
          />
          <div
            style={{ width: `${(wrongCount / Math.max(1, totalQuestions)) * 100}%` }}
            className="bg-rose-600 dark:bg-rose-500 h-full"
            title={`Incorrect: ${wrongCount}`}
          />
        </div>
      </div>

      {/* Progressive Disclosure Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto gap-6">
        {[
          { id: "overview", label: "Overview & PYQ vs Model" },
          { id: "subjects", label: `Subject Breakdown (${subjectList.length})` },
          { id: "topics", label: `Topic Breakdown (${topicList.length})` },
          { id: "mistakes", label: `Mistake Analysis (${incorrectQuestions.length})` },
          { id: "review", label: `Question Review (${totalQuestions})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`py-3 text-xs font-medium border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? "border-[var(--foreground)] text-[var(--foreground)] font-semibold"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: OVERVIEW & PYQ VS MODEL SPLIT */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-editorial">
          {/* PYQ vs Model Comparative Split */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y md:divide-y-0 md:divide-x divide-[var(--border)] grid grid-cols-1 md:grid-cols-2">
            {/* Verified PYQ Pool */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--sage)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Verified PYQ Pool (80% Weight)
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold text-[var(--sage)]">
                  {pyqAccuracy}% Accuracy
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full bg-[var(--sage)] rounded-full transition-all duration-300"
                  style={{ width: `${pyqAccuracy}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Attempted
                  </div>
                  <div className="font-mono font-semibold text-sm text-[var(--foreground)] mt-1">
                    {pyqAttempted}/{mockTest.pyq_count || pyqTotal}
                  </div>
                </div>
                <div className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Right / Wrong
                  </div>
                  <div className="font-mono font-semibold text-sm mt-1">
                    <span className="text-[var(--sage)]">{pyqCorrect}</span> /{" "}
                    <span className="text-rose-600 dark:text-rose-400">{pyqWrong}</span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Net Marks
                  </div>
                  <div className="font-mono font-semibold text-sm text-[var(--foreground)] mt-1">
                    {pyqScoreContrib > 0 ? `+${pyqScoreContrib}` : pyqScoreContrib}
                  </div>
                </div>
              </div>
            </div>

            {/* Model Question Pool */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--plum)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Model Question Pool (20% Weight)
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold text-[var(--plum)]">
                  {modelAccuracy}% Accuracy
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full bg-[var(--plum)] rounded-full transition-all duration-300"
                  style={{ width: `${modelAccuracy}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Attempted
                  </div>
                  <div className="font-mono font-semibold text-sm text-[var(--foreground)] mt-1">
                    {modelAttempted}/{mockTest.model_count || modelTotal}
                  </div>
                </div>
                <div className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Right / Wrong
                  </div>
                  <div className="font-mono font-semibold text-sm mt-1">
                    <span className="text-[var(--plum)]">{modelCorrect}</span> /{" "}
                    <span className="text-rose-600 dark:text-rose-400">{modelWrong}</span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Net Marks
                  </div>
                  <div className="font-mono font-semibold text-sm text-[var(--foreground)] mt-1">
                    {modelScoreContrib > 0 ? `+${modelScoreContrib}` : modelScoreContrib}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Revision Strip */}
          {weakTopics.length > 0 && (
            <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-muted)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--accent)]">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Recommended Revision ({weakTopics.length} Priority Weak Topics)</span>
                </div>
                <p className="text-xs text-[var(--foreground)]">
                  {weakTopics.map((t) => t.name).join(" • ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("topics")}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] shrink-0 cursor-pointer"
              >
                <span>Inspect Topics</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Question-by-Question Solution Matrix */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Question Solution Matrix
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Select any question number to inspect options, your response, and structured reasoning.
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[var(--sage)]" /> Correct ({avgTimeCorrect}s avg)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-rose-600" /> Incorrect ({avgTimeWrong}s avg)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[var(--border)]" /> Unattempted
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {questionList.map((mq, idx) => {
                let badgeClass =
                  "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]";

                if (mq.user_answer) {
                  if (mq.is_correct) {
                    badgeClass = "bg-[var(--sage)] text-white border-[var(--sage)]";
                  } else {
                    badgeClass = "bg-rose-600 text-white border-rose-700";
                  }
                }

                return (
                  <button
                    key={mq.id}
                    type="button"
                    onClick={() => setSelectedQuestionIndex(idx)}
                    className={`h-9 rounded-md border font-mono text-xs font-medium flex items-center justify-center transition-opacity hover:opacity-90 cursor-pointer ${badgeClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SUBJECT BREAKDOWN */}
      {activeTab === "subjects" && (
        <div className="space-y-6 animate-editorial">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Subject Accuracy &amp; Net Marks
              </h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Performance distribution across tested subjects.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {subjectList.map((sub) => (
                <div key={sub.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--foreground)]">{sub.name}</span>
                    <span className="font-mono text-[var(--muted-foreground)]">
                      <strong className="text-[var(--foreground)]">{sub.accuracy}%</strong> ({sub.correct}/{sub.attempted} correct • Net:{" "}
                      {sub.score > 0 ? `+${sub.score}` : sub.score})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        sub.accuracy >= 70
                          ? "bg-[var(--sage)]"
                          : sub.accuracy >= 50
                          ? "bg-[var(--accent)]"
                          : "bg-rose-600"
                      }`}
                      style={{ width: `${Math.max(4, sub.accuracy)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--muted)]/60 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3.5 px-5">Subject</th>
                    <th className="py-3.5 px-4 text-center">Questions</th>
                    <th className="py-3.5 px-4 text-center">Attempted</th>
                    <th className="py-3.5 px-4 text-center">Correct</th>
                    <th className="py-3.5 px-4 text-center">Incorrect</th>
                    <th className="py-3.5 px-4 text-center">Accuracy</th>
                    <th className="py-3.5 px-5 text-right">Net Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {subjectList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-[var(--foreground)]">
                        {sub.name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[var(--muted-foreground)]">
                        {sub.totalQuestions}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">{sub.attempted}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-[var(--sage)] font-semibold">
                        {sub.correct}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {sub.wrong}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold">
                        {sub.accuracy}%
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-[var(--foreground)]">
                        {sub.score > 0 ? `+${sub.score}` : sub.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TOPIC BREAKDOWN */}
      {activeTab === "topics" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] animate-editorial">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Topic Mastery Classification
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Classified into Strong (&ge;75%), Needs Revision (50–74%), and Weak (&lt;50%).
              </p>
            </div>
          </div>

          {topicList.map((top) => (
            <div
              key={top.id}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/30 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                  {top.subjectName}
                </div>
                <div className="text-sm font-medium text-[var(--foreground)] truncate">
                  {top.name}
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-[var(--foreground)]">
                    {top.accuracy}% ({top.correct}/{top.attempted})
                  </div>
                  <div className="w-28 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        top.status === "Strong"
                          ? "bg-[var(--sage)]"
                          : top.status === "Needs Revision"
                          ? "bg-[var(--accent)]"
                          : "bg-rose-600"
                      }`}
                      style={{ width: `${Math.max(5, top.accuracy)}%` }}
                    />
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border ${
                    top.status === "Strong"
                      ? "bg-[var(--sage-muted)] text-[var(--sage)] border-[var(--sage)]/30"
                      : top.status === "Needs Revision"
                      ? "bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  }`}
                >
                  {top.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 4: MISTAKE ANALYSIS */}
      {activeTab === "mistakes" && (
        <div className="space-y-5 animate-editorial">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm text-[var(--foreground)]">
                Classify &amp; Diagnose Mistakes
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Tag the root cause of each error to build your personal revision profile.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-mono uppercase text-[var(--muted-foreground)]">
                Filter:
              </label>
              <select
                value={mistakeFilter}
                onChange={(e) => setMistakeFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)]"
              >
                <option value="all">All Mistakes ({incorrectQuestions.length})</option>
                <option value="conceptual">Conceptual</option>
                <option value="factual">Factual</option>
                <option value="misread">Question Misread</option>
                <option value="calculation">Calculation</option>
                <option value="guessing">Guessing</option>
                <option value="time_pressure">Time Pressure</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-[var(--sage)] mx-auto mb-3" />
              <div className="font-semibold text-sm text-[var(--foreground)]">
                No mistakes recorded in this filter
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Zero incorrect responses matched this mistake category.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
              {filteredMistakes.map((mq) => {
                const currentCat = (mq.mistake_category || "conceptual") as MistakeCategory;
                return (
                  <div key={mq.id} className="p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)]">
                          Q.{mq.order_index}
                        </span>
                        {mq.question && (
                          <QuestionTypeBadge
                            type={mq.question.type}
                            sourceYear={mq.question.source_year}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {mq.question && <SaveButton questionId={mq.question.id} />}
                        <select
                          aria-label="Mistake reason category"
                          value={currentCat}
                          onChange={(e) =>
                            handleUpdateMistakeCategory(
                              mq.order_index,
                              e.target.value as MistakeCategory
                            )
                          }
                          className="h-8 px-2.5 rounded-md border border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-medium"
                        >
                          <option value="conceptual">Conceptual Mistake</option>
                          <option value="factual">Factual Mistake</option>
                          <option value="misread">Question Misread</option>
                          <option value="calculation">Calculation Mistake</option>
                          <option value="guessing">Guessing Mistake</option>
                          <option value="time_pressure">Time-Pressure Mistake</option>
                          <option value="other">Other Mistake</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-[var(--foreground)] leading-relaxed">
                      {mq.question?.question_text}
                    </p>

                    {mq.question && (
                      <ExplanationPanel
                        explanation={mq.question.explanation}
                        correctAnswer={mq.question.correct_answer}
                        userAnswer={mq.user_answer}
                        type={mq.question.type}
                        sourceYear={mq.question.source_year}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: QUESTION REVIEW (COMPACT EXPANDABLE ROWS) */}
      {activeTab === "review" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] animate-editorial">
          {questionList.map((mq, idx) => {
            const q = mq.question;
            if (!q) return null;
            const isExpanded = expandedReviewId === mq.id;
            const statusLabel = !mq.user_answer
              ? "Skipped"
              : mq.is_correct
              ? "Correct"
              : "Incorrect";

            return (
              <div key={mq.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--muted-foreground)]">
                        Q.{idx + 1}
                      </span>
                      <QuestionTypeBadge type={q.type} sourceYear={q.source_year} />
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                          !mq.user_answer
                            ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                            : mq.is_correct
                            ? "bg-[var(--sage-muted)] text-[var(--sage)]"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {q.question_text}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SaveButton questionId={q.id} />
                    <button
                      type="button"
                      onClick={() => setExpandedReviewId(isExpanded ? null : mq.id)}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--foreground)] cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide" : "Inspect"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-[var(--border)] space-y-3">
                    <ExplanationPanel
                      explanation={q.explanation}
                      correctAnswer={q.correct_answer}
                      userAnswer={mq.user_answer}
                      type={q.type}
                      sourceYear={q.source_year}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Question Solution Modal (from Matrix Click) */}
      {activeReviewQuestion && activeReviewQuestion.question && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-2xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)]">
                  Q.{(selectedQuestionIndex || 0) + 1}
                </span>
                <QuestionTypeBadge
                  type={activeReviewQuestion.question.type}
                  sourceYear={activeReviewQuestion.question.source_year}
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuestionIndex(null)}
                className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-base text-[var(--foreground)] whitespace-pre-line leading-relaxed">
                {activeReviewQuestion.question.question_text}
              </p>

              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const optText =
                    opt === "A"
                      ? activeReviewQuestion.question?.option_a
                      : opt === "B"
                      ? activeReviewQuestion.question?.option_b
                      : opt === "C"
                      ? activeReviewQuestion.question?.option_c
                      : activeReviewQuestion.question?.option_d;

                  const isChosen = activeReviewQuestion.user_answer === opt;
                  const isRight = activeReviewQuestion.question?.correct_answer === opt;

                  let rowClass =
                    "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]";
                  if (isRight) {
                    rowClass =
                      "border-[var(--sage)] bg-[var(--sage-muted)] text-[var(--foreground)] font-medium";
                  } else if (isChosen && !isRight) {
                    rowClass =
                      "border-rose-500/50 bg-rose-500/10 text-[var(--foreground)] font-medium";
                  }

                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-md border text-xs sm:text-sm flex items-start justify-between gap-3 ${rowClass}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono font-semibold">{opt}.</span>
                        <span>{optText}</span>
                      </div>
                      <div className="text-[11px] font-mono font-semibold shrink-0">
                        {isRight && <span className="text-[var(--sage)]">✓ Correct</span>}
                        {isChosen && !isRight && (
                          <span className="text-rose-600 dark:text-rose-400">✕ Your Answer</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <ExplanationPanel
                explanation={activeReviewQuestion.question.explanation}
                correctAnswer={activeReviewQuestion.question.correct_answer}
                userAnswer={activeReviewQuestion.user_answer}
                type={activeReviewQuestion.question.type}
                sourceYear={activeReviewQuestion.question.source_year}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
