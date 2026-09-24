import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug, getSubjectsByExamId, getTopicsBySubjectId } from "@/lib/db";
import { SEED_QUESTIONS } from "@/lib/data/seedData";
import {
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface ExamHubProps {
  params: Promise<{
    examSlug: string;
  }>;
}

export default async function ExamHubPage({ params }: ExamHubProps) {
  const { examSlug } = await params;
  const exam = await getExamBySlug(examSlug);

  if (!exam) {
    notFound();
  }

  const subjects = await getSubjectsByExamId(exam.id);

  // Compute question counts for this exam
  const examQuestions = SEED_QUESTIONS.filter((q) => q.exam_id === exam.id);
  const pyqCount = examQuestions.filter((q) => q.type === "PYQ").length;
  const modelCount = examQuestions.filter((q) => q.type === "MODEL").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-blue-600 transition">
          Exams
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-900 dark:text-white">{exam.name}</span>
      </nav>

      {/* Exam Hero Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Exam Overview & Question Bank
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {exam.name}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {exam.description}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{pyqCount} Verified PYQs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>{modelCount} Model Questions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{exam.time_limit_minutes} min duration</span>
            </div>
          </div>
        </div>

        <div>
          <Link
            href={`/mock/configure?exam=${exam.slug}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Practice Mock</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Official Marking Rules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Correct Answer
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            +{exam.marking_scheme.correct} Marks
          </div>
          <p className="text-xs text-slate-500 mt-1">Full credit for right response</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Negative Marking
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {exam.marking_scheme.wrong} Marks
          </div>
          <p className="text-xs text-slate-500 mt-1">Official deduction penalty</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Unattempted
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
            0.0 Marks
          </div>
          <p className="text-xs text-slate-500 mt-1">No penalty for skipping</p>
        </div>
      </div>

      {/* Subjects & Topics Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Syllabus & Subject Taxonomy
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map(async (subject) => {
            const subjectTopics = await getTopicsBySubjectId(subject.id);
            const subPyqs = examQuestions.filter(
              (q) => q.subject_id === subject.id && q.type === "PYQ"
            ).length;

            return (
              <div
                key={subject.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {subject.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {subPyqs} PYQs
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {subjectTopics.map((top) => (
                      <span
                        key={top.id}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {top.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/mock/configure?exam=${exam.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Practice this subject</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
