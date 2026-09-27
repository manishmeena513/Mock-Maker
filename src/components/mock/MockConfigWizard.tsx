"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Exam, Subject, Topic, PYQ_MODEL_RATIOS, PYQModelRatio } from "@/types/database";
import { generateMockAction } from "@/app/actions/mock";
import {
  ArrowRight,
  Check,
  AlertCircle,
  Info,
  Search,
  Sliders,
} from "lucide-react";

interface MockConfigWizardProps {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  examQuestionCounts?: Record<string, { pyq: number; model: number }>;
  initialExamSlug?: string;
}

const STEPS = [
  { id: "01", label: "Exam", anchor: "#step-01" },
  { id: "02", label: "Subject", anchor: "#step-02" },
  { id: "03", label: "Topic", anchor: "#step-03" },
  { id: "04", label: "Mode", anchor: "#step-04" },
  { id: "05", label: "Ratio & Length", anchor: "#step-05" },
  { id: "06", label: "Review", anchor: "#step-06" },
];

const EXAM_CATEGORIES = [
  "All",
  "Civil Services",
  "SSC",
  "Banking & Regulatory",
  "Defence & Central",
  "Railways",
  "Teaching & Research",
] as const;

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
  const [activeStep, setActiveStep] = useState<string>("01");

  // Exam filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [examSearch, setExamSearch] = useState<string>("");

  // Wizard state
  const [selectedExamSlug, setSelectedExamSlug] = useState<string>(
    initialExamSlug || exams[0]?.slug || "upsc-cse"
  );
  const selectedExam = exams.find((e) => e.slug === selectedExamSlug) || exams[0];

  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (selectedCategory !== "All" && e.category && e.category !== selectedCategory) {
        return false;
      }
      if (examSearch.trim()) {
        const q = examSearch.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          (e.conducting_body || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [exams, selectedCategory, examSearch]);

  const examSubjects = useMemo(
    () => subjects.filter((s) => s.exam_id === selectedExam?.id),
    [subjects, selectedExam]
  );
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Filter topics based on selected subjects
  const availableTopics = useMemo(() => {
    return topics.filter((t) => {
      if (selectedSubjectIds.length === 0) {
        return examSubjects.some((s) => s.id === t.subject_id);
      }
      return selectedSubjectIds.includes(t.subject_id);
    });
  }, [topics, selectedSubjectIds, examSubjects]);

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(25);
  const [pyqRatio, setPyqRatio] = useState<PYQModelRatio>(80);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");
  const [mode, setMode] = useState<"practice" | "exam">("practice");

  // Calculate dynamic PYQ : Model distribution preview
  const pyqCount = Math.round(questionCount * (pyqRatio / 100));
  const modelCount = questionCount - pyqCount;
  const modelRatio = 100 - pyqRatio;

  const selectedExamPool = selectedExam
    ? examQuestionCounts[selectedExam.id] || { pyq: 0, model: 0 }
    : { pyq: 0, model: 0 };
  const totalExamPool = selectedExamPool.pyq + selectedExamPool.model;

  // Toggle subject
  const handleToggleSubject = (subjectId: string) => {
    setActiveStep("02");
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(subjectId);
      const next = exists ? prev.filter((id) => id !== subjectId) : [...prev, subjectId];
      setSelectedTopicIds([]);
      return next;
    });
  };

  // Toggle topic
  const handleToggleTopic = (topicId: string) => {
    setActiveStep("03");
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  // Start mock submission
  const handleStartMock = () => {
    setActiveStep("06");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await generateMockAction({
          examSlug: selectedExamSlug,
          subjectIds: selectedSubjectIds,
          topicIds: selectedTopicIds,
          questionCount,
          pyqRatio,
          difficulty,
          mode,
        });

        if (result?.mockId) {
          router.push(`/test/${result.mockId}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Failed to generate mock test. Please check your configuration.");
        }
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200/90 dark:border-slate-800/90 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Mock Test Configuration Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Configure Examination Mock
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Choose from 22 official competitive examinations, filter by subject &amp; topic, and customize your PYQ / Model question ratio from 100/0 to 0/100 (80/20 recommended).
          </p>
        </div>
      </div>

      {/* 01–06 Multi-Step Progress Strip */}
      <nav
        aria-label="Configuration Steps"
        className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-2.5 overflow-x-auto shadow-2xs"
      >
        <ol className="flex items-center justify-between min-w-[580px] gap-1">
          {STEPS.map((step, idx) => {
            const isCurrent = activeStep === step.id;
            return (
              <li key={step.id} className="flex items-center flex-1">
                <a
                  href={step.anchor}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full ${
                    isCurrent
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? "bg-blue-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span className="truncate">{step.label}</span>
                </a>
                {idx < STEPS.length - 1 && (
                  <div className="w-3 h-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex items-start gap-3 text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div>
            <div className="font-bold">Configuration Notice</div>
            <div className="mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Main Two-Column Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Steps 01 to 05 */}
        <div className="lg:col-span-8 space-y-5">
          {/* STEP 01: EXAM */}
          <section
            id="step-01"
            onClick={() => setActiveStep("01")}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  01
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Select Target Examination ({exams.length} Supported)
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sets official commission marking scheme &amp; syllabus taxonomy
                  </p>
                </div>
              </div>

              {/* Quick Exam Search */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder="Filter exams (e.g. UPSC, SBI)..."
                  aria-label="Filter Examinations"
                  className="w-full h-8 pl-8 pr-3 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {EXAM_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      active
                        ? "bg-blue-700 dark:bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Exam Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredExams.map((exam) => {
                const isSelected = exam.slug === selectedExamSlug;
                const counts = examQuestionCounts[exam.id] || { pyq: 0, model: 0 };
                const totalAvailable = counts.pyq + counts.model;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => {
                      setSelectedExamSlug(exam.slug);
                      setSelectedSubjectIds([]);
                      setSelectedTopicIds([]);
                      setActiveStep("01");
                    }}
                    className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0f172a]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 truncate">
                          {exam.category || exam.slug.replace("-", " ")}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? "bg-blue-700 border-blue-700 text-white"
                              : "border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-1">
                        {exam.name}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {exam.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>
                        +{exam.marking_scheme.correct} / {exam.marking_scheme.wrong}
                      </span>
                      <span
                        className={
                          totalAvailable > 0
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-slate-400"
                        }
                      >
                        {totalAvailable > 0 ? `${totalAvailable} Qs` : `${exam.default_time_minutes || 60}m`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 02: SUBJECT */}
          <section
            id="step-02"
            onClick={() => setActiveStep("02")}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  02
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Select Subject Scope
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubjectIds([])}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                  selectedSubjectIds.length === 0
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                All Subjects ({examSubjects.length})
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {examSubjects.map((sub) => {
                const isSelected = selectedSubjectIds.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleToggleSubject(sub.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-500 shadow-2xs"
                        : "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span>{sub.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 03: TOPIC */}
          <section
            id="step-03"
            onClick={() => setActiveStep("03")}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  03
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Select Granular Topics
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopicIds([])}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                  selectedTopicIds.length === 0
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                All Topics ({availableTopics.length})
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {availableTopics.map((topic) => {
                const isSelected = selectedTopicIds.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleToggleTopic(topic.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-500 font-semibold"
                        : "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {topic.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 04: MODE */}
          <section
            id="step-04"
            onClick={() => setActiveStep("04")}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                04
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Choose Examination Mode
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setMode("practice");
                  setActiveStep("04");
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === "practice"
                    ? "border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-600/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Practice Mode
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Active Learning
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Immediate correctness feedback after every response with full structured explanations (Why, Concept, Exam Perspective, Memory Hook).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("exam");
                  setActiveStep("04");
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === "exam"
                    ? "border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-600/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Exam Mode
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Strict Simulation
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Distraction-free timed test environment. Solutions, negative marking deductions, and diagnostics are unlocked only after submission.
                </p>
              </button>
            </div>
          </section>

          {/* STEP 05: PYQ/MODEL RATIO, QUESTIONS & DIFFICULTY */}
          <section
            id="step-05"
            onClick={() => setActiveStep("05")}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-5 sm:p-6 shadow-2xs space-y-6"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  05
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    PYQ / Model Ratio, Paper Length &amp; Difficulty
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose your desired balance between Previous Year Questions (PYQ) and Model Questions
                  </p>
                </div>
              </div>
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>

            {/* User-Controlled PYQ / Model Ratio Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  PYQ / Model Ratio (Default 80/20 Recommended)
                </label>
                <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
                  PYQ {pyqRatio}% ({pyqCount} Qs) • Model {modelRatio}% ({modelCount} Qs)
                </span>
              </div>

              <div
                role="radiogroup"
                aria-label="PYQ to Model Question Ratio"
                className="grid grid-cols-3 sm:grid-cols-6 gap-2"
              >
                {PYQ_MODEL_RATIOS.map((r) => {
                  const isSelected = pyqRatio === r;
                  const isRecommended = r === 80;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setPyqRatio(r);
                        setActiveStep("05");
                      }}
                      className={`py-2 px-2 rounded-lg text-center border transition cursor-pointer relative ${
                        isSelected
                          ? "bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-500 shadow-2xs"
                          : "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-mono font-bold text-xs">
                        {r}/{100 - r}
                      </div>
                      <div
                        className={`text-[9px] font-medium mt-0.5 ${
                          isSelected
                            ? "text-blue-100"
                            : isRecommended
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-slate-400"
                        }`}
                      >
                        {isRecommended ? "Recommended" : `${r}% PYQ`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {/* Question Count */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setQuestionCount(num);
                        setActiveStep("05");
                      }}
                      className={`h-10 rounded-lg font-mono font-bold text-xs border transition cursor-pointer ${
                        questionCount === num
                          ? "bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-500 shadow-2xs"
                          : "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Target Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "moderate", "hard"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        setDifficulty(diff);
                        setActiveStep("05");
                      }}
                      className={`h-10 capitalize rounded-lg font-semibold text-xs border transition cursor-pointer ${
                        difficulty === diff
                          ? "bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-500 shadow-2xs"
                          : "bg-slate-50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: STEP 06 REVIEW & LIVE RATIO BAR */}
        <aside id="step-06" className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  06
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Review &amp; Launch
                </h2>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">
                {mode} mode
              </span>
            </div>

            {/* Live PYQ:Model Question Mix Visual Bar */}
            <div className="p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>
                  Question Mix ({pyqRatio}:{modelRatio})
                </span>
                <span className="font-mono">{questionCount} Total</span>
              </div>

              <div
                aria-label={`${pyqRatio}% Verified PYQ and ${modelRatio}% Model Question ratio bar`}
                className="h-3 w-full rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex p-0.5 gap-0.5"
              >
                {pyqRatio > 0 && (
                  <div
                    style={{ width: `${pyqRatio}%` }}
                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-l-md transition-all"
                  />
                )}
                {modelRatio > 0 && (
                  <div
                    style={{ width: `${modelRatio}%` }}
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-r-md transition-all"
                  />
                )}
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
                    <span>{pyqRatio}% Verified PYQ</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {pyqCount} Qs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 dark:bg-indigo-500" />
                    <span>{modelRatio}% Model Questions</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                    {modelCount} Qs
                  </span>
                </div>
              </div>
            </div>

            {/* Specification Summary Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Examination</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedExam?.name}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Verified Bank Pool</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {selectedExamPool.pyq} PYQ / {selectedExamPool.model} Model
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Subjects</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedSubjectIds.length === 0
                    ? `All (${examSubjects.length})`
                    : `${selectedSubjectIds.length} Selected`}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Topics</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedTopicIds.length === 0
                    ? `All (${availableTopics.length})`
                    : `${selectedTopicIds.length} Selected`}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Allocated Time</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {Math.round(questionCount * 1.5)} minutes
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Marking Scheme</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  +{selectedExam?.marking_scheme.correct} / {selectedExam?.marking_scheme.wrong}
                </span>
              </div>
            </div>

            {totalExamPool === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{selectedExam?.name}</strong> syllabus &amp; subjects are configured, and verified PYQs can be imported or AI-generated from the Admin Panel. Select UPSC CSE, UPPSC PCS, or SSC CGL for immediate 500+ verified questions.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  If a narrow topic selection has fewer questions than requested, the engine automatically expands to sibling syllabus topics while preserving your {pyqRatio}:{modelRatio} PYQ/Model ratio.
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={handleStartMock}
              className="w-full h-11 rounded-xl font-semibold text-sm bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Assembling Paper...</span>
                </>
              ) : (
                <>
                  <span>Start Mock Test ({pyqRatio}:{modelRatio})</span>
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
