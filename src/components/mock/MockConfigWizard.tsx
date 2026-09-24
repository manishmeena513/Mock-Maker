"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Exam, Subject, Topic } from "@/types/database";
import { generateMockAction } from "@/app/actions/mock";
import {
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowRight,
  Layers,
  Sliders,
  Check,
  AlertCircle,
} from "lucide-react";

interface MockConfigWizardProps {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  initialExamSlug?: string;
}

export function MockConfigWizard({
  exams,
  subjects,
  topics,
  initialExamSlug,
}: MockConfigWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wizard state
  const [selectedExamSlug, setSelectedExamSlug] = useState<string>(
    initialExamSlug || exams[0]?.slug || "upsc-cse"
  );
  const selectedExam = exams.find((e) => e.slug === selectedExamSlug) || exams[0];

  const examSubjects = subjects.filter((s) => s.exam_id === selectedExam?.id);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Filter topics based on selected subjects
  const availableTopics = topics.filter((t) => {
    if (selectedSubjectIds.length === 0) {
      return examSubjects.some((s) => s.id === t.subject_id);
    }
    return selectedSubjectIds.includes(t.subject_id);
  });

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(25);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");
  const [mode, setMode] = useState<"practice" | "exam">("practice");

  // Calculate 80:20 distribution preview
  const pyqCount = Math.round(questionCount * 0.8);
  const modelCount = questionCount - pyqCount;

  // Toggle subject
  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(subjectId);
      const next = exists ? prev.filter((id) => id !== subjectId) : [...prev, subjectId];
      // Reset topics that don't belong to current subjects
      setSelectedTopicIds([]);
      return next;
    });
  };

  // Toggle topic
  const handleToggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  // Start mock submission
  const handleStartMock = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await generateMockAction({
          examSlug: selectedExamSlug,
          subjectIds: selectedSubjectIds,
          topicIds: selectedTopicIds,
          questionCount,
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Configure Your Mock Test
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm md:text-base">
          Select exam, subjects, and topics to instantly generate an exam-grade test containing{" "}
          <strong className="text-emerald-600 dark:text-emerald-400">80% verified PYQs</strong> and{" "}
          <strong className="text-indigo-600 dark:text-indigo-400">20% AI model questions</strong>.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Step 1: Exam Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Select Examination
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {exams.map((exam) => {
              const isSelected = exam.slug === selectedExamSlug;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => {
                    setSelectedExamSlug(exam.slug);
                    setSelectedSubjectIds([]);
                    setSelectedTopicIds([]);
                  }}
                  className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {exam.slug.replace("-", " ")}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-base mt-1">
                      {exam.name}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      {exam.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Marks: +{exam.marking_scheme.correct} / {exam.marking_scheme.wrong}</span>
                    <span>{exam.time_limit_minutes}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Subject Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                Select Subject
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSubjectIds([])}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition ${
                selectedSubjectIds.length === 0
                  ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                  : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              All Subjects
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {examSubjects.map((sub) => {
              const isSelected = selectedSubjectIds.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleToggleSubject(sub.id)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{sub.name}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Topic Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                Select Topics
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTopicIds([])}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition ${
                selectedTopicIds.length === 0
                  ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                  : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              All Topics
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableTopics.map((topic) => {
              const isSelected = selectedTopicIds.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleToggleTopic(topic.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  {topic.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Test Settings & Live Preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Mock Configuration & Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Number of Questions */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 rounded-lg font-bold text-sm border transition ${
                      questionCount === num
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Test Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("practice")}
                  className={`py-2 px-3 rounded-lg font-semibold text-xs border text-center transition ${
                    mode === "practice"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="font-bold">Practice Mode</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Instant feedback</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("exam")}
                  className={`py-2 px-3 rounded-lg font-semibold text-xs border text-center transition ${
                    mode === "exam"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="font-bold">Exam Mode</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Real exam rules</div>
                </button>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "moderate", "hard"] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-2 capitalize rounded-lg font-semibold text-xs border transition ${
                      difficulty === diff
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Mock Summary Card */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>Mock Composition Preview</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xl">
                  <ShieldCheck className="w-5 h-5" />
                  <span>{pyqCount}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                  Verified PYQs (80%)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                  <Sparkles className="w-5 h-5" />
                  <span>{modelCount}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                  Model Questions (20%)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-center gap-1 text-slate-900 dark:text-white font-bold text-xl">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <span>{Math.round(questionCount * 1.5)}m</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                  Allocated Time
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-900 dark:text-white font-bold text-xl">
                  +{selectedExam?.marking_scheme.correct} / {selectedExam?.marking_scheme.wrong}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                  Marking Scheme
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={handleStartMock}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Mock Test...</span>
                </>
              ) : (
                <>
                  <span>START MOCK</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
