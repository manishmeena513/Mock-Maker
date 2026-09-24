"use client";

import React, { useState } from "react";
import { Exam, Subject, Topic } from "@/types/database";
import { Award, CheckCircle2, Clock, Sliders, Edit, Plus } from "lucide-react";

interface AdminExamsClientProps {
  initialExams: Exam[];
  subjects: Subject[];
  topics: Topic[];
}

export function AdminExamsClient({ initialExams, subjects, topics }: AdminExamsClientProps) {
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editCorrect, setEditCorrect] = useState<number>(2.0);
  const [editWrong, setEditWrong] = useState<number>(-0.66);
  const [editDuration, setEditDuration] = useState<number>(120);

  const startEdit = (exam: Exam) => {
    setEditingExamId(exam.id);
    setEditCorrect(exam.marking_scheme.correct);
    setEditWrong(exam.marking_scheme.wrong);
    setEditDuration(exam.time_limit_minutes);
  };

  const handleSaveExam = (examId: string) => {
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? {
              ...e,
              time_limit_minutes: editDuration,
              marking_scheme: {
                correct: editCorrect,
                wrong: editWrong,
                unattempted: 0,
              },
            }
          : e
      )
    );
    setEditingExamId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Syllabus & Rules Engine
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Examinations & Marking Schemes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure official examination parameters, marking formulas, and subject taxonomies.
          </p>
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-6">
        {exams.map((exam) => {
          const isEditing = editingExamId === exam.id;
          const examSubjects = subjects.filter((s) => s.exam_id === exam.id);

          return (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {exam.name}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{exam.description}</p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => startEdit(exam)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Marking Rules</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingExamId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveExam(exam.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white"
                    >
                      Save Rules
                    </button>
                  </div>
                )}
              </div>

              {/* Marking Scheme Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Correct Answer Marks
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editCorrect}
                      onChange={(e) => setEditCorrect(parseFloat(e.target.value))}
                      className="mt-1 w-full p-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  ) : (
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      +{exam.marking_scheme.correct}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">Awarded per correct answer</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Negative Marking Penalty
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editWrong}
                      onChange={(e) => setEditWrong(parseFloat(e.target.value))}
                      className="mt-1 w-full p-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  ) : (
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                      {exam.marking_scheme.wrong}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">Deducted per incorrect answer</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Duration (Minutes)
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value))}
                      className="mt-1 w-full p-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  ) : (
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {exam.time_limit_minutes}m
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">Official examination time</p>
                </div>
              </div>

              {/* Subjects & Topics */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Configured Subjects ({examSubjects.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {examSubjects.map((sub) => {
                    const subTopics = topics.filter((t) => t.subject_id === sub.id);

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2"
                      >
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{sub.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {sub.slug}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {subTopics.map((top) => (
                            <span
                              key={top.id}
                              className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {top.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
