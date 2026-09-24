import Link from "next/link";
import { getExams } from "@/lib/db";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  BookOpen,
  Award,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default async function HomePage() {
  const exams = await getExams();

  const comingSoonExams = [
    { name: "Delhi Police Executive", category: "Police" },
    { name: "Banking & RBI Grade B", category: "Banking" },
    { name: "Railway RRB NTPC", category: "Railways" },
    { name: "CUET UG & PG", category: "University" },
    { name: "State PCS (BPSC / MPPSC)", category: "State Civil Services" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-blue-50/40 via-white to-slate-50 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 mb-6 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>80% Verified PYQs + 20% AI Model Questions</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
            Exam-Grade Mock Tests.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Instant Feedback. Zero Fake PYQs.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop relying on scattered PDFs and unverified websites. Generate an authentic test in seconds: select your exam, subject, and topic, and start practicing with official marking rules.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/mock/configure"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/25"
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate Mock Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="#exams"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-base border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition"
            >
              <span>Explore Examinations</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 max-w-3xl mx-auto grid grid-cols-3 gap-4 pt-8 border-t border-slate-200/80 dark:border-slate-800 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                300+
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                Verified PYQs Seeded
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                80 : 20
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                PYQ to Model Ratio
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                100%
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                Authentic Sourcing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Examination Selection Section */}
      <section id="exams" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-10 text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Official Syllabi Supported
          </span>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Select Your Examination
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Each exam carries its authentic marking scheme, negative marking deductions, and verified question bank.
          </p>
        </div>

        {/* Active Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Live Verified Bank
                  </span>
                  <Award className="w-5 h-5 text-blue-600" />
                </div>

                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white mb-2">
                  {exam.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {exam.description}
                </p>

                <div className="mt-5 space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Negative Marking:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {exam.marking_scheme.wrong} marks
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Mark:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{exam.marking_scheme.correct} marks
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Duration:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {exam.time_limit_minutes} minutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href={`/mock/configure?exam=${exam.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                >
                  <span>Start Mock</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/exam/${exam.slug}`}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  View Topics
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Exams */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Expanding to Next (Phase 2 & 3)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {comingSoonExams.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 text-center opacity-60 flex flex-col justify-center items-center"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 mb-1" />
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{item.category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Principles / Authenticity Section */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Built on 5 Core Integrity Principles
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Exam preparation requires unflinching factual accuracy. Here is our architectural guarantee to every aspirant:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                PYQ Authenticity Guarantee
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                An AI-generated question is NEVER presented as a PYQ. Every question in your test displays a clear badge indicating whether it is an official verified PYQ or an AI model question.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                Instant Explanations in Practice Mode
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Learn why your answer was wrong immediately. Structured explanations break down: Why, Core Concept, Exam Perspective, and Memory Hook.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                Automatic Weak Area Diagnostics
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your performance is broken down topic by topic. With a single click, generate targeted mocks focused specifically on concepts where your accuracy dropped below 60%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">MockMaster</span>
            <span>•</span>
            <span>AI-Powered Competitive Exam Preparation Platform</span>
          </div>
          <div>80% Verified PYQs • 20% Model Questions • Instant Learning</div>
        </div>
      </footer>
    </div>
  );
}
