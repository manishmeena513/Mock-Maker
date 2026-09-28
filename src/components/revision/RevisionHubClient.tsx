"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Question, MistakeCategory } from "@/types/database";
import { QuestionTypeBadge } from "@/components/shared/QuestionTypeBadge";
import { ExplanationPanel } from "@/components/test/ExplanationPanel";
import {
  ALL_CATALOG_EXAMS as SEED_EXAMS,
  ALL_CATALOG_SUBJECTS as SEED_SUBJECTS,
  ALL_CATALOG_TOPICS as SEED_TOPICS,
} from "@/lib/data/examTaxonomy";
import { toggleBookmarkAction } from "@/app/actions/bookmark";
import { generateRetestDrillAction } from "@/app/actions/mock";
import {
  Bookmark,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Play,
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

type PrimaryRevisionTab = "saved" | "mistakes" | "weak";
type SavedCategoryFilter = "all" | "important" | "difficult" | "revise_later";

export function RevisionHubClient({ initialSaved, initialMistakes }: RevisionHubClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PrimaryRevisionTab>("saved");
  const [savedCategoryFilter, setSavedCategoryFilter] = useState<SavedCategoryFilter>("all");
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

  // Aggregate weak areas from mistakes
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

  const primaryTabs: { id: PrimaryRevisionTab; label: string; count: number }[] = [
    { id: "saved", label: "Saved", count: savedItems.length },
    { id: "mistakes", label: "Mistakes", count: initialMistakes.length },
    { id: "weak", label: "Weak Areas", count: weakTopics.length },
  ];

  return (
    <div className="space-y-6">
      {/* Clean 3-Tab Navigation Bar: Saved | Mistakes | Weak Areas */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] overflow-x-auto">
        <div role="tablist" aria-label="Revision Library Tabs" className="flex items-center gap-6">
          {primaryTabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(t.id)}
                className={`py-3 text-xs font-medium border-b-2 transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "border-[var(--foreground)] text-[var(--foreground)] font-semibold"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <span>{t.label}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--muted)] text-[var(--muted-foreground)]">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: SAVED QUESTIONS */}
      {activeTab === "saved" && (
        <div className="space-y-4 animate-editorial">
          {/* Sub-filter + Practice All Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Saved" },
                  { id: "important", label: "Important" },
                  { id: "difficult", label: "Difficult" },
                  { id: "revise_later", label: "Revise Later" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSavedCategoryFilter(cat.id)}
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    savedCategoryFilter === cat.id
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {filteredSaved.length > 0 && (
              <button
                type="button"
                onClick={() => handleStartRetest(filteredSaved.map((s) => s.question.id))}
                disabled={isStartingDrill}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>
                  {isStartingDrill ? "Starting..." : `Practice All (${filteredSaved.length})`}
                </span>
              </button>
            )}
          </div>

          {filteredSaved.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <div className="w-10 h-10 rounded-md bg-[var(--muted)] border border-[var(--border)] mx-auto mb-3.5 flex items-center justify-center text-[var(--muted-foreground)]">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--foreground)]">
                No saved questions yet.
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-xs mx-auto mt-1 leading-relaxed">
                Save questions while practicing and they will appear here.
              </p>
              <div className="mt-5">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explore Questions</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
              {filteredSaved.map((item) => {
                const q = item.question;
                const isExpanded = expandedQuestionId === q.id;
                const examName = resolveExamName(q.exam_id);
                const subjectName = resolveSubjectName(q.subject_id);
                const topicName = resolveTopicName(q);

                return (
                  <div key={item.id} className="p-5 space-y-3">
                    {/* Compact Row: Question | Exam | Topic | Status + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <QuestionTypeBadge
                            type={q.type}
                            examName={examName}
                            sourceYear={q.source_year}
                          />
                          <span className="text-[var(--muted-foreground)]">
                            {subjectName} • {topicName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-muted)] text-[var(--accent)]">
                            {item.category.replace("_", " ")}
                          </span>
                        </div>

                        <p className="text-sm sm:text-base text-[var(--foreground)] leading-relaxed">
                          {q.question_text}
                        </p>
                      </div>

                      {/* Actions: Practice | Review | Remove */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartRetest([q.id])}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Practice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide" : "Review"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveBookmark(q.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove from Saved"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-4 border-t border-[var(--border)] space-y-3">
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
                                className={`p-3 rounded-md border flex items-start gap-2 ${
                                  isCorrect
                                    ? "bg-[var(--sage-muted)] border-[var(--sage)] font-medium text-[var(--foreground)]"
                                    : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                                }`}
                              >
                                <span className="font-mono font-semibold">{opt}.</span>
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
                          questionText={q.question_text}
                          options={{
                            A: q.option_a,
                            B: q.option_b,
                            C: q.option_c,
                            D: q.option_d,
                          }}
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

      {/* TAB 2: MISTAKES */}
      {activeTab === "mistakes" && (
        <div className="space-y-4 animate-editorial">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-[var(--muted-foreground)]">
                Mistake Type:
              </span>
              <select
                value={mistakeCategoryFilter}
                onChange={(e) => setMistakeCategoryFilter(e.target.value)}
                className="h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--card)] text-xs font-medium text-[var(--foreground)]"
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
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>
                  {isStartingDrill ? "Starting..." : `Practice ${filteredMistakes.length} Mistakes`}
                </span>
              </button>
            )}
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-[var(--sage)] mx-auto mb-3" />
              <div className="font-semibold text-sm text-[var(--foreground)]">
                No mistakes logged in this category
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
                Incorrect answers from completed mock tests are automatically cataloged here for targeted revision.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
              {filteredMistakes.map((m) => {
                const q = m.question;
                const isExpanded = expandedQuestionId === q.id;
                const examName = resolveExamName(q.exam_id);
                const topicName = resolveTopicName(q);

                return (
                  <div key={m.id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <QuestionTypeBadge
                            type={q.type}
                            examName={examName}
                            sourceYear={q.source_year}
                          />
                          <span className="text-[var(--muted-foreground)]">{topicName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            {m.mistakeCategory} mistake
                          </span>
                          <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                            You: <strong className="text-rose-600">{m.userAnswer}</strong> • Ans:{" "}
                            <strong className="text-[var(--sage)]">{q.correct_answer}</strong>
                          </span>
                        </div>

                        <p className="text-sm sm:text-base text-[var(--foreground)] leading-relaxed">
                          {q.question_text}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartRetest([q.id])}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Practice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide" : "Review"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-[var(--border)]">
                        <ExplanationPanel
                          explanation={q.explanation}
                          correctAnswer={q.correct_answer}
                          userAnswer={m.userAnswer}
                          type={q.type}
                          sourceYear={q.source_year}
                          questionText={q.question_text}
                          options={{
                            A: q.option_a,
                            B: q.option_b,
                            C: q.option_c,
                            D: q.option_d,
                          }}
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

      {/* TAB 3: WEAK AREAS */}
      {activeTab === "weak" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] animate-editorial">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Recurring Weak Topics &amp; Concepts
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Topics with repeated errors across your mock test attempts.
            </p>
          </div>

          {weakTopics.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-8 h-8 text-[var(--sage)] mx-auto mb-2" />
              <div className="font-semibold text-sm text-[var(--foreground)]">
                No recurring weak topics identified yet
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Complete additional mock tests to populate your topic diagnostic list.
              </p>
            </div>
          ) : (
            weakTopics.map((wt, idx) => (
              <div
                key={idx}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                    <span>{wt.subject}</span>
                    <span>•</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      {wt.count} {wt.count === 1 ? "Mistake" : "Mistakes"}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm text-[var(--foreground)]">{wt.name}</h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartRetest(wt.questionIds)}
                  disabled={isStartingDrill}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Practice ({wt.count})</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
