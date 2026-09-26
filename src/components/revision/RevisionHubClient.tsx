"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Question, MistakeCategory } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import { SEED_EXAMS, SEED_SUBJECTS, SEED_TOPICS } from "@/lib/data/seedData";
import { toggleBookmarkAction } from "@/app/actions/bookmark";
import { generateRetestDrillAction } from "@/app/actions/mock";
import {
  Bookmark,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  Trash2,
  Play,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

export interface SavedQuestionItem {
  id: string;
  category: "important" | "difficult" | "revise_later";
  saved_at: string;
  question: Question;
}

export interface MistakeReviewItem {
  id: string;
  mockTestId: string;
  orderIndex: number;
  question: Question;
  userAnswer: "A" | "B" | "C" | "D" | null;
  mistakeCategory: MistakeCategory;
  answeredAt?: string | null;
}

interface RevisionHubClientProps {
  initialSaved: SavedQuestionItem[];
  initialMistakes: MistakeReviewItem[];
}

type RevisionTab =
  | "saved"
  | "important"
  | "difficult"
  | "revise_later"
  | "mistakes"
  | "weak";

export function RevisionHubClient({ initialSaved, initialMistakes }: RevisionHubClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RevisionTab>("saved");
  const [mistakeCategoryFilter, setMistakeCategoryFilter] = useState<string>("all");
  const [savedItems, setSavedItems] = useState<SavedQuestionItem[]>(initialSaved);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [isStartingDrill, startDrillTransition] = useTransition();

  const resolveExamName = (examId: string) =>
    SEED_EXAMS.find((e) => e.id === examId)?.name || "Competitive Exam";
  const resolveSubjectName = (subjectId: string) =>
    SEED_SUBJECTS.find((s) => s.id === subjectId)?.name || "General Studies";
  const resolveTopicName = (q: Question) =>
    SEED_TOPICS.find((t) => t.id === q.topic_id)?.name || q.explanation?.concept || "Core Topic";

  // Filter saved questions based on active tab
  const filteredSaved = savedItems.filter((item) => {
    if (activeTab === "saved") return true;
    if (activeTab === "important") return item.category === "important";
    if (activeTab === "difficult") return item.category === "difficult";
    if (activeTab === "revise_later") return item.category === "revise_later";
    return true;
  });

  // Filter mistakes
  const filteredMistakes = initialMistakes.filter((m) => {
    if (mistakeCategoryFilter === "all") return true;
    return (m.mistakeCategory || "conceptual") === mistakeCategoryFilter;
  });

  // Aggregate weak topics from mistakes
  const weakTopicCounts: Record<
    string,
    { name: string; subject: string; count: number; questionIds: string[] }
  > = {};
  initialMistakes.forEach((m) => {
    const topicName = resolveTopicName(m.question);
    const subjectName = resolveSubjectName(m.question.subject_id);
    if (!weakTopicCounts[topicName]) {
      weakTopicCounts[topicName] = {
        name: topicName,
        subject: subjectName,
        count: 0,
        questionIds: [],
      };
    }
    weakTopicCounts[topicName].count++;
    weakTopicCounts[topicName].questionIds.push(m.question.id);
  });
  const weakTopics = Object.values(weakTopicCounts).sort((a, b) => b.count - a.count);

  const handleRemoveBookmark = async (questionId: string) => {
    setSavedItems((prev) => prev.filter((item) => item.question.id !== questionId));
    try {
      await toggleBookmarkAction(questionId);
    } catch (err) {
      console.error("Error removing bookmark:", err);
    }
  };

  const handleStartRetest = (questionIds: string[]) => {
    if (questionIds.length === 0) return;
    startDrillTransition(async () => {
      try {
        const res = await generateRetestDrillAction({ questionIds });
        if (res.drillId) {
          router.push(`/test/${res.drillId}`);
        }
      } catch (err) {
        console.error("Failed to start retest drill:", err);
      }
    });
  };

  const tabs: { id: RevisionTab; label: string; count: number }[] = [
    { id: "saved", label: "Saved", count: savedItems.length },
    {
      id: "important",
      label: "Important",
      count: savedItems.filter((i) => i.category === "important").length,
    },
    {
      id: "difficult",
      label: "Difficult",
      count: savedItems.filter((i) => i.category === "difficult").length,
    },
    {
      id: "revise_later",
      label: "Revise Later",
      count: savedItems.filter((i) => i.category === "revise_later").length,
    },
    { id: "mistakes", label: "Mistakes", count: initialMistakes.length },
    { id: "weak", label: "Weak Topics", count: weakTopics.length },
  ];

  const isSavedView =
    activeTab === "saved" ||
    activeTab === "important" ||
    activeTab === "difficult" ||
    activeTab === "revise_later";

  return (
    <div className="space-y-6">
      {/* 6-Tab Revision Navigation Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div role="tablist" aria-label="Revision Library Tabs" className="flex items-center gap-1">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(t.id)}
                className={`py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SAVED / IMPORTANT / DIFFICULT / REVISE LATER VIEWS */}
      {isSavedView && (
        <div className="space-y-4">
          {filteredSaved.length > 0 && (
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-4 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Showing <strong className="font-mono">{filteredSaved.length}</strong> saved{" "}
                {filteredSaved.length === 1 ? "question" : "questions"} in{" "}
                <span className="font-semibold capitalize">{activeTab.replace("_", " ")}</span>.
              </div>
              <button
                type="button"
                onClick={() => handleStartRetest(filteredSaved.map((s) => s.question.id))}
                disabled={isStartingDrill}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>
                  {isStartingDrill ? "Starting..." : `Practice All (${filteredSaved.length})`}
                </span>
              </button>
            </div>
          )}

          {filteredSaved.length === 0 ? (
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-12 text-center max-w-full">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 mx-auto mb-3.5 flex items-center justify-center text-slate-400">
                <Bookmark className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                No saved questions yet.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Save questions while practicing and they will appear here.
              </p>
              <div className="mt-5">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explore Questions</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSaved.map((item) => {
                const q = item.question;
                const isExpanded = expandedQuestionId === q.id;
                const examName = resolveExamName(q.exam_id);
                const subjectName = resolveSubjectName(q.subject_id);
                const topicName = resolveTopicName(q);

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-4"
                  >
                    {/* Top Metadata Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <QuestionTypeBadge
                          type={q.type}
                          examName={examName}
                          sourceYear={q.source_year}
                        />
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {subjectName} • {topicName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {q.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {item.category.replace("_", " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBookmark(q.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remove from Saved"
                          aria-label="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Preview */}
                    <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white leading-relaxed">
                      {q.question_text}
                    </p>

                    {/* Card Footer Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{isExpanded ? "Hide Review" : "Review"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartRetest([q.id])}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retest Question</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(["A", "B", "C", "D"] as const).map((opt) => {
                            const optText =
                              opt === "A"
                                ? q.option_a
                                : opt === "B"
                                ? q.option_b
                                : opt === "C"
                                ? q.option_c
                                : q.option_d;
                            const isCorrect = q.correct_answer === opt;
                            return (
                              <div
                                key={opt}
                                className={`p-3 rounded-lg border flex items-start gap-2 ${
                                  isCorrect
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-600 font-semibold text-emerald-950 dark:text-emerald-200"
                                    : "border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span className="font-mono font-bold">{opt}.</span>
                                <span>{optText}</span>
                              </div>
                            );
                          })}
                        </div>
                        <ExplanationPanel
                          explanation={q.explanation}
                          correctAnswer={q.correct_answer}
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
        </div>
      )}

      {/* MISTAKES VIEW */}
      {activeTab === "mistakes" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Mistake Category:</span>
              <select
                value={mistakeCategoryFilter}
                onChange={(e) => setMistakeCategoryFilter(e.target.value)}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] text-xs font-semibold"
              >
                <option value="all">All Mistakes ({initialMistakes.length})</option>
                <option value="conceptual">Conceptual</option>
                <option value="factual">Factual</option>
                <option value="misread">Question Misread</option>
                <option value="calculation">Calculation</option>
                <option value="guessing">Guessing</option>
                <option value="time_pressure">Time Pressure</option>
                <option value="other">Other</option>
              </select>
            </div>

            {filteredMistakes.length > 0 && (
              <button
                type="button"
                onClick={() => handleStartRetest(filteredMistakes.map((m) => m.question.id))}
                disabled={isStartingDrill}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>
                  {isStartingDrill ? "Starting..." : `Retest ${filteredMistakes.length} Mistakes`}
                </span>
              </button>
            )}
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                No mistakes logged in this category
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Incorrect answers from completed mock tests are automatically cataloged here for targeted revision.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((m) => {
                const q = m.question;
                const isExpanded = expandedQuestionId === q.id;
                const examName = resolveExamName(q.exam_id);
                const topicName = resolveTopicName(q);

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <QuestionTypeBadge
                          type={q.type}
                          examName={examName}
                          sourceYear={q.source_year}
                        />
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {topicName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {m.mistakeCategory} mistake
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartRetest([q.id])}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retest</span>
                      </button>
                    </div>

                    <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
                        <span className="font-bold text-rose-700 dark:text-rose-400">
                          Your Answer:{" "}
                        </span>
                        <span className="font-mono font-bold">{m.userAnswer}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          Correct Answer:{" "}
                        </span>
                        <span className="font-mono font-bold">{q.correct_answer}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{isExpanded ? "Hide Solution" : "Review"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <ExplanationPanel
                          explanation={q.explanation}
                          correctAnswer={q.correct_answer}
                          userAnswer={m.userAnswer}
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
        </div>
      )}

      {/* WEAK TOPICS VIEW */}
      {activeTab === "weak" && (
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recurring Weak Topics & Concepts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Topics with repeated errors across your mock test attempts.
            </p>
          </div>

          {weakTopics.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                No recurring weak topics identified yet
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete additional mock tests to populate your topic diagnostic list.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weakTopics.map((wt, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#0f172a] flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>{wt.subject}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold">
                        {wt.count} {wt.count === 1 ? "Mistake" : "Mistakes"}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {wt.name}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartRetest(wt.questionIds)}
                    disabled={isStartingDrill}
                    className="inline-flex items-center justify-center gap-1.5 w-full h-8 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Drill Topic ({wt.count})</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
