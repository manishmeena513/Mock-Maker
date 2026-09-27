"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Exam, Subject, Topic, PYQ_MODEL_RATIOS, PYQModelRatio } from "@/types/database";
import { generateMockAction } from "@/app/actions/mock";
import { ArrowRight, Check, AlertCircle, Search, Loader2 } from "lucide-react";

interface MockConfigWizardProps {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  examQuestionCounts?: Record<string, { pyq: number; model: number }>;
  initialExamSlug?: string;
}

const QUESTION_COUNT_PRESETS = [10, 20, 25, 50, 100] as const;

export function MockConfigWizard({
  exams,
  subjects,
  topics,
  examQuestionCounts = {},
  initialExamSlug,
}: MockConfigWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Exam Selection
  const [examSearch, setExamSearch] = useState("");
  const [selectedExamSlug, setSelectedExamSlug] = useState<string>(
    initialExamSlug || exams[0]?.slug || "upsc-cse"
  );
  const selectedExam = useMemo(
    () => exams.find((e) => e.slug === selectedExamSlug) || exams[0],
    [exams, selectedExamSlug]
  );

  // Step 2: Subject / Topic Selection
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  // Step 3: Question Configuration
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [pyqRatio, setPyqRatio] = useState<PYQModelRatio>(80);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");

  // Step 4: Mode
  const [mode, setMode] = useState<"practice" | "exam">("exam");

  const filteredExams = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        (e.conducting_body || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q)
    );
  }, [exams, examSearch]);

  const examSubjects = useMemo(
    () => subjects.filter((s) => s.exam_id === selectedExam?.id),
    [subjects, selectedExam]
  );

  const availableTopics = useMemo(() => {
    const activeSubIds =
      selectedSubjectIds.length > 0
        ? new Set(selectedSubjectIds)
        : new Set(examSubjects.map((s) => s.id));
    return topics.filter((t) => activeSubIds.has(t.subject_id));
  }, [topics, selectedSubjectIds, examSubjects]);

  const targetPyqCount = Math.round(questionCount * (pyqRatio / 100));
  const targetModelCount = questionCount - targetPyqCount;
  const modelRatio = 100 - pyqRatio;
  const estimatedMinutes = Math.max(10, Math.round(questionCount * 1.2));

  const handleSelectExam = (slug: string) => {
    setSelectedExamSlug(slug);
    setSelectedSubjectIds([]);
    setSelectedTopicIds([]);
    setErrorMsg(null);
  };

  const toggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
    setSelectedTopicIds([]);
  };

  const toggleTopic = (topId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topId) ? prev.filter((id) => id !== topId) : [...prev, topId]
    );
  };

  const handleStartMock = () => {
    if (!selectedExam) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await generateMockAction({
          examSlug: selectedExam.slug,
          subjectIds: selectedSubjectIds,
          topicIds: selectedTopicIds,
          questionCount,
          pyqRatio,
          difficulty,
          mode,
          timeLimitMinutes: estimatedMinutes,
        });
        if (res?.mockId) {
          router.push(`/test/${res.mockId}`);
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Unable to initialize mock session. Please check your configuration."
        );
      }
    });
  };

  const selectedCounts = selectedExam ? examQuestionCounts[selectedExam.id] : undefined;

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 space-y-10 animate-editorial">
      {/* Editorial Header */}
      <header className="pb-6 border-b border-[var(--border)]">
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
          Mock Configuration
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-normal text-[var(--foreground)] mt-1">
          Configure your examination session
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
          Select an examination, scope your syllabus, and calibrate your PYQ to Model ratio.
        </p>
      </header>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-md border border-rose-500/30 bg-rose-500/10 flex items-start gap-3 text-xs text-[var(--foreground)]"
        >
          <AlertCircle className="w-4 h-4 text-[var(--destructive)] shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left 8 Columns: 4 Structured Steps */}
        <div className="lg:col-span-8 space-y-10">
          {/* STEP 1: EXAM */}
          <section className="space-y-4 pb-8 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)]">
                  Step 1
                </span>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Exam
                </h2>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder="Filter 22 examinations..."
                  aria-label="Filter examinations"
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-md divide-y divide-[var(--border)] bg-[var(--card)]">
              {filteredExams.map((exam) => {
                const isSelected = exam.slug === selectedExam?.slug;
                const counts = examQuestionCounts[exam.id];
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => handleSelectExam(exam.slug)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent-soft)]"
                        : "hover:bg-[var(--muted)]/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {exam.name}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)] hidden sm:inline">
                          · {exam.conducting_body || exam.category}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--muted-foreground)] mt-0.5">
                        Marking: +{exam.marking_scheme.correct} / {exam.marking_scheme.wrong}
                        {counts && counts.pyq + counts.model > 0
                          ? ` · ${counts.pyq} PYQ / ${counts.model} Model`
                          : ""}
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--border)]"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 2: SUBJECT / TOPIC */}
          <section className="space-y-4 pb-8 border-b border-[var(--border)]">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)]">
                  Step 2
                </span>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Subject &amp; Topic Scope
                </h2>
              </div>
              {selectedSubjectIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubjectIds([]);
                    setSelectedTopicIds([]);
                  }}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Reset to Full Syllabus
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubjectIds([]);
                  setSelectedTopicIds([]);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  selectedSubjectIds.length === 0
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                All Subjects ({examSubjects.length})
              </button>

              {examSubjects.map((sub) => {
                const active = selectedSubjectIds.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubject(sub.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] font-semibold"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>

            {/* Optional Topic Granularity */}
            {availableTopics.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                  Topics ({selectedTopicIds.length === 0 ? "All Included" : `${selectedTopicIds.length} Selected`})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-md border border-[var(--border)] bg-[var(--card)]">
                  {availableTopics.map((top) => {
                    const active = selectedTopicIds.includes(top.id);
                    return (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => toggleTopic(top.id)}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-colors cursor-pointer ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] font-medium"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {top.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* STEP 3: QUESTION CONFIGURATION */}
          <section className="space-y-6 pb-8 border-b border-[var(--border)]">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)]">
                Step 3
              </span>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Question Configuration
              </h2>
            </div>

            {/* Question Count & Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Question Count
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {QUESTION_COUNT_PRESETS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={`h-9 rounded-md font-mono text-xs font-medium border transition-colors cursor-pointer ${
                        questionCount === count
                          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Difficulty Calibration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["easy", "moderate", "hard"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`h-9 rounded-md text-xs font-medium capitalize border transition-colors cursor-pointer ${
                        difficulty === lvl
                          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PYQ / Model Ratio Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--foreground)]">
                  PYQ / Model Ratio
                </span>
                <span className="font-mono text-[var(--muted-foreground)]">
                  <strong className="text-[var(--sage)]">{pyqRatio}% PYQ ({targetPyqCount})</strong>
                  {" · "}
                  <strong className="text-[var(--plum)]">{modelRatio}% Model ({targetModelCount})</strong>
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-11 gap-1.5">
                {PYQ_MODEL_RATIOS.map((ratio) => {
                  const active = pyqRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setPyqRatio(ratio)}
                      className={`py-2 px-1 rounded-md font-mono text-[11px] border transition-colors cursor-pointer flex flex-col items-center ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] font-semibold"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span>{ratio}/{100 - ratio}</span>
                      {ratio === 80 && (
                        <span className="text-[9px] text-[var(--accent)]">Rec</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* STEP 4: MODE */}
          <section className="space-y-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)]">
                Step 4
              </span>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Mode
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode("practice")}
                className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                  mode === "practice"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Practice Mode
                  </span>
                  <span className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                    Instant Feedback
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Verify answers and read structured explanations immediately after each question.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("exam")}
                className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                  mode === "exam"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Exam Mode
                  </span>
                  <span className="text-[10px] font-mono uppercase text-[var(--accent)]">
                    Commission Simulation
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Strict countdown timer with explanations and net negative marking revealed upon submission.
                </p>
              </button>
            </div>
          </section>
        </div>

        {/* Right 4 Columns: Sticky Final Summary */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
            <div className="pb-4 border-b border-[var(--border)]">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Final Summary
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mt-1">
                {selectedExam?.name}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {selectedSubjectIds.length === 0
                  ? `Full Syllabus (${examSubjects.length} subjects)`
                  : `${selectedSubjectIds.length} selected subject(s)`}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--muted-foreground)]">Questions</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">
                  {questionCount} Questions
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--muted-foreground)]">PYQ Allocation</span>
                <span className="font-mono font-semibold text-[var(--sage)]">
                  {pyqRatio}% PYQ ({targetPyqCount})
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--muted-foreground)]">Model Allocation</span>
                <span className="font-mono font-semibold text-[var(--plum)]">
                  {modelRatio}% Model ({targetModelCount})
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--muted-foreground)]">Session Mode</span>
                <span className="font-mono font-semibold capitalize text-[var(--foreground)]">
                  {mode} Mode ({estimatedMinutes}m)
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--muted-foreground)]">Marking Scheme</span>
                <span className="font-mono text-[var(--foreground)]">
                  +{selectedExam?.marking_scheme.correct} / {selectedExam?.marking_scheme.wrong}
                </span>
              </div>
            </div>

            {selectedCounts && selectedCounts.pyq === 0 && (
              <p className="text-[11px] text-[var(--muted-foreground)] bg-[var(--muted)]/60 p-3 rounded border border-[var(--border)]">
                Verified PYQs for this exam are being indexed; syllabus-aligned questions will be used automatically.
              </p>
            )}

            <button
              type="button"
              onClick={handleStartMock}
              disabled={isPending}
              className="w-full h-11 rounded-md font-medium text-sm bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Session...</span>
                </>
              ) : (
                <>
                  <span>Start Mock</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
