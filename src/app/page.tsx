import Link from "next/link";
import { getExams } from "@/lib/db";
import { SEED_QUESTIONS, SEED_SUBJECTS } from "@/lib/data/seedData";
import {
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Award,
  CheckCircle2,
  BarChart3,
  RotateCcw,
  Sliders,
  Clock,
  FileCheck2,
  Search,
  Layers,
} from "lucide-react";

export default async function HomePage() {
  const exams = await getExams();

  const totalPyqs = SEED_QUESTIONS.filter((q) => q.type === "PYQ").length;
  const totalModels = SEED_QUESTIONS.filter((q) => q.type === "MODEL").length;

  const coreCapabilities = [
    {
      icon: ShieldCheck,
      label: "01 / AUTHENTICITY",
      title: "Verified PYQs",
      description:
        "Every previous-year question is sourced from official commission papers with verified year and paper attribution. Never mixed or mislabeled.",
      metric: "80% of every mock",
    },
    {
      icon: Sliders,
      label: "02 / SIMULATION",
      title: "Realistic Mock Tests",
      description:
        "Configure full-length or subject-focused mocks enforcing exact UPSC, UPPSC, and SSC negative marking penalties and official durations.",
      metric: "Practice & Exam modes",
    },
    {
      icon: BarChart3,
      label: "03 / DIAGNOSTICS",
      title: "Detailed Analysis",
      description:
        "Dissect performance across PYQ vs Model pools, subject accuracy, topic mastery tiers, and a 7-category mistake taxonomy.",
      metric: "Granular telemetry",
    },
    {
      icon: RotateCcw,
      label: "04 / RETENTION",
      title: "Smart Revision",
      description:
        "Bookmark high-yield questions into structured folders and launch non-destructive retest drills directly from your mistake pool.",
      metric: "1-click retest drills",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Editorial Hero Section */}
      <section className="relative border-b border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0b0f17]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Copy & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Strict 80:20 Architecture • Verified PYQs + Reviewed Model Items</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                Prepare Smarter.
                <br />
                Practice Better.
                <br />
                <span className="text-blue-700 dark:text-blue-400">Perform With Confidence.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Build realistic competitive-exam mocks using verified PYQs and carefully reviewed model questions. Engineered for serious civil services and commission aspirants.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/mock/configure"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-xs"
                >
                  <span>Start a Mock</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Explore Questions</span>
                </Link>
              </div>

              {/* Pillar Bar */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span>Verified PYQs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {totalPyqs} official items
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                    <span>Smart Analytics</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Topic & mistake matrix
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Revision</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Targeted retest drills
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Specification Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#131c2e] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Test Composition Engine
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      Deterministic 80:20 Question Mix
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                    VERIFIED
                  </span>
                </div>

                {/* Visual 80:20 Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-700 dark:text-emerald-400">80% Verified PYQs</span>
                    <span className="text-indigo-700 dark:text-indigo-400">20% Model</span>
                  </div>
                  <div className="h-3 w-full rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex p-0.5 gap-0.5">
                    <div className="h-full w-[80%] bg-emerald-600 dark:bg-emerald-500 rounded-l-md" />
                    <div className="h-full w-[20%] bg-indigo-600 dark:bg-indigo-500 rounded-r-md" />
                  </div>
                </div>

                {/* Sample Paper Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-lg bg-white dark:bg-[#0b0f17] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Authentic Past Papers
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                      {totalPyqs}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                      2012–2024 Commission Papers
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-white dark:bg-[#0b0f17] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Reviewed Model Pool
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                      {totalModels}
                    </div>
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                      Moderated & Syllabus-Aligned
                    </div>
                  </div>
                </div>

                {/* Rules List */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Source Year Hallucination</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">0% (Strictly Prohibited)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unseen Question Priority</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">Active per User</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Artificial Gamification</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Examinations Section */}
      <section id="exams" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Examination Syllabi
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Supported Competitive Examinations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Each examination enforces its official marking scheme, negative marking penalty, and subject-wise question taxonomy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const examSubjects = SEED_SUBJECTS.filter((s) => s.exam_id === exam.id);
            const examQuestions = SEED_QUESTIONS.filter((q) => q.exam_id === exam.id);
            const examPyqs = examQuestions.filter((q) => q.type === "PYQ").length;
            const examModels = examQuestions.filter((q) => q.type === "MODEL").length;

            return (
              <div
                key={exam.id}
                className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{examQuestions.length} Verified Questions</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                      {exam.time_limit_minutes}m
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {exam.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {exam.description}
                  </p>

                  {/* Subject Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {examSubjects.slice(0, 4).map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300"
                      >
                        {sub.name}
                      </span>
                    ))}
                    {examSubjects.length > 4 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800/90 text-slate-500">
                        +{examSubjects.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Marking & Bank Metadata */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Question Pool</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {examPyqs} PYQ + {examModels} Model
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Marking Scheme</span>
                      <span className="font-mono font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">+{exam.marking_scheme.correct}</span>
                        {" / "}
                        <span className="text-rose-600 dark:text-rose-400">{exam.marking_scheme.wrong}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2.5">
                  <Link
                    href={`/mock/configure?exam=${exam.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors"
                  >
                    <span>Start Mock</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/exam/${exam.slug}`}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span>Syllabus & Bank</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section className="py-16 border-t border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0b0f17]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Platform Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Designed for Disciplined Exam Preparation
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Every workflow is built around factual accuracy, structured feedback, and measurable improvement across your examination syllabus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {coreCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#131c2e] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500">
                        {cap.label}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#0b0f17] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-blue-700 dark:text-blue-400">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {cap.metric}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200/90 dark:border-slate-800/90 bg-[#f8f9fa] dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white">
              <Award className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">MockMaster</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Competitive Examination Preparation Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/mock/configure" className="hover:text-slate-900 dark:hover:text-white transition">
              Configure Mock
            </Link>
            <Link href="/search" className="hover:text-slate-900 dark:hover:text-white transition">
              Question Explorer
            </Link>
            <Link href="/revision" className="hover:text-slate-900 dark:hover:text-white transition">
              Revision Hub
            </Link>
            <Link href="/pricing" className="hover:text-slate-900 dark:hover:text-white transition">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
