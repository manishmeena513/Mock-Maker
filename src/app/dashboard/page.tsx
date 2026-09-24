import Link from "next/link";
import { getExams } from "@/lib/db";
import { getUserPlanStatus } from "@/lib/plans/limits";
import { createClient } from "@/lib/supabase/server";
import {
  Trophy,
  Target,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  TrendingDown,
  Compass,
  Crown,
} from "lucide-react";

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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Student Analytics
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Your Preparation Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your mock attempt history, overall accuracy, and targeted weak-area revision.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Mock Test</span>
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-blue-500" />
            <span>Mocks Attempted</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            12
          </div>
          <p className="text-xs text-slate-500 mt-1">Across 3 examinations</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-500" />
            <span>Overall Accuracy</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            74%
          </div>
          <p className="text-xs text-slate-500 mt-1">+6% over last 5 tests</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>PYQs Mastered</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            184
          </div>
          <p className="text-xs text-slate-500 mt-1">Verified official questions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Model Solved</span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            46
          </div>
          <p className="text-xs text-slate-500 mt-1">Exam-specific model items</p>
        </div>
      </div>

      {/* Plan Status & Quota Banner */}
      <div
        className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isPremium
            ? "border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20"
            : "border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20"
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span
              className={`font-bold text-sm ${
                isPremium ? "text-amber-950 dark:text-amber-200" : "text-blue-900 dark:text-blue-200"
              }`}
            >
              {isPremium ? "MockMaster Premium Plan" : "Free Aspirant Plan"}
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                isPremium
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
              }`}
            >
              ACTIVE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Daily Mocks: </span>
              {isPremium ? (
                <span className="text-emerald-600 font-bold">Unlimited</span>
              ) : (
                <span>
                  {planStatus.dailyMocksUsed} / {planStatus.dailyMocksLimit} used ({planStatus.dailyMocksRemaining} left today)
                </span>
              )}
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Revision Bookmarks: </span>
              {isPremium ? (
                <span className="text-emerald-600 font-bold">Unlimited</span>
              ) : (
                <span>
                  {planStatus.savedQuestionsCount} / {planStatus.savedQuestionsLimit} capacity
                </span>
              )}
            </div>
            {isPremium && planStatus.validUntil && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Period End: </span>
                <span>{new Date(planStatus.validUntil).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isPremium && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Upgrade to Unlimited</span>
            </Link>
          )}
          <Link
            href="/mock/configure"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <span>Start Practice Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Weak Areas Revision Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Identified Focus Areas (&lt; 60% Accuracy)
            </h3>
          </div>
          <Link
            href="/mock/configure?weak=true"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Practice All Weak Areas →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Federalism & Inter-State Relations
            </div>
            <div className="text-xs text-slate-500 mt-1">Indian Polity • UPSC CSE</div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">8 attempted</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">48% accuracy</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Indian Monsoon & Climatology
            </div>
            <div className="text-xs text-slate-500 mt-1">Geography • UPSC CSE</div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">12 attempted</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">54% accuracy</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Monetary Policy & Inflation
            </div>
            <div className="text-xs text-slate-500 mt-1">Economy • UPPSC / UPSC</div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">10 attempted</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">58% accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Examinations Quick Jump */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          Active Examinations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {exam.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  +{exam.marking_scheme.correct} / {exam.marking_scheme.wrong} marks
                </div>
              </div>
              <Link
                href={`/mock/configure?exam=${exam.slug}`}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
              >
                Mock
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
