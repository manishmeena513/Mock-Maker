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
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import { SEED_SUBJECTS, SEED_TOPICS } from "@/lib/data/seedData";
import { recordMistakeCategoryAction, generateRetestDrillAction } from "@/app/actions/mock";
import {
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  TrendingDown,
  BookOpen,
  Filter,
  Check,
  X,
  Layers,
  Clock,
} from "lucide-react";

interface ResultsClientProps {
  mockTest: MockTest;
  questions: MockQuestion[];
}

export function ResultsClient({ mockTest, questions }: ResultsClientProps) {
  const router = useRouter();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "topics" | "mistakes">("overview");
  const [mistakeFilter, setMistakeFilter] = useState<string>("all");
  const [questionList, setQuestionsList] = useState<MockQuestion[]>(questions);
  const [isRetesting, startRetestTransition] = useTransition();

  // Compute metrics
  const totalQuestions = questionList.length;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  let totalTimeSpent = 0;

  let pyqAttempted = 0;
  let pyqCorrect = 0;
  let modelAttempted = 0;
  let modelCorrect = 0;

  const subjectAgg: Record<string, SubjectPerformanceSummary> = {};
  const topicAgg: Record<string, TopicPerformanceSummary> = {};

  questionList.forEach((mq) => {
    const q = mq.question;
    const subId = q?.subject_id || "general-subject";
    const topId = q?.topic_id || "general-topic";

    const subName = SEED_SUBJECTS.find((s) => s.id === subId)?.name || "General Subject";
    const topName = SEED_TOPICS.find((t) => t.id === topId)?.name || q?.explanation?.concept || "Topic Concept";

    totalTimeSpent += mq.time_spent_seconds || 0;

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
  const pyqScoreContrib = Math.round(((pyqCorrect * scheme.correct) + (pyqWrong * scheme.wrong)) * 100) / 100;

  const modelWrong = modelAttempted - modelCorrect;
  const modelScoreContrib = Math.round(((modelCorrect * scheme.correct) + (modelWrong * scheme.wrong)) * 100) / 100;

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

  // Incorrect questions for mistake analysis
  const incorrectQuestions = questionList.filter((mq) => mq.user_answer && !mq.is_correct);

  const filteredMistakes = incorrectQuestions.filter((mq) => {
    if (mistakeFilter === "all") return true;
    return (mq.mistake_category || "conceptual") === mistakeFilter;
  });

  // Handle mistake category update
  const handleUpdateMistakeCategory = async (orderIndex: number, category: MistakeCategory) => {
    setQuestionsList((prev) =>
      prev.map((item) => (item.order_index === orderIndex ? { ...item, mistake_category: category } : item))
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

  // Retest Mistakes Drill
  const handleRetestMistakes = () => {
    const mistakeQuestionIds = incorrectQuestions.map((mq) => mq.question_id);
    if (mistakeQuestionIds.length === 0) return;

    startRetestTransition(async () => {
      try {
        const res = await generateRetestDrillAction({ questionIds: mistakeQuestionIds });
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Mock Test Completed
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Performance Analysis & Diagnostics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive breakdown across genuine PYQs vs Model questions, subjects, topics, and classified mistakes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {incorrectQuestions.length > 0 && (
            <button
              onClick={handleRetestMistakes}
              disabled={isRetesting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isRetesting ? "Starting Drill..." : `Retest ${incorrectQuestions.length} Mistakes`}</span>
            </button>
          )}

          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Mock</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Overall & 80:20 Split
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "subjects"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Subject Analysis ({subjectList.length})
        </button>
        <button
          onClick={() => setActiveTab("topics")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "topics"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Topic Mastery ({topicList.length})
        </button>
        <button
          onClick={() => setActiveTab("mistakes")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
            activeTab === "mistakes"
              ? "border-rose-600 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span>Mistake Review</span>
          <span className="px-1.5 py-0.5 rounded-full text-xs bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold">
            {incorrectQuestions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & 80:20 BREAKDOWN */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in-50 duration-150">
          {/* Main Score & Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Score Card */}
            <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md shadow-blue-500/15 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                  Exam Score
                </span>
                <Trophy className="w-5 h-5 text-amber-300" />
              </div>
              <div className="my-4">
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  {roundedScore}
                  <span className="text-lg font-normal text-blue-200 ml-2">/ {maxPossibleScore}</span>
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  Marking scheme: +{scheme.correct} correct, {scheme.wrong} wrong
                </p>
              </div>
              <div className="text-xs font-medium text-blue-100 pt-2 border-t border-blue-500/40">
                {accuracy >= 70 ? "Solid performance. Above exam benchmark." : "Focus on high-yield weak areas below."}
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-500" />
                <span>Accuracy</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white my-2">
                {accuracy}%
              </div>
              <div className="text-xs text-slate-500">
                {attemptedCount} attempted of {totalQuestions}
              </div>
            </div>

            {/* Correct */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Correct</span>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 my-2">
                {correctCount}
              </div>
              <div className="text-xs text-slate-500">
                +{(correctCount * scheme.correct).toFixed(2)} marks gained
              </div>
            </div>

            {/* Wrong */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                <span>Wrong</span>
              </div>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 my-2">
                {wrongCount}
              </div>
              <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {wrongCount > 0 ? `${(wrongCount * scheme.wrong).toFixed(2)} negative marks` : "No penalties"}
              </div>
            </div>

            {/* Skipped */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>Skipped</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 my-2">
                {unattemptedCount}
              </div>
              <div className="text-xs text-slate-500">Zero penalty</div>
            </div>
          </div>

          {/* 80:20 PYQ vs Model Performance Breakdown with Score Contribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Verified PYQs (80% Pool)
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {pyqAccuracy}% Accuracy
                </span>
              </div>
              <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Attempted PYQs:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {pyqAttempted} / {mockTest.pyq_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Correct / Wrong:</span>
                  <span className="font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">{pyqCorrect}</span> /{" "}
                    <span className="text-rose-600 dark:text-rose-400">{pyqWrong}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Score Contribution:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {pyqScoreContrib > 0 ? `+${pyqScoreContrib}` : pyqScoreContrib} marks
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${pyqAccuracy}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Model Questions (20% Pool)
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {modelAccuracy}% Accuracy
                </span>
              </div>
              <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Attempted Model Questions:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {modelAttempted} / {mockTest.model_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Correct / Wrong:</span>
                  <span className="font-bold">
                    <span className="text-indigo-600 dark:text-indigo-400">{modelCorrect}</span> /{" "}
                    <span className="text-rose-600 dark:text-rose-400">{modelWrong}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Score Contribution:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {modelScoreContrib > 0 ? `+${modelScoreContrib}` : modelScoreContrib} marks
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${modelAccuracy}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Question-wise Review Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Question Palette Review
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click any question to view full solution & explanation
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {questionList.map((mq, idx) => {
                let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

                if (mq.user_answer) {
                  if (mq.is_correct) {
                    badgeClass = "bg-emerald-500 text-white border-emerald-600 shadow-xs";
                  } else {
                    badgeClass = "bg-rose-500 text-white border-rose-600 shadow-xs";
                  }
                }

                return (
                  <button
                    key={mq.id}
                    onClick={() => setSelectedQuestionIndex(idx)}
                    className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center transition hover:scale-105 cursor-pointer ${badgeClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECT ANALYSIS */}
      {activeTab === "subjects" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Subject-Level Performance Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Detailed metrics for every subject tested in this examination.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Subject</th>
                    <th className="py-3.5 px-4 text-center">Questions</th>
                    <th className="py-3.5 px-4 text-center">Attempted</th>
                    <th className="py-3.5 px-4 text-center">Correct</th>
                    <th className="py-3.5 px-4 text-center">Wrong</th>
                    <th className="py-3.5 px-4 text-center">Accuracy</th>
                    <th className="py-3.5 px-6 text-right">Net Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        {sub.name}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-600 dark:text-slate-400">
                        {sub.totalQuestions}
                      </td>
                      <td className="py-4 px-4 text-center font-medium">
                        {sub.attempted}
                      </td>
                      <td className="py-4 px-4 text-center text-emerald-600 font-bold">
                        {sub.correct}
                      </td>
                      <td className="py-4 px-4 text-center text-rose-600 font-bold">
                        {sub.wrong}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          sub.accuracy >= 70
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : sub.accuracy >= 50
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {sub.accuracy}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900 dark:text-white">
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

      {/* TAB 3: TOPIC MASTERY ANALYSIS */}
      {activeTab === "topics" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Topic Mastery & Revision Status
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Categorized into Strong (&ge;75%), Needs Revision (50–74%), and Weak (&lt;50%).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {topicList.map((top) => (
                <div
                  key={top.id}
                  className={`rounded-2xl p-5 border shadow-xs flex flex-col justify-between ${
                    top.status === "Strong"
                      ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60"
                      : top.status === "Needs Revision"
                      ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/60"
                      : "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        {top.subjectName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        top.status === "Strong"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          : top.status === "Needs Revision"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                      }`}>
                        {top.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {top.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {top.correct}/{top.attempted} Correct
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {top.accuracy}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MISTAKE ANALYSIS & CLASSIFICATION */}
      {activeTab === "mistakes" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Header & Filter Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Classify & Review Mistakes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tag the underlying reason for each incorrect question to address systemic prep weaknesses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Filter:
              </label>
              <select
                value={mistakeFilter}
                onChange={(e) => setMistakeFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="all">All Mistakes ({incorrectQuestions.length})</option>
                <option value="conceptual">Conceptual ({incorrectQuestions.filter(q => q.mistake_category === 'conceptual').length})</option>
                <option value="factual">Factual ({incorrectQuestions.filter(q => q.mistake_category === 'factual').length})</option>
                <option value="misread">Question Misread ({incorrectQuestions.filter(q => q.mistake_category === 'misread').length})</option>
                <option value="calculation">Calculation ({incorrectQuestions.filter(q => q.mistake_category === 'calculation').length})</option>
                <option value="guessing">Guessing ({incorrectQuestions.filter(q => q.mistake_category === 'guessing').length})</option>
                <option value="time_pressure">Time Pressure ({incorrectQuestions.filter(q => q.mistake_category === 'time_pressure').length})</option>
                <option value="other">Other ({incorrectQuestions.filter(q => q.mistake_category === 'other').length})</option>
              </select>
            </div>
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <div className="font-bold text-base text-slate-900 dark:text-white">No mistakes in this category!</div>
              <p className="text-xs text-slate-500 mt-1">Excellent job on this portion of the examination.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((mq) => {
                const currentCat = (mq.mistake_category || "conceptual") as MistakeCategory;
                return (
                  <div
                    key={mq.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Question {mq.order_index}
                        </span>
                        {mq.question && (
                          <QuestionTypeBadge
                            type={mq.question.type}
                            sourceYear={mq.question.source_year}
                          />
                        )}
                      </div>

                      {/* Mistake Category Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Mistake Reason:</span>
                        <select
                          value={currentCat}
                          onChange={(e) => handleUpdateMistakeCategory(mq.order_index, e.target.value as MistakeCategory)}
                          className="py-1 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-bold"
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

                    <p className="text-sm text-slate-900 dark:text-white leading-relaxed font-medium">
                      {mq.question?.question_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
                        <span className="font-bold text-rose-700 dark:text-rose-400">Your Answer: </span>
                        <span>{mq.user_answer || "Unattempted"}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Correct Answer: </span>
                        <span>{mq.question?.correct_answer}</span>
                      </div>
                    </div>

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

      {/* Question Explanation Modal */}
      {activeReviewQuestion && activeReviewQuestion.question && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Question {(selectedQuestionIndex || 0) + 1} Review
                </span>
                <QuestionTypeBadge
                  type={activeReviewQuestion.question.type}
                  sourceYear={activeReviewQuestion.question.source_year}
                />
              </div>

              <button
                onClick={() => setSelectedQuestionIndex(null)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              <p className="text-base text-slate-900 dark:text-white font-medium whitespace-pre-line leading-relaxed">
                {activeReviewQuestion.question.question_text}
              </p>

              <div className="mt-4 space-y-2">
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
                  const isCorrect = activeReviewQuestion.question?.correct_answer === opt;

                  let optClass = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
                  if (isCorrect) {
                    optClass = "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold";
                  } else if (isChosen && !isCorrect) {
                    optClass = "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold";
                  }

                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-xl border flex items-start gap-3 text-sm ${optClass}`}
                    >
                      <span className="font-bold">{opt}.</span>
                      <span>{optText}</span>
                    </div>
                  );
                })}
              </div>

              <ExplanationPanel
                correctAnswer={activeReviewQuestion.question.correct_answer}
                explanation={activeReviewQuestion.question.explanation}
                isUserCorrect={Boolean(activeReviewQuestion.is_correct)}
                userAnswer={activeReviewQuestion.user_answer}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedQuestionIndex(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition"
              >
                Close Solution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
