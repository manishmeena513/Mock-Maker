import Link from "next/link";
import { getExams, getAllSubjects, getAllQuestions } from "@/lib/db";
import { ExamBrowserClient } from "@/components/exam/ExamBrowserClient";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const [exams, allSubjects, allQuestions] = await Promise.all([
    getExams(),
    getAllSubjects(),
    getAllQuestions({ status: "approved" }),
  ]);

  const totalPyqs = allQuestions.filter((q) => q.type === "PYQ").length;
  const totalModels = allQuestions.filter((q) => q.type === "MODEL").length;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Section 23: Editorial Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mm-container py-12 sm:py-16 lg:py-22">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
            {/* Left Column: Editorial Headline & Primary Actions */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-7 animate-editorial">
              <div className="inline-flex items-center gap-2.5 text-[11px] sm:text-xs font-mono uppercase tracking-[0.16em] text-[var(--accent)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <span>MockMaster · Competitive Examination Platform</span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-fluid-hero font-normal tracking-tight text-[var(--foreground)]">
                  Serious preparation.
                  <br />
                  <span className="italic text-[var(--accent)]">Measurable progress.</span>
                </h1>
              </div>

              <p className="text-sm sm:text-base lg:text-lg text-[var(--muted-foreground)] max-w-xl leading-relaxed">
                Practice with verified PYQs, analyze your performance, and identify exactly where you need to improve.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <Link
                  href="/mock/configure"
                  className="mm-btn-press inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md font-medium text-sm bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 group"
                >
                  <span>Start Practicing</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>

                <a
                  href="#examinations"
                  className="mm-btn-press inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md font-medium text-sm border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/60"
                >
                  <span>Explore Exams</span>
                </a>
              </div>

              {/* Inline Editorial Telemetry Strip */}
              <div className="pt-7 sm:pt-8 border-t border-[var(--border)] grid grid-cols-3 gap-4 sm:gap-6 max-w-lg">
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-mono font-semibold text-[var(--foreground)] tabular-nums">
                    {exams.length}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[var(--muted-foreground)] mt-0.5">
                    Competitive Exams
                  </div>
                </div>
                <div className="border-l border-[var(--border)] pl-4 sm:pl-6 min-w-0">
                  <div className="text-xl sm:text-2xl font-mono font-semibold text-[var(--sage)] tabular-nums">
                    {totalPyqs}+
                  </div>
                  <div className="text-[11px] sm:text-xs text-[var(--muted-foreground)] mt-0.5">
                    Verified PYQs
                  </div>
                </div>
                <div className="border-l border-[var(--border)] pl-4 sm:pl-6 min-w-0">
                  <div className="text-xl sm:text-2xl font-mono font-semibold text-[var(--plum)] tabular-nums">
                    80 : 20
                  </div>
                  <div className="text-[11px] sm:text-xs text-[var(--muted-foreground)] mt-0.5">
                    Default PYQ : Model
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sophisticated Architectural Product Preview */}
            <div className="lg:col-span-5 animate-editorial stagger-2">
              <div className="mm-card-interactive rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-xs">
                {/* Preview Header Bar */}
                <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-semibold text-[var(--foreground)] truncate">
                      UPSC CSE · GS Paper I
                    </span>
                    <span className="text-[var(--muted-foreground)]">·</span>
                    <span className="font-mono text-[11px] text-[var(--sage)] shrink-0">
                      PYQ 2023
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">
                    +2.00 / -0.66
                  </span>
                </div>

                {/* Preview Question Body */}
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                      Question 14 of 100 · Indian Polity &amp; Governance
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      Consider the following statements regarding the Constitutional Amendment Bill under Article 368 of the Constitution of India:
                    </p>
                    <div className="pl-3 border-l-2 border-[var(--border)] space-y-1 text-xs text-[var(--muted-foreground)]">
                      <p>1. Prior permission of the President is not required to introduce the bill.</p>
                      <p>2. There is no provision for holding a joint sitting in case of disagreement.</p>
                    </div>
                  </div>

                  {/* Preview Options */}
                  <div className="space-y-2 text-xs">
                    <div className="px-3.5 py-2.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] flex items-center gap-3">
                      <span className="font-mono text-[11px]">A</span>
                      <span>1 only</span>
                    </div>
                    <div className="px-3.5 py-2.5 rounded border border-[var(--sage-border)] bg-[var(--sage-soft)] text-[var(--foreground)] font-medium flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] font-semibold text-[var(--sage)]">C</span>
                        <span>Both 1 and 2</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--sage)]">
                        Verified Key
                      </span>
                    </div>
                  </div>

                  {/* Preview Analytical Footer */}
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted-foreground)]">
                    <span>24th Amendment Act, 1971 · Article 368(2)</span>
                    <span className="font-mono text-[var(--accent)]">
                      {totalModels} Model items ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Methodology Strip (Dividers, No Boxy Cards) */}
      <section className="border-b border-[var(--border)] bg-[var(--card)]/50">
        <div className="mm-container py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:divide-x md:divide-[var(--border)]">
            <div className="space-y-2 md:pr-6">
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
                01 / Authenticity
              </div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Uncompromised PYQ Provenance
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Every previous-year question is attributed to its official commission paper and year. Model questions are strictly separated and moderated.
              </p>
            </div>

            <div className="space-y-2 md:px-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
                02 / Calibration
              </div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Controlled PYQ : Model Ratios
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Start with the recommended 80% PYQ + 20% Model standard or dial in any custom ratio from 100/0 pure past papers to 0/100 fresh drills.
              </p>
            </div>

            <div className="space-y-2 md:pl-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
                03 / Diagnostics
              </div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Mistake &amp; Syllabus Telemetry
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Identify weak syllabus topics, compare PYQ vs Model accuracy, and classify errors across 7 diagnostic categories without gamified noise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: Compact Searchable Examination Browser */}
      <section id="examinations" className="py-12 sm:py-16">
        <div className="mm-container space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
                Examination Directory
              </div>
              <h2 className="font-display text-fluid-h1 font-normal text-[var(--foreground)]">
                Select an examination to begin
              </h2>
            </div>
            <Link
              href="/mock/configure"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline group"
            >
              <span>Open Custom Mock Builder</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <ExamBrowserClient exams={exams} subjects={allSubjects} />
        </div>
      </section>
    </div>
  );
}
