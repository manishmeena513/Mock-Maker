import Link from "next/link";
import { getExams, getUserAnalytics } from "@/lib/db";
import { getUserPlanStatus } from "@/lib/plans/limits";
import { createClient } from "@/lib/supabase/server";
import {
  Target,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Crown,
  BookOpen,
  SlidersHorizontal,
  Bookmark,
  Search,
  CheckCircle2,
  Clock,
  BarChart3,
  AlertTriangle,
  Layers,
  Award,
  RotateCcw,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { MistakeCategory } from "@/types/database";

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

export default async function DashboardPage() {
  let userId = "default-user";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {
    // dev fallback
  }

  const [exams, planStatus, analytics] = await Promise.all([
    getExams(),
    getUserPlanStatus(userId),
    getUserAnalytics(userId),
  ]);

  const planTier =
    planStatus.plan === "PREMIUM" ? "PRO" : (planStatus.plan || "FREE").toUpperCase();
  const isPaidPlan = planTier === "PRO" || planTier === "ELITE";

  const weakTopics = analytics.topicBreakdown.filter((t) => t.isWeak);
  const strongTopics = analytics.topicBreakdown.filter((t) => t.isStrong);

  const totalMistakeCategorized = Object.values(analytics.mistakeCategoryCounts).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Student Analytics &amp; Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Preparation Telemetry &amp; Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time user-specific performance metrics calculated directly from your completed mock tests, PYQ/Model accuracy, and mistake logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/revision"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Bookmark className="w-4 h-4 text-slate-500" />
            <span>Revision Hub ({analytics.savedQuestionsCount})</span>
          </Link>
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Configure Mock Test</span>
          </Link>
        </div>
      </div>

      {/* 1. OVERVIEW METRICS (100% Real User Data) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="p-4 bg-white dark:bg-[#131c2e]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Mocks Attempted</span>
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {analytics.totalMocksAttempted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics.retestCount > 0
              ? `Includes ${analytics.retestCount} retest drills`
              : "Completed sessions"}
          </p>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#131c2e]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Overall Accuracy</span>
            <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
            {analytics.accuracy !== null ? `${analytics.accuracy}%` : "0%"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics.hasData
              ? `${analytics.totalCorrect} correct / ${analytics.totalQuestionsAttempted} answered`
              : "No enough data yet"}
          </p>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#131c2e]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Average Score</span>
            <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {analytics.averageScore !== null ? analytics.averageScore : "0"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics.bestScore !== null
              ? `Best score: ${analytics.bestScore}`
              : "No enough data yet"}
          </p>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#131c2e]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>PYQs Attempted</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {analytics.pyqAttempted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics.pyqAccuracy !== null
              ? `${analytics.pyqAccuracy}% PYQ accuracy`
              : "No PYQs answered yet"}
          </p>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#131c2e]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Models Attempted</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-2">
            {analytics.modelAttempted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics.modelAccuracy !== null
              ? `${analytics.modelAccuracy}% Model accuracy`
              : "No Models answered yet"}
          </p>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#131c2e]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Time Invested</span>
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {analytics.totalTimeMinutes}m
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics.mistakesCount} logged mistakes
          </p>
        </Card>
      </div>

      {/* Plan Status & Quota Card */}
      <Card
        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          planTier === "ELITE"
            ? "border-amber-400/80 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/15"
            : planTier === "PRO"
            ? "border-blue-300/80 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/15"
            : "bg-white dark:bg-[#131c2e]"
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {isPaidPlan ? (
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              MockMaster {planTier} Plan
            </span>
            <Badge variant={planTier === "ELITE" ? "warning" : isPaidPlan ? "primary" : "default"}>
              ACTIVE
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-900 dark:text-slate-200">Daily Mocks:</span>
              {planStatus.dailyMocksLimit === null ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unlimited</span>
              ) : (
                <span className="tabular-nums">
                  {planStatus.dailyMocksUsed} / {planStatus.dailyMocksLimit} used today
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-900 dark:text-slate-200">Saved Questions:</span>
              {planStatus.savedQuestionsLimit === null ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unlimited</span>
              ) : (
                <span className="tabular-nums">
                  {planStatus.savedQuestionsCount} / {planStatus.savedQuestionsLimit}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-900 dark:text-slate-200">Daily Retests:</span>
              {planStatus.dailyRetestLimit === Infinity ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unlimited</span>
              ) : (
                <span className="tabular-nums">
                  {analytics.retestCount ?? 0} / {planStatus.dailyRetestLimit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {planTier !== "ELITE" && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{planTier === "FREE" ? "Upgrade (from ₹59/mo)" : "Upgrade to Elite"}</span>
            </Link>
          )}
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <span>Start New Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* Empty State Banner when user has 0 completed mocks */}
      {!analytics.hasData && (
        <Card className="p-6 sm:p-8 bg-white dark:bg-[#131c2e] border-dashed border-2 border-slate-300 dark:border-slate-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            No enough data yet — Complete your first mock test
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Your dashboard strictly displays real user-specific calculations with zero fabricated or static numbers. Complete a Practice or Exam mock to populate your score trends, PYQ vs Model comparison, subject mastery, and mistake diagnostics.
          </p>
          <div className="pt-2">
            <Link
              href="/mock/configure"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              <span>Configure Your First Mock</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Card>
      )}

      {/* 2. PERFORMANCE TREND & 5. PYQ VS MODEL + 6. DIFFICULTY PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Trend (Score & Accuracy over time) */}
        <Card className="lg:col-span-7 p-6 bg-white dark:bg-[#131c2e] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Performance Trend (Score &amp; Accuracy)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological progression across your completed mock tests
              </p>
            </div>
            <Badge variant="default">{analytics.performanceTrend.length} Sessions</Badge>
          </div>

          {analytics.performanceTrend.length === 0 ? (
            <div className="h-44 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              No enough data yet — Attempt a mock test to view your accuracy &amp; score trajectory.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.performanceTrend.map((pt, idx) => (
                <div
                  key={pt.mockId}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {pt.examName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({pt.pyqRatio}/{100 - pt.pyqRatio} PYQ/Model)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        Score: {pt.rawScore} / {pt.maxScore}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {pt.accuracy}% Acc
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, Math.min(100, pt.accuracy))}%` }}
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* PYQ vs Model & Difficulty Telemetry */}
        <Card className="lg:col-span-5 p-6 bg-white dark:bg-[#131c2e] space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              PYQ vs Model &amp; Difficulty Accuracy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare official past-paper accuracy against model items and difficulty tiers
            </p>
          </div>

          {/* PYQ vs Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60">
              <div className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                Verified PYQ
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                {analytics.pyqAccuracy !== null ? `${analytics.pyqAccuracy}%` : "—"}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {analytics.pyqCorrect} / {analytics.pyqAttempted} correct
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/60">
              <div className="text-[11px] font-bold uppercase text-indigo-800 dark:text-indigo-300">
                Model Questions
              </div>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums mt-1">
                {analytics.modelAccuracy !== null ? `${analytics.modelAccuracy}%` : "—"}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {analytics.modelCorrect} / {analytics.modelAttempted} correct
              </div>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Difficulty Calibration
            </div>
            {(["easy", "moderate", "hard"] as const).map((tier) => {
              const stat = analytics.difficultyBreakdown[tier];
              return (
                <div
                  key={tier}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-none"
                >
                  <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                    {tier === "moderate" ? "Medium" : tier} Questions
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-500">
                      {stat.correct}/{stat.attempted}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white w-12 text-right">
                      {stat.accuracy !== null ? `${stat.accuracy}%` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 3. SUBJECT PERFORMANCE & 4. TOPIC PERFORMANCE (Weak vs Mastered) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card className="p-6 bg-white dark:bg-[#131c2e] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Subject-Wise Accuracy
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculated from your answered questions across subjects
              </p>
            </div>
          </div>

          {analytics.subjectBreakdown.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
              No enough data yet — Subject breakdown appears automatically after your first mock.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.subjectBreakdown.slice(0, 8).map((sub) => (
                <div key={sub.subjectId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {sub.subjectName}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">({sub.examName})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {sub.accuracy}% ({sub.correct}/{sub.attempted})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, Math.min(100, sub.accuracy))}%` }}
                      className={`h-full rounded-full ${
                        sub.accuracy >= 75
                          ? "bg-emerald-600"
                          : sub.accuracy >= 55
                          ? "bg-blue-600"
                          : "bg-rose-600"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Topic Performance: Weak vs Strong Topics */}
        <Card className="p-6 bg-white dark:bg-[#131c2e] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Topic Mastery &amp; Priority Focus Areas
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Weak topics (&lt;60% accuracy) and mastered topics (&ge;75% accuracy)
              </p>
            </div>
            <Link
              href="/revision"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Revision Hub →
            </Link>
          </div>

          {analytics.topicBreakdown.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
              No enough data yet — Weak and mastered syllabus topics will be identified from your mock attempts.
            </div>
          ) : (
            <div className="space-y-2.5">
              {analytics.topicBreakdown.slice(0, 6).map((top) => (
                <div
                  key={top.topicId}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {top.topicName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {top.subjectName} • {top.attempted} attempted ({top.correct} correct, {top.wrong} wrong)
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {top.isWeak ? (
                      <Badge variant="danger">{top.accuracy}% Weak</Badge>
                    ) : top.isStrong ? (
                      <Badge variant="success">{top.accuracy}% Mastered</Badge>
                    ) : (
                      <Badge variant="default">{top.accuracy}%</Badge>
                    )}
                  </div>
                </div>
              ))}
              {weakTopics.length > 0 || strongTopics.length > 0 ? (
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weak topics flagged: {weakTopics.length}</span>
                  <span>Mastered topics: {strongTopics.length}</span>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {/* 7. 7-CATEGORY MISTAKE ANALYSIS & 8. RECENT MOCK ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Category Mistake Breakdown */}
        <Card className="lg:col-span-5 p-6 bg-white dark:bg-[#131c2e] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Mistake Root-Cause Analysis
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribution across all 7 diagnostic error categories
              </p>
            </div>
            <Badge variant="default">{totalMistakeCategorized} Errors</Badge>
          </div>

          <div className="space-y-2">
            {(Object.keys(MISTAKE_LABELS) as MistakeCategory[]).map((cat) => {
              const count = analytics.mistakeCategoryCounts[cat] || 0;
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200/60 dark:border-slate-800/80 text-xs"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {MISTAKE_LABELS[cat]}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Mock Activity */}
        <Card className="lg:col-span-7 p-6 bg-white dark:bg-[#131c2e] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Mock Activity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your latest mock tests, PYQ/Model ratios, and direct result reports
              </p>
            </div>
            <Link
              href="/mock/configure"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              + New Mock
            </Link>
          </div>

          {analytics.recentMocks.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/70 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              No mock tests attempted yet. Start a Practice or Exam mock to track your sessions here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-2">Exam</th>
                    <th className="py-2.5 px-2">Mode &amp; Ratio</th>
                    <th className="py-2.5 px-2">Score</th>
                    <th className="py-2.5 px-2">Accuracy</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {analytics.recentMocks.map((m) => (
                    <tr key={m.mockId}>
                      <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">
                        {m.examName}
                      </td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                        <span className="capitalize">{m.mode}</span> •{" "}
                        <span className="font-mono">
                          {m.pyqRatio}/{100 - m.pyqRatio}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono font-semibold text-slate-900 dark:text-white">
                        {m.rawScore !== null ? `${m.rawScore}/${m.maxScore}` : "In Progress"}
                      </td>
                      <td className="py-3 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {m.accuracy !== null ? `${m.accuracy}%` : "—"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          href={
                            m.status === "completed"
                              ? `/results/${m.mockId}`
                              : `/test/${m.mockId}`
                          }
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>{m.status === "completed" ? "Analysis" : "Resume"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Supported Competitive Examinations Directory (22 Official Exams) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Supported Competitive Examinations ({exams.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any examination to inspect its official syllabus subjects or start a tailored mock test
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Explore Question Bank</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="p-4 bg-white dark:bg-[#131c2e] flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {exam.name}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {exam.category || "Competitive Exam"} • +{exam.marking_scheme.correct} /{" "}
                  {exam.marking_scheme.wrong}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/exam/${exam.slug}`}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Syllabus
                </Link>
                <Link
                  href={`/mock/configure?exam=${exam.slug}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                >
                  Mock
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
