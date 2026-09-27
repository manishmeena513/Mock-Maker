"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UserAnalyticsSummary } from "@/types/database";
import { UserPlanStatus } from "@/lib/plans/limits";
import { ArrowRight } from "lucide-react";

interface DashboardClientProps {
  userName: string;
  analytics: UserAnalyticsSummary;
  planStatus: UserPlanStatus;
  emptyStateLabel: string;
}

const MISTAKE_LABELS: Record<string, string> = {
  conceptual: "Conceptual Gap",
  factual: "Factual / Memory Gap",
  misread: "Misread Question / NOT",
  calculation: "Calculation / Silly Error",
  guessing: "Blind / 50-50 Guess",
  time_pressure: "Time Pressure",
  other: "Elimination / Other",
  silly_error: "Silly / Reading Error",
  guessed: "Blind / 50-50 Guess",
  misread_question: "Misread NOT / Statement",
  memory_gap: "Factual / Memory Gap",
  elimination_failure: "Elimination Failure",
};

type DashboardTab = "overview" | "subjects" | "topics" | "pyq_model" | "mistakes" | "history";

export function DashboardClient({
  userName,
  analytics,
  planStatus,
  emptyStateLabel,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  const inProgressMock = analytics.recentMocks.find((m) => m.status === "in_progress");
  const weakTopics = analytics.topicBreakdown.filter((t) => t.isWeak).slice(0, 5);
  const strongTopics = analytics.topicBreakdown.filter((t) => t.isStrong).slice(0, 5);

  const mistakeEntries = Object.entries(analytics.mistakeCategoryCounts || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const tabs: Array<{ id: DashboardTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "subjects", label: "Subjects" },
    { id: "topics", label: "Topics" },
    { id: "pyq_model", label: "PYQ vs Model" },
    { id: "mistakes", label: "Mistakes" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10 space-y-10 animate-editorial">
      {/* 1. HEADER: Greeting + Primary Action */}
      <header className="pb-8 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            <span>Preparation Workspace</span>
            <span>·</span>
            <span className="text-[var(--accent)]">{planStatus.tier} Plan</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-normal text-[var(--foreground)]">
            Good evening, {userName}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Continue your preparation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {inProgressMock ? (
            <Link
              href={`/test/${inProgressMock.mockId}`}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-xs font-medium bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-opacity"
            >
              <span>Continue Mock ({inProgressMock.examName})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/mock/configure"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <span>Continue Mock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* 2. PERFORMANCE STRIP: Inline Statistics with Dividers (Not Boxy Cards) */}
      <section aria-label="Performance Summary" className="pb-8 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Performance
          </h2>
          <div className="text-xs text-[var(--muted-foreground)] font-mono">
            Daily Mocks:{" "}
            {planStatus.dailyMocksLimit === Infinity
              ? `${planStatus.dailyMocksUsed} / Unlimited`
              : `${planStatus.dailyMocksUsed} / ${planStatus.dailyMocksLimit}`}{" "}
            · Saved:{" "}
            {planStatus.savedQuestionsLimit === Infinity
              ? `${planStatus.savedQuestionsCount}`
              : `${planStatus.savedQuestionsCount}/${planStatus.savedQuestionsLimit}`}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
          <div>
            <div className="text-xs text-[var(--muted-foreground)]">Accuracy</div>
            <div className="text-2xl sm:text-3xl font-mono font-semibold text-[var(--foreground)] tabular-nums mt-1">
              {analytics.accuracy !== null ? `${analytics.accuracy}%` : "—"}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              {analytics.totalCorrect} correct of {analytics.totalQuestionsAttempted}
            </div>
          </div>

          <div className="border-l border-[var(--border)] pl-6">
            <div className="text-xs text-[var(--muted-foreground)]">Avg Score</div>
            <div className="text-2xl sm:text-3xl font-mono font-semibold text-[var(--foreground)] tabular-nums mt-1">
              {analytics.averageScore !== null ? analytics.averageScore : "—"}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Net commission marks
            </div>
          </div>

          <div className="border-l border-[var(--border)] pl-6">
            <div className="text-xs text-[var(--muted-foreground)]">Attempts</div>
            <div className="text-2xl sm:text-3xl font-mono font-semibold text-[var(--foreground)] tabular-nums mt-1">
              {analytics.totalMocksAttempted}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              {analytics.totalTimeMinutes} mins practiced
            </div>
          </div>

          <div className="border-l border-[var(--border)] pl-6">
            <div className="text-xs text-[var(--muted-foreground)]">Best Score</div>
            <div className="text-2xl sm:text-3xl font-mono font-semibold text-[var(--accent)] tabular-nums mt-1">
              {analytics.bestScore !== null ? analytics.bestScore : "—"}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Peak completed mock
            </div>
          </div>
        </div>
      </section>

      {/* Empty State Banner when user has 0 completed mocks */}
      {!analytics.hasData && (
        <section className="py-8 px-6 rounded-lg border border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {emptyStateLabel}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-xl">
              Complete your first mock test to populate subject accuracy, weak syllabus topics, PYQ vs Model calibration, and mistake diagnostics.
            </p>
          </div>
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] shrink-0"
          >
            <span>Start First Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* 3. PROGRESSIVE DISCLOSURE TABS (Section 13: Analytics & Section 7: Dashboard) */}
      <div className="space-y-8">
        <div
          role="tablist"
          aria-label="Analytics sections"
          className="flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "text-[var(--foreground)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW (Recent Activity, Preparation Areas, Weak Areas, Quick Actions) */}
        {activeTab === "overview" && (
          <div className="space-y-12 animate-editorial">
            {/* Recent Activity */}
            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Recent Activity
                </h3>
                {analytics.recentMocks.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    View all ({analytics.recentMocks.length})
                  </button>
                )}
              </div>

              {analytics.recentMocks.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-4 border-t border-[var(--border)]">
                  No mock attempts recorded yet.
                </p>
              ) : (
                <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                  {analytics.recentMocks.slice(0, 5).map((mock) => (
                    <div
                      key={mock.mockId}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium text-[var(--foreground)]">
                          {mock.examName}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                          {mock.totalQuestions} Qs · {mock.pyqRatio}% PYQ · {mock.mode}
                        </span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="font-mono tabular-nums">
                          {mock.status === "completed" ? (
                            <span>
                              <strong className="text-[var(--foreground)]">{mock.rawScore ?? 0}</strong>
                              <span className="text-[var(--muted-foreground)]">/{mock.maxScore}</span>
                            </span>
                          ) : (
                            <span className="text-[var(--accent)]">In Progress</span>
                          )}
                        </div>
                        <div className="font-mono tabular-nums w-12 text-right text-[var(--muted-foreground)]">
                          {mock.accuracy !== null ? `${mock.accuracy}%` : "—"}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--muted-foreground)] w-20 text-right hidden md:block">
                          {new Date(mock.completedAt || mock.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                        <Link
                          href={
                            mock.status === "completed"
                              ? `/results/${mock.mockId}`
                              : `/test/${mock.mockId}`
                          }
                          className="font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          {mock.status === "completed" ? "Review →" : "Resume →"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Preparation Areas & Weak Areas Two-Column Editorial Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4 border-t border-[var(--border)]">
              {/* Preparation Areas (Subject | Accuracy) */}
              <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Preparation Areas
                  </h3>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                    Subject Accuracy
                  </span>
                </div>

                {analytics.subjectBreakdown.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    No subject accuracy data yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {analytics.subjectBreakdown.slice(0, 6).map((sub) => (
                      <div
                        key={sub.subjectId}
                        className="py-2.5 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="truncate">
                          <span className="font-medium text-[var(--foreground)]">
                            {sub.subjectName}
                          </span>
                          <span className="text-[11px] text-[var(--muted-foreground)] ml-2">
                            {sub.examName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--foreground)]"
                              style={{ width: `${Math.min(100, sub.accuracy)}%` }}
                            />
                          </div>
                          <span className="font-mono font-semibold tabular-nums w-11 text-right text-[var(--foreground)]">
                            {sub.accuracy}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Weak Areas (Only most relevant weak topics) */}
              <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Weak Areas
                  </h3>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                    Priority Revision
                  </span>
                </div>

                {weakTopics.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {analytics.hasData
                      ? "No critical weak topics (<60% accuracy) detected across your completed mocks."
                      : "Complete a mock test to identify weak syllabus topics."}
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {weakTopics.map((t) => (
                      <div
                        key={t.topicId}
                        className="py-2.5 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="truncate">
                          <span className="font-medium text-[var(--foreground)]">
                            {t.topicName}
                          </span>
                          <span className="text-[11px] text-[var(--muted-foreground)] ml-2">
                            {t.subjectName}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-[var(--destructive)] tabular-nums shrink-0">
                          {t.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Quick Actions Strip */}
            <section className="pt-6 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Quick Actions
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/mock/configure"
                  className="h-8 px-3.5 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                >
                  Practice
                </Link>
                <Link
                  href="/revision"
                  className="h-8 px-3.5 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                >
                  Revision ({analytics.mistakesCount})
                </Link>
                <Link
                  href="/revision?tab=saved"
                  className="h-8 px-3.5 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                >
                  Saved ({analytics.savedQuestionsCount})
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveTab("pyq_model")}
                  className="h-8 px-3.5 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                >
                  Analytics
                </button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: SUBJECTS */}
        {activeTab === "subjects" && (
          <section className="space-y-4 animate-editorial">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Subject Performance Breakdown
              </h3>
              <span className="text-xs text-[var(--muted-foreground)]">
                Sorted by question volume
              </span>
            </div>

            {analytics.subjectBreakdown.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-6 border-t border-[var(--border)]">
                No subject performance data recorded yet.
              </p>
            ) : (
              <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                {analytics.subjectBreakdown.map((sub) => (
                  <div
                    key={sub.subjectId}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[var(--foreground)]">
                        {sub.subjectName}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">
                        {sub.examName} · {sub.attempted} attempted ({sub.correct} correct, {sub.wrong} wrong)
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-36 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${Math.min(100, sub.accuracy)}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-sm w-12 text-right tabular-nums text-[var(--foreground)]">
                        {sub.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: TOPICS */}
        {activeTab === "topics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-editorial">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Needs Revision (&lt; 60% Accuracy)
              </h3>
              {weakTopics.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-4 border-t border-[var(--border)]">
                  No weak topics identified yet.
                </p>
              ) : (
                <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                  {weakTopics.map((t) => (
                    <div key={t.topicId} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[var(--foreground)]">{t.topicName}</div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          {t.subjectName} · {t.correct}/{t.attempted} correct
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-[var(--destructive)]">
                        {t.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Mastered Topics (&ge; 75% Accuracy)
              </h3>
              {strongTopics.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-4 border-t border-[var(--border)]">
                  No mastered topics recorded yet.
                </p>
              ) : (
                <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                  {strongTopics.map((t) => (
                    <div key={t.topicId} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[var(--foreground)]">{t.topicName}</div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          {t.subjectName} · {t.correct}/{t.attempted} correct
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-[var(--sage)]">
                        {t.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 4: PYQ VS MODEL & DIFFICULTY CALIBRATION */}
        {activeTab === "pyq_model" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-editorial">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                PYQ vs Model Accuracy Comparison
              </h3>
              <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] text-xs">
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--sage)]">Verified PYQ Pool</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      {analytics.pyqCorrect} correct of {analytics.pyqAttempted} attempted
                    </div>
                  </div>
                  <div className="font-mono text-lg font-semibold text-[var(--foreground)]">
                    {analytics.pyqAccuracy !== null ? `${analytics.pyqAccuracy}%` : "—"}
                  </div>
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--plum)]">Reviewed Model Pool</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      {analytics.modelCorrect} correct of {analytics.modelAttempted} attempted
                    </div>
                  </div>
                  <div className="font-mono text-lg font-semibold text-[var(--foreground)]">
                    {analytics.modelAccuracy !== null ? `${analytics.modelAccuracy}%` : "—"}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Difficulty Calibration
              </h3>
              <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] text-xs">
                {(["easy", "moderate", "hard"] as const).map((level) => {
                  const d = analytics.difficultyBreakdown[level];
                  return (
                    <div key={level} className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="font-medium capitalize text-[var(--foreground)]">
                          {level}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)] ml-2">
                          ({d.correct}/{d.attempted})
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-[var(--foreground)]">
                        {d.accuracy !== null ? `${d.accuracy}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 5: MISTAKES */}
        {activeTab === "mistakes" && (
          <section className="space-y-4 animate-editorial">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Mistake Taxonomy Breakdown
              </h3>
              <Link href="/revision" className="text-xs text-[var(--accent)] hover:underline">
                Open Mistake Revision →
              </Link>
            </div>

            {mistakeEntries.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-6 border-t border-[var(--border)]">
                No categorized mistakes recorded yet.
              </p>
            ) : (
              <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] text-xs">
                {mistakeEntries.map(([cat, count]) => (
                  <div key={cat} className="py-3.5 flex items-center justify-between">
                    <span className="font-medium text-[var(--foreground)]">
                      {MISTAKE_LABELS[cat] || cat}
                    </span>
                    <span className="font-mono font-semibold text-[var(--destructive)]">
                      {count} {count === 1 ? "question" : "questions"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 6: HISTORY */}
        {activeTab === "history" && (
          <section className="space-y-6 animate-editorial">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Complete Mock History ({analytics.recentMocks.length})
            </h3>
            {analytics.recentMocks.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-6 border-t border-[var(--border)]">
                No mock tests attempted yet.
              </p>
            ) : (
              <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] text-xs">
                {analytics.recentMocks.map((mock) => (
                  <div
                    key={mock.mockId}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">
                        {mock.examName}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--muted-foreground)] ml-2.5">
                        {mock.totalQuestions} Qs · {mock.pyqCount} PYQ / {mock.modelCount} Model · {mock.mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono">
                        {mock.status === "completed"
                          ? `${mock.rawScore ?? 0} / ${mock.maxScore} (${mock.accuracy ?? 0}%)`
                          : "In Progress"}
                      </span>
                      <Link
                        href={
                          mock.status === "completed"
                            ? `/results/${mock.mockId}`
                            : `/test/${mock.mockId}`
                        }
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {mock.status === "completed" ? "Report →" : "Resume →"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
