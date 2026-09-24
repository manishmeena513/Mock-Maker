"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Question, MistakeCategory } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import { toggleBookmarkAction } from "@/app/actions/bookmark";
import { generateRetestDrillAction } from "@/app/actions/mock";
import {
  Bookmark,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Trash2,
  Play,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp,
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

export function RevisionHubClient({ initialSaved, initialMistakes }: RevisionHubClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"saved" | "mistakes" | "weak" | "recent">("saved");
  const [savedCategoryFilter, setSavedCategoryFilter] = useState<string>("all");
  const [mistakeCategoryFilter, setMistakeCategoryFilter] = useState<string>("all");
  const [savedItems, setSavedItems] = useState<SavedQuestionItem[]>(initialSaved);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [isStartingDrill, startDrillTransition] = useTransition();

  // Filter saved questions
  const filteredSaved = savedItems.filter((item) => {
    if (savedCategoryFilter === "all") return true;
    return item.category === savedCategoryFilter;
  });

  // Filter mistakes
  const filteredMistakes = initialMistakes.filter((m) => {
    if (mistakeCategoryFilter === "all") return true;
    return (m.mistakeCategory || "conceptual") === mistakeCategoryFilter;
  });

  // Aggregate weak topics from mistakes
  const weakTopicCounts: Record<string, { name: string; count: number; questionIds: string[] }> = {};
  initialMistakes.forEach((m) => {
    const concept = m.question.explanation?.concept || "Core Concept";
    if (!weakTopicCounts[concept]) {
      weakTopicCounts[concept] = { name: concept, count: 0, questionIds: [] };
    }
    weakTopicCounts[concept].count++;
    weakTopicCounts[concept].questionIds.push(m.question.id);
  });
  const weakTopics = Object.values(weakTopicCounts).sort((a, b) => b.count - a.count);

  // Handle Remove Bookmark
  const handleRemoveBookmark = async (questionId: string) => {
    setSavedItems((prev) => prev.filter((item) => item.question.id !== questionId));
    try {
      await toggleBookmarkAction(questionId);
    } catch (err) {
      console.error("Error removing bookmark:", err);
    }
  };

  // Launch Retest Drill for a group of questions
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

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("saved")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 flex items-center gap-2 ${
            activeTab === "saved"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Questions ({savedItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("mistakes")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 flex items-center gap-2 ${
            activeTab === "mistakes"
              ? "border-rose-500 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Mistake Pool ({initialMistakes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("weak")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition shrink-0 flex items-center gap-2 ${
            activeTab === "weak"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Weak Concepts ({weakTopics.length})</span>
        </button>
      </div>

      {/* SECTION 1: SAVED QUESTIONS */}
      {activeTab === "saved" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category:</span>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "important", "difficult", "revise_later"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSavedCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                      savedCategoryFilter === cat
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {filteredSaved.length > 0 && (
              <button
                onClick={() => handleStartRetest(filteredSaved.map((s) => s.question.id))}
                disabled={isStartingDrill}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isStartingDrill ? "Starting Drill..." : `Retest All ${filteredSaved.length} Saved`}</span>
              </button>
            )}
          </div>

          {filteredSaved.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <div className="font-bold text-base text-slate-900 dark:text-white">No saved questions in this category</div>
              <p className="text-xs text-slate-500 mt-1">Bookmark questions during tests or question search to revise them here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSaved.map((item) => {
                const isExpanded = expandedQuestionId === item.question.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <QuestionTypeBadge
                          type={item.question.type}
                          sourceYear={item.question.source_year}
                        />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 capitalize">
                          {item.category.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartRetest([item.question.id])}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retest</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveBookmark(item.question.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                      {item.question.question_text}
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedQuestionId(isExpanded ? null : item.question.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>{isExpanded ? "Hide Solution" : "View Explanation & Options"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(["A", "B", "C", "D"] as const).map((opt) => {
                            const optText =
                              opt === "A"
                                ? item.question.option_a
                                : opt === "B"
                                ? item.question.option_b
                                : opt === "C"
                                ? item.question.option_c
                                : item.question.option_d;
                            const isCorrect = item.question.correct_answer === opt;
                            return (
                              <div
                                key={opt}
                                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                  isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-900 dark:text-emerald-200"
                                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span>{opt}.</span>
                                <span>{optText}</span>
                              </div>
                            );
                          })}
                        </div>
                        <ExplanationPanel
                          explanation={item.question.explanation}
                          correctAnswer={item.question.correct_answer}
                          type={item.question.type}
                          sourceYear={item.question.source_year}
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

      {/* SECTION 2: MISTAKE POOL */}
      {activeTab === "mistakes" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter Reason:</span>
              <select
                value={mistakeCategoryFilter}
                onChange={(e) => setMistakeCategoryFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="all">All Mistakes ({initialMistakes.length})</option>
                <option value="conceptual">Conceptual Mistakes</option>
                <option value="factual">Factual Mistakes</option>
                <option value="misread">Question Misread</option>
                <option value="calculation">Calculation Mistakes</option>
                <option value="guessing">Guessing Mistakes</option>
                <option value="time_pressure">Time Pressure</option>
                <option value="other">Other</option>
              </select>
            </div>

            {filteredMistakes.length > 0 && (
              <button
                onClick={() => handleStartRetest(filteredMistakes.map((m) => m.question.id))}
                disabled={isStartingDrill}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isStartingDrill ? "Starting Drill..." : `Retest ${filteredMistakes.length} Mistakes`}</span>
              </button>
            )}
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <div className="font-bold text-base text-slate-900 dark:text-white">Zero mistakes recorded in this category!</div>
              <p className="text-xs text-slate-500 mt-1">Mistakes from completed mocks automatically collect here for targeted re-testing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((m) => {
                const isExpanded = expandedQuestionId === m.question.id;
                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <QuestionTypeBadge
                          type={m.question.type}
                          sourceYear={m.question.source_year}
                        />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 capitalize">
                          {m.mistakeCategory} Mistake
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartRetest([m.question.id])}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retest This</span>
                      </button>
                    </div>

                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                      {m.question.question_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
                        <span className="font-bold text-rose-700 dark:text-rose-400">Your Answer: </span>
                        <span>{m.userAnswer}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Correct Answer: </span>
                        <span>{m.question.correct_answer}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(isExpanded ? null : m.question.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition pt-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{isExpanded ? "Hide Explanation" : "View Structured Explanation"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <ExplanationPanel
                          explanation={m.question.explanation}
                          correctAnswer={m.question.correct_answer}
                          userAnswer={m.userAnswer}
                          type={m.question.type}
                          sourceYear={m.question.source_year}
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

      {/* SECTION 3: WEAK CONCEPTS */}
      {activeTab === "weak" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Recurring Weak Concepts
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Concepts where you have logged multiple incorrect attempts across completed exams.
            </p>

            {weakTopics.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <div className="font-semibold text-sm">No critical weak concepts detected.</div>
                <p className="text-xs text-slate-400 mt-1">Keep attempting mocks to calibrate your diagnostic profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {weakTopics.map((wt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-1">
                        <span>Weak Concept</span>
                        <span>{wt.count} Mistakes</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {wt.name}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleStartRetest(wt.questionIds)}
                      disabled={isStartingDrill}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retest Concept ({wt.count})</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
