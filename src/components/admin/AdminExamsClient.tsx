"use client";

import React, { useState } from "react";
import { Exam, Subject, Topic } from "@/types/database";
import { Award, Edit } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Syllabus &amp; Rules Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Examinations &amp; Marking Schemes
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Configure official examination durations, negative marking penalties, and subject-topic hierarchies.
          </p>
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-6">
        {exams.map((exam) => {
          const isEditing = editingExamId === exam.id;
          const examSubjects = subjects.filter((s) => s.exam_id === exam.id);

          return (
            <Card key={exam.id} className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-bold text-[var(--foreground)]">
                      {exam.name}
                    </h2>
                    <Badge variant="pyq">ACTIVE</Badge>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">{exam.description}</p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => startEdit(exam)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Marking Rules</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingExamId(null)}
                      className="h-9 px-3 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveExam(exam.id)}
                      className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Save Rules
                    </button>
                  </div>
                )}
              </div>

              {/* Marking Scheme Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Correct Answer Marks
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editCorrect}
                      onChange={(e) => setEditCorrect(parseFloat(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-bold rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                      +{exam.marking_scheme.correct}
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Awarded per correct response</p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Negative Marking Penalty
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editWrong}
                      onChange={(e) => setEditWrong(parseFloat(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-bold rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-1">
                      {exam.marking_scheme.wrong}
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Deducted per wrong response</p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Standard Duration
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-bold rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums mt-1">
                      {exam.time_limit_minutes} min
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Official full-length duration</p>
                </div>
              </div>

              {/* Subjects & Topics */}
              <div className="space-y-3 pt-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  Configured Subjects ({examSubjects.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {examSubjects.map((sub) => {
                    const subTopics = topics.filter((t) => t.subject_id === sub.id);

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/25 space-y-2.5"
                      >
                        <div className="font-semibold text-xs text-[var(--foreground)] flex items-center justify-between">
                          <span>{sub.name}</span>
                          <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                            {sub.slug}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {subTopics.map((top) => (
                            <span
                              key={top.id}
                              className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
