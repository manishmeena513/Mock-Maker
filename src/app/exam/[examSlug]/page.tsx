import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getExamBySlug,
  getSubjectsByExamId,
  getTopicsBySubjectId,
  getAllQuestions,
} from "@/lib/db";
import { ArrowRight, ChevronRight, Search, Sliders } from "lucide-react";

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

  const pyqCount = examQuestions.filter((q) => q.type === "PYQ").length;
  const modelCount = examQuestions.filter((q) => q.type === "MODEL").length;
  const duration = exam.time_limit_minutes || exam.default_time_minutes || 60;

  const subjectsWithTopics = await Promise.all(
    subjects.map(async (sub) => {
      const topics = await getTopicsBySubjectId(sub.id);
      const subQuestions = examQuestions.filter((q) => q.subject_id === sub.id);
      const subPyqs = subQuestions.filter((q) => q.type === "PYQ").length;
      const subModels = subQuestions.filter((q) => q.type === "MODEL").length;
      return { sub, topics, subPyqs, subModels };
    })
  );

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10 space-y-10 animate-editorial">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <Link href="/#examinations" className="hover:text-[var(--foreground)] transition-colors">
          Examinations
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="font-medium text-[var(--foreground)]">{exam.name}</span>
      </nav>

      {/* Editorial Header */}
      <div className="pb-8 border-b border-[var(--border)] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
            {exam.conducting_body || exam.category || "Official Examination Syllabus"}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-normal text-[var(--foreground)]">
            {exam.name}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            {exam.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href={`/search?exam=${exam.id}`}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            <span>Browse Questions</span>
          </Link>
          <Link
            href={`/mock/configure?exam=${exam.slug}`}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Practice {exam.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Inline Examination Parameters (No Heavy Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pb-8 border-b border-[var(--border)]">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Correct Answer
          </div>
          <div className="text-xl font-mono font-semibold text-[var(--sage)] mt-1">
            +{exam.marking_scheme.correct}
          </div>
        </div>
        <div className="border-l border-[var(--border)] pl-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Negative Marking
          </div>
          <div className="text-xl font-mono font-semibold text-[var(--destructive)] mt-1">
            {exam.marking_scheme.wrong}
          </div>
        </div>
        <div className="border-l border-[var(--border)] pl-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Standard Duration
          </div>
          <div className="text-xl font-mono font-semibold text-[var(--foreground)] mt-1">
            {duration}m
          </div>
        </div>
        <div className="border-l border-[var(--border)] pl-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Verified PYQs
          </div>
          <div className="text-xl font-mono font-semibold text-[var(--sage)] mt-1">
            {pyqCount}
          </div>
        </div>
        <div className="border-l border-[var(--border)] pl-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Model Pool
          </div>
          <div className="text-xl font-mono font-semibold text-[var(--plum)] mt-1">
            {modelCount}
          </div>
        </div>
      </div>

      {/* Syllabus Subjects & Topics Table */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Syllabus Structure ({subjectsWithTopics.length} Subjects)
          </h2>
          <span className="text-xs text-[var(--muted-foreground)]">
            Select any subject to configure a focused practice session
          </span>
        </div>

        <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {subjectsWithTopics.map(({ sub, topics, subPyqs, subModels }, idx) => (
            <div
              key={sub.id}
              className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {sub.name}
                  </h3>
                  {(subPyqs > 0 || subModels > 0) && (
                    <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                      ({subPyqs} PYQ · {subModels} Model)
                    </span>
                  )}
                </div>

                {topics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-6">
                    {topics.map((topic) => (
                      <Link
                        key={topic.id}
                        href={`/mock/configure?exam=${exam.slug}&subject=${sub.id}&topic=${topic.id}`}
                        className="px-2 py-0.5 rounded text-[11px] border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                      >
                        {topic.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pl-6 md:pl-0 shrink-0">
                <Link
                  href={`/search?exam=${exam.id}&subject=${sub.id}`}
                  className="h-8 px-3 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Questions
                </Link>
                <Link
                  href={`/mock/configure?exam=${exam.slug}&subject=${sub.id}`}
                  className="h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                >
                  <span>Practice Subject</span>
                  <ArrowRight className="w-3 h-3 text-[var(--accent)]" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
