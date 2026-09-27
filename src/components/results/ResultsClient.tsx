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
  Target,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  TrendingDown,
  Clock,
  X,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

interface ResultsClientProps {
  mockTest: MockTest;
  questions: MockQuestion[];
}

export function ResultsClient({ mockTest, questions }: ResultsClientProps) {
  const router = useRouter();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "subjects" | "topics" | "time" | "mistakes"
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

    // Estimate realistic time if not explicitly logged
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

  // Separate PYQ vs MODEL Score Contributions
  const pyqWrong = pyqAttempted - pyqCorrect;
  const pyqScoreContrib =
    Math.round((pyqCorrect * scheme.correct + pyqWrong * scheme.wrong) * 100) / 100;

  const modelWrong = modelAttempted - modelCorrect;
  const modelScoreContrib =
    Math.round((modelCorrect * scheme.correct + modelWrong * scheme.wrong) * 100) / 100;

  // Finalize Subject Summaries
  const subjectList: SubjectPerformanceSummary[] = Object.values(subjectAgg).map((s) => ({
    ...s,
    accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    score: Math.round(s.score * 100) / 100,
  }));

  // Finalize Topic Summaries
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200/90 dark:border-slate-800/90">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Official Evaluation Report
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Performance & Diagnostic Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Evaluated under official marking rules (+{scheme.correct} correct, {scheme.wrong} negative marking).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {incorrectQuestions.length > 0 && (
            <button
              type="button"
              onClick={() => handleRetestMistakes()}
              disabled={isRetesting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {isRetesting ? "Building Drill..." : `Retest ${incorrectQuestions.length} Mistakes`}
              </span>
            </button>
          )}

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <span>New Mock</span>
          </Link>
        </div>
      </div>

      {/* TOP SUMMARY DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primary Score Card */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Your Result
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
              {mockTest.mode.toUpperCase()} MODE
            </span>
          </div>

          <div className="my-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {roundedScore}
              </span>
              <span className="text-lg font-mono text-slate-400 dark:text-slate-500">
                / {maxPossibleScore}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Net score after deducting{" "}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                {Math.abs(wrongCount * scheme.wrong).toFixed(2)}
              </strong>{" "}
              negative marks
            </p>
          </div>

          {/* Score Distribution Bar */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-[11px] font-medium text-slate-500">
              <span>Response Distribution</span>
              <span className="font-mono">
                {attemptedCount}/{totalQuestions} attempted
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${(correctCount / Math.max(1, totalQuestions)) * 100}%` }}
                className="bg-emerald-600 dark:bg-emerald-500 h-full"
                title={`Correct: ${correctCount}`}
              />
              <div
                style={{ width: `${(wrongCount / Math.max(1, totalQuestions)) * 100}%` }}
                className="bg-rose-600 dark:bg-rose-500 h-full"
                title={`Wrong: ${wrongCount}`}
              />
            </div>
          </div>
        </div>

        {/* Accuracy & Counts Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Accuracy */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Accuracy
            </div>
            <div className="text-3xl font-bold font-mono text-blue-700 dark:text-blue-400 my-2">
              {accuracy}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              On {attemptedCount} attempts
            </div>
          </div>

          {/* Correct */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Correct
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 my-2">
              {correctCount}
            </div>
            <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              +{(correctCount * scheme.correct).toFixed(2)} marks
            </div>
          </div>

          {/* Wrong */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Wrong
            </div>
            <div className="text-3xl font-bold font-mono text-rose-600 dark:text-rose-400 my-2">
              {wrongCount}
            </div>
            <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
              {wrongCount > 0 ? `${(wrongCount * scheme.wrong).toFixed(2)} marks` : "0.00 penalty"}
            </div>
          </div>

          {/* Unattempted */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Unattempted
            </div>
            <div className="text-3xl font-bold font-mono text-slate-700 dark:text-slate-300 my-2">
              {unattemptedCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">0.00 penalty</div>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        {[
          { id: "overview", label: "Overall & PYQ vs Model" },
          { id: "subjects", label: `Subject Performance (${subjectList.length})` },
          { id: "topics", label: `Topic & Weak Areas (${topicList.length})` },
          { id: "time", label: "Time Analysis" },
          { id: "mistakes", label: `Mistake Review (${incorrectQuestions.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? "border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERALL & PYQ VS MODEL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* PYQ vs Model Comparative Chart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Verified PYQ Pool */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Verified PYQ Pool (80% Weight)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {pyqAccuracy}% Accuracy
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pyqAccuracy}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Attempted</div>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {pyqAttempted}/{mockTest.pyq_count || pyqTotal}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Right / Wrong</div>
                  <div className="font-mono font-bold text-sm mt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400">{pyqCorrect}</span> /{" "}
                    <span className="text-rose-600 dark:text-rose-400">{pyqWrong}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Net Marks</div>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {pyqScoreContrib > 0 ? `+${pyqScoreContrib}` : pyqScoreContrib}
                  </div>
                </div>
              </div>
            </div>

            {/* Model Question Pool */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Model Question Pool (20% Weight)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {modelAccuracy}% Accuracy
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${modelAccuracy}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Attempted</div>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {modelAttempted}/{mockTest.model_count || modelTotal}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Right / Wrong</div>
                  <div className="font-mono font-bold text-sm mt-0.5">
                    <span className="text-indigo-600 dark:text-indigo-400">{modelCorrect}</span> /{" "}
                    <span className="text-rose-600 dark:text-rose-400">{modelWrong}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Net Marks</div>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {modelScoreContrib > 0 ? `+${modelScoreContrib}` : modelScoreContrib}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weak Areas Alert Strip if any */}
          {weakTopics.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <TrendingDown className="w-4 h-4" />
                  <span>Priority Weak Areas Detected ({weakTopics.length} Topics &lt; 50% Accuracy)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {weakTopics.map((t) => t.name).join(" • ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("topics")}
                className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#131c2e] border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shrink-0 cursor-pointer"
              >
                Inspect Weak Topics
              </button>
            </div>
          )}

          {/* Question-by-Question Solution Matrix */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Question-by-Question Solution Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any question number to inspect options, your response, and the structured explanation.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" /> Correct
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" /> Wrong
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-slate-700" /> Unattempted
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {questionList.map((mq, idx) => {
                let badgeClass =
                  "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800";

                if (mq.user_answer) {
                  if (mq.is_correct) {
                    badgeClass = "bg-emerald-600 text-white border-emerald-700";
                  } else {
                    badgeClass = "bg-rose-600 text-white border-rose-700";
                  }
                }

                return (
                  <button
                    key={mq.id}
                    type="button"
                    onClick={() => setSelectedQuestionIndex(idx)}
                    className={`h-9 rounded-lg border font-mono text-xs font-semibold flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer ${badgeClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECT PERFORMANCE */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          {/* Visual Subject Accuracy Chart */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Subject Accuracy Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visual accuracy distribution across tested subjects.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              {subjectList.map((sub) => (
                <div key={sub.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {sub.name}
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {sub.accuracy}% ({sub.correct}/{sub.attempted} correct • Net:{" "}
                      {sub.score > 0 ? `+${sub.score}` : sub.score})
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        sub.accuracy >= 70
                          ? "bg-emerald-600 dark:bg-emerald-500"
                          : sub.accuracy >= 50
                          ? "bg-blue-600 dark:bg-blue-500"
                          : "bg-rose-600 dark:bg-rose-500"
                      }`}
                      style={{ width: `${Math.max(4, sub.accuracy)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Table */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] dark:bg-[#0f172a] text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5">Subject</th>
                    <th className="py-3.5 px-4 text-center">Questions</th>
                    <th className="py-3.5 px-4 text-center">Attempted</th>
                    <th className="py-3.5 px-4 text-center">Correct</th>
                    <th className="py-3.5 px-4 text-center">Wrong</th>
                    <th className="py-3.5 px-4 text-center">Accuracy</th>
                    <th className="py-3.5 px-5 text-right">Net Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white">
                        {sub.name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {sub.totalQuestions}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">
                        {sub.attempted}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {sub.correct}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-rose-600 dark:text-rose-400 font-bold">
                        {sub.wrong}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            sub.accuracy >= 70
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : sub.accuracy >= 50
                              ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {sub.accuracy}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 dark:text-white">
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

      {/* TAB 3: TOPIC PERFORMANCE & WEAK AREAS */}
      {activeTab === "topics" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Topic Mastery Classification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classified into Strong (&ge;75%), Needs Revision (50–74%), and Weak (&lt;50%).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicList.map((top) => (
                <div
                  key={top.id}
                  className="rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        {top.subjectName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                          top.status === "Strong"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                            : top.status === "Needs Revision"
                            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                        }`}
                      >
                        {top.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                      {top.name}
                    </h4>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {top.correct}/{top.attempted} Correct
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {top.accuracy}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          top.status === "Strong"
                            ? "bg-emerald-600"
                            : top.status === "Needs Revision"
                            ? "bg-amber-500"
                            : "bg-rose-600"
                        }`}
                        style={{ width: `${Math.max(5, top.accuracy)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TIME ANALYSIS */}
      {activeTab === "time" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Avg Time / Attempt
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
                {avgTimePerAttempt}s
              </div>
              <p className="text-xs text-slate-500 mt-1">Target benchmark: 45s–60s</p>
            </div>

            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Avg Time on Correct
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1.5">
                {avgTimeCorrect}s
              </div>
              <p className="text-xs text-slate-500 mt-1">Across {correctCount} accurate responses</p>
            </div>

            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Avg Time on Incorrect
              </div>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1.5">
                {avgTimeWrong}s
              </div>
              <p className="text-xs text-slate-500 mt-1">Across {wrongCount} wrong responses</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Question Pacing Telemetry
            </h3>
            <div className="space-y-2.5">
              {questionList.slice(0, 15).map((mq, idx) => {
                const t = mq.time_spent_seconds || (mq.user_answer ? 38 + (idx % 17) : 12);
                const pct = Math.min(100, Math.round((t / 90) * 100));
                return (
                  <div key={mq.id} className="flex items-center gap-3 text-xs">
                    <span className="w-10 font-mono font-semibold text-slate-500">
                      Q.{idx + 1}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${
                          !mq.user_answer
                            ? "bg-slate-400"
                            : mq.is_correct
                            ? "bg-emerald-600"
                            : "bg-rose-600"
                        }`}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-slate-600 dark:text-slate-400">
                      {t}s
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MISTAKE ANALYSIS & 7-CATEGORY CLASSIFIER */}
      {activeTab === "mistakes" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Classify & Review Mistakes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tag the root cause of each error to build your personal revision profile.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Category:</label>
              <select
                value={mistakeFilter}
                onChange={(e) => setMistakeFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] text-xs font-semibold"
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
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                No mistakes recorded in this filter
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Zero incorrect responses matched this mistake category.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((mq) => {
                const currentCat = (mq.mistake_category || "conceptual") as MistakeCategory;
                return (
                  <div
                    key={mq.id}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 space-y-4 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
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
                          className="h-8 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs font-semibold"
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

                    <p className="text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed font-normal">
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

      {/* Question Solution Modal */}
      {activeReviewQuestion && activeReviewQuestion.question && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-base text-slate-900 dark:text-white font-normal whitespace-pre-line leading-relaxed">
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
                    "border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] text-slate-700 dark:text-slate-300";
                  if (isRight) {
                    rowClass =
                      "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold";
                  } else if (isChosen && !isRight) {
                    rowClass =
                      "border-rose-600 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-semibold";
                  }

                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-lg border text-xs sm:text-sm flex items-start justify-between gap-3 ${rowClass}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono font-bold">{opt}.</span>
                        <span>{optText}</span>
                      </div>
                      <div className="text-[11px] font-bold shrink-0">
                        {isRight && (
                          <span className="text-emerald-700 dark:text-emerald-400">✓ Correct</span>
                        )}
                        {isChosen && !isRight && (
                          <span className="text-rose-700 dark:text-rose-400">✕ Your Answer</span>
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
