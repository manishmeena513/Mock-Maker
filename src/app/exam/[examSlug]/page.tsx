import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getExamBySlug,
  getSubjectsByExamId,
  getTopicsBySubjectId,
  getAllQuestions,
} from "@/lib/db";
import {
  Award,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  Search,
  Sliders,
  BookOpen,
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

  const [subjects, examQuestions] = await Promise.all([
    getSubjectsByExamId(exam.id),
    getAllQuestions({ examId: exam.id, status: "approved" }),
  ]);

  // Compute real verified question counts for this exam
  const pyqCount = examQuestions.filter((q) => q.type === "PYQ").length;
  const modelCount = examQuestions.filter((q) => q.type === "MODEL").length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition">
          Examinations
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-white">{exam.name}</span>
      </nav>

      {/* Exam Hero Header Card */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
              <Award className="w-3.5 h-3.5" />
              <span>Official Examination Hub</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {exam.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {exam.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{pyqCount} Verified PYQs</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{modelCount} Reviewed Model Questions</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{exam.time_limit_minutes || exam.default_time_minutes || 60} mins standard duration</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Link
              href={`/mock/configure?exam=${exam.slug}`}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg font-semibold text-xs bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Full / Subject Mock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/search?exam=${exam.id}`}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg font-semibold text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Browse Question Bank</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Official Marking Scheme Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Correct Response
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{exam.marking_scheme.correct} Marks
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Full credit awarded per accurate answer
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Negative Marking Penalty
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {exam.marking_scheme.wrong} Marks
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official commission deduction for wrong answers
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Unattempted Question
          </div>
          <div className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-200 mt-1">
            0.0 Marks
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Zero deduction for skipped questions
          </p>
        </div>
      </div>

      {/* Syllabus & Subject Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Subject & Topic Taxonomy ({subjects.length} Subjects)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a subject to launch a targeted mock or inspect verified questions by topic.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {await Promise.all(
            subjects.map(async (subject) => {
              const subjectTopics = await getTopicsBySubjectId(subject.id);
              const subPyqs = examQuestions.filter(
                (q) => q.subject_id === subject.id && q.type === "PYQ"
              ).length;
              const subModels = examQuestions.filter(
                (q) => q.subject_id === subject.id && q.type === "MODEL"
              ).length;

              return (
                <div
                  key={subject.id}
                  className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {subject.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {subjectTopics.length} core syllabus topics
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                          {subPyqs} PYQ
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                          {subModels} Model
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {subjectTopics.map((top) => (
                        <Link
                          key={top.id}
                          href={`/search?exam=${exam.id}&subject=${subject.id}&topic=${top.id}`}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          {top.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <Link
                      href={`/mock/configure?exam=${exam.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      <span>Start Mock</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href={`/search?exam=${exam.id}&subject=${subject.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Practice Questions</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
