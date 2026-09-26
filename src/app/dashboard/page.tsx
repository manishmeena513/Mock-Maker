import Link from "next/link";
import { getExams } from "@/lib/db";
import { getUserPlanStatus } from "@/lib/plans/limits";
import { createClient } from "@/lib/supabase/server";
import {
  Target,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Crown,
  BookOpen,
  SlidersHorizontal,
  Bookmark,
  Search,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

export default async function DashboardPage() {
  const exams = await getExams();

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

  const planStatus = await getUserPlanStatus(userId);
  const isPremium = planStatus.plan?.toUpperCase() === "PREMIUM";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Student Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Preparation Overview
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Monitor mock attempt telemetry, PYQ mastery, and targeted weak-topic revision.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/revision"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-sm border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition"
          >
            <Bookmark className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span>Revision Hub</span>
          </Link>
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Configure Mock Test</span>
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Mocks Attempted</span>
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums mt-2.5">
            12
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Across {exams.length} examinations</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Overall Accuracy</span>
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2.5">
            74%
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">+6% over last 5 sessions</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Verified PYQs Solved</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums mt-2.5">
            184
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Official commission items</p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Model Questions Solved</span>
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-2.5">
            46
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Syllabus-aligned items</p>
        </Card>
      </div>

      {/* Plan Status & Quota Card */}
      <Card
        className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isPremium
            ? "border-amber-300/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/15"
            : "border-[var(--border)] bg-[var(--card)]"
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            {isPremium ? (
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span className="font-bold text-sm text-[var(--foreground)]">
              {isPremium ? "MockMaster Premium Subscription" : "Standard Aspirant Plan"}
            </span>
            <Badge variant={isPremium ? "warning" : "primary"}>ACTIVE</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <span className="font-semibold text-[var(--foreground)]">Daily Mock Quota:</span>
              {isPremium ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unlimited</span>
              ) : (
                <span className="tabular-nums">
                  {planStatus.dailyMocksUsed} / {planStatus.dailyMocksLimit} used ({planStatus.dailyMocksRemaining} remaining today)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <span className="font-semibold text-[var(--foreground)]">Saved Bookmarks:</span>
              {isPremium ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unlimited</span>
              ) : (
                <span className="tabular-nums">
                  {planStatus.savedQuestionsCount} / {planStatus.savedQuestionsLimit} capacity
                </span>
              )}
            </div>
            {isPremium && planStatus.validUntil && (
              <div>
                <span className="font-semibold text-[var(--foreground)]">Valid Through: </span>
                <span>{new Date(planStatus.validUntil).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isPremium && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>View Pro Plans</span>
            </Link>
          )}
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <span>Start Practice Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* Weak Areas Revision Panel */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-bold text-base text-[var(--foreground)]">
                Priority Focus Areas (&lt; 60% Accuracy)
              </h2>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Topics flagged from recent mock sessions where conceptual or factual accuracy dropped below threshold.
            </p>
          </div>
          <Link
            href="/mock/configure?weak=true"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            <span>Launch Weak-Topic Retest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              topic: "Federalism & Inter-State Relations",
              meta: "Indian Polity • UPSC CSE",
              attempted: 8,
              accuracy: 48,
            },
            {
              topic: "Indian Monsoon & Climatology",
              meta: "Geography • UPSC CSE",
              attempted: 12,
              accuracy: 54,
            },
            {
              topic: "Monetary Policy & Inflation",
              meta: "Indian Economy • UPPSC / UPSC",
              attempted: 10,
              accuracy: 58,
            },
          ].map((item) => (
            <div
              key={item.topic}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 flex flex-col justify-between"
            >
              <div>
                <div className="font-semibold text-sm text-[var(--foreground)]">
                  {item.topic}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">{item.meta}</div>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)] tabular-nums">{item.attempted} attempted</span>
                <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {item.accuracy}% accuracy
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Examinations & Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bold text-base text-[var(--foreground)]">
            Supported Examinations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="p-4 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="font-bold text-sm text-[var(--foreground)]">
                    {exam.name}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5 tabular-nums">
                    +{exam.marking_scheme.correct} correct • -{exam.marking_scheme.wrong} negative
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/exam/${exam.slug}`}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition"
                  >
                    Syllabus
                  </Link>
                  <Link
                    href={`/mock/configure?exam=${exam.slug}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                  >
                    Start Mock
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-base text-[var(--foreground)]">
            Study Resources
          </h2>
          <Card className="p-4 space-y-3">
            <Link
              href="/search"
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)] transition"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Question Explorer</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Search verified PYQs by exam, subject, topic, difficulty, and year.
                </p>
              </div>
            </Link>

            <Link
              href="/revision"
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)] transition"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Mistake & Revision Notebook</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Review bookmarked questions and categorized mock test errors.
                </p>
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
