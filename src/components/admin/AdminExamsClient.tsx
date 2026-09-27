"use client";

import React, { useState, useTransition } from "react";
import { Exam, Subject, Topic } from "@/types/database";
import {
  saveExamAction,
  toggleExamActiveAction,
  saveSubjectAction,
  saveTopicAction,
} from "@/app/actions/admin";
import {
  Award,
  Edit,
  Plus,
  CheckCircle2,
  Power,
  Search,
  Layers,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

interface AdminExamsClientProps {
  initialExams: Exam[];
  subjects: Subject[];
  topics: Topic[];
}

export function AdminExamsClient({
  initialExams,
  subjects: initialSubjects,
  topics: initialTopics,
}: AdminExamsClientProps) {
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Editing existing exam
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editCorrect, setEditCorrect] = useState<number>(2.0);
  const [editWrong, setEditWrong] = useState<number>(-0.5);
  const [editDuration, setEditDuration] = useState<number>(60);

  // Creating new exam modal / panel
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamSlug, setNewExamSlug] = useState("");
  const [newExamCategory, setNewExamCategory] = useState("SSC");
  const [newExamBody, setNewExamBody] = useState("Staff Selection Commission");
  const [newExamDesc, setNewExamDesc] = useState("");
  const [newExamCorrect, setNewExamCorrect] = useState(2.0);
  const [newExamWrong, setNewExamWrong] = useState(-0.5);
  const [newExamDuration, setNewExamDuration] = useState(60);

  // Adding subject / topic inline
  const [addingSubjectForExam, setAddingSubjectForExam] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingTopicForSubject, setAddingTopicForSubject] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const startEdit = (exam: Exam) => {
    setEditingExamId(exam.id);
    setEditCorrect(exam.marking_scheme.correct);
    setEditWrong(exam.marking_scheme.wrong);
    setEditDuration(exam.time_limit_minutes || exam.default_time_minutes || 60);
  };

  const handleSaveExam = (exam: Exam) => {
    startTransition(async () => {
      const updated = {
        ...exam,
        time_limit_minutes: editDuration,
        default_time_minutes: editDuration,
        marking_scheme: {
          correct: editCorrect,
          wrong: editWrong,
          unattempted: 0,
        },
      };
      await saveExamAction(updated);
      setExams((prev) => prev.map((e) => (e.id === exam.id ? updated : e)));
      setEditingExamId(null);
      setFeedbackMsg(`Updated marking rules for ${exam.name}.`);
    });
  };

  const handleToggleActive = (exam: Exam) => {
    const nextState = !exam.is_active;
    startTransition(async () => {
      await toggleExamActiveAction(exam.id, nextState);
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, is_active: nextState } : e))
      );
      setFeedbackMsg(
        `${exam.name} is now ${nextState ? "Active" : "Deactivated"}.`
      );
    });
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) return;
    const slug =
      newExamSlug.trim() ||
      newExamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    startTransition(async () => {
      const res = await saveExamAction({
        name: newExamName.trim(),
        slug,
        category: newExamCategory,
        conducting_body: newExamBody,
        description:
          newExamDesc.trim() || `${newExamName.trim()} official mock test preparation.`,
        marking_scheme: {
          correct: newExamCorrect,
          wrong: newExamWrong,
          unattempted: 0,
        },
        default_time_minutes: newExamDuration,
        time_limit_minutes: newExamDuration,
        is_active: true,
      });
      if (res.exam) {
        setExams((prev) => [res.exam, ...prev]);
        setShowCreateExam(false);
        setNewExamName("");
        setNewExamSlug("");
        setNewExamDesc("");
        setFeedbackMsg(`Created examination: ${res.exam.name}`);
      }
    });
  };

  const handleCreateSubject = (examId: string) => {
    if (!newSubjectName.trim()) return;
    const slug = newSubjectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    startTransition(async () => {
      const res = await saveSubjectAction({
        exam_id: examId,
        name: newSubjectName.trim(),
        slug,
      });
      if (res.subject) {
        setSubjects((prev) => [...prev, res.subject]);
        setNewSubjectName("");
        setAddingSubjectForExam(null);
        setFeedbackMsg(`Added subject "${res.subject.name}".`);
      }
    });
  };

  const handleCreateTopic = (subjectId: string) => {
    if (!newTopicName.trim()) return;
    const slug = newTopicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    startTransition(async () => {
      const res = await saveTopicAction({
        subject_id: subjectId,
        name: newTopicName.trim(),
        slug,
      });
      if (res.topic) {
        setTopics((prev) => [...prev, res.topic]);
        setNewTopicName("");
        setAddingTopicForSubject(null);
        setFeedbackMsg(`Added syllabus topic "${res.topic.name}".`);
      }
    });
  };

  const filteredExams = exams.filter((exam) => {
    if (categoryFilter !== "All" && exam.category && exam.category !== categoryFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        exam.name.toLowerCase().includes(q) ||
        exam.slug.toLowerCase().includes(q) ||
        (exam.conducting_body || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
            Syllabus &amp; Rules Engine ({exams.length} Exams)
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)] mt-1">
            Examinations, Subjects &amp; Topics CRUD
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create, edit, activate, or deactivate competitive exams, official subjects, and syllabus topics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateExam((prev) => !prev)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showCreateExam ? "Close Form" : "Add New Examination"}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-md bg-[var(--sage-muted)] border border-[var(--sage)]/30 text-[var(--sage)] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-[11px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New Exam Form */}
      {showCreateExam && (
        <Card className="p-6 bg-[var(--card)] border border-[var(--accent)]">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">
            Create New Competitive Examination
          </h2>
          <form onSubmit={handleCreateExam} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Exam Name *
              </label>
              <input
                type="text"
                required
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g. BPSC Combined Prelims"
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Slug (optional)
              </label>
              <input
                type="text"
                value={newExamSlug}
                onChange={(e) => setNewExamSlug(e.target.value)}
                placeholder="e.g. bpsc-prelims"
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Category
              </label>
              <select
                value={newExamCategory}
                onChange={(e) => setNewExamCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              >
                <option value="Civil Services">Civil Services</option>
                <option value="SSC">SSC</option>
                <option value="Banking & Regulatory">Banking &amp; Regulatory</option>
                <option value="Defence & Central">Defence &amp; Central</option>
                <option value="Railways">Railways</option>
                <option value="Teaching & Research">Teaching &amp; Research</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Conducting Body
              </label>
              <input
                type="text"
                value={newExamBody}
                onChange={(e) => setNewExamBody(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Marks (Correct / Wrong)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newExamCorrect}
                  onChange={(e) => setNewExamCorrect(parseFloat(e.target.value))}
                  className="h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)]"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newExamWrong}
                  onChange={(e) => setNewExamWrong(parseFloat(e.target.value))}
                  className="h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--background)]"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                value={newExamDuration}
                onChange={(e) => setNewExamDuration(parseInt(e.target.value, 10))}
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-[var(--muted-foreground)] mb-1">
                Description
              </label>
              <input
                type="text"
                value={newExamDesc}
                onChange={(e) => setNewExamDesc(e.target.value)}
                placeholder="Official syllabus description..."
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 rounded-md font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 cursor-pointer"
              >
                Create Examination
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            "All",
            "Civil Services",
            "SSC",
            "Banking & Regulatory",
            "Defence & Central",
            "Railways",
            "Teaching & Research",
          ].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                categoryFilter === cat
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search 22 exams..."
            className="w-full h-9 pl-8 pr-3 rounded-md text-xs border border-[var(--border)] bg-[var(--card)]"
          />
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-5">
        {filteredExams.map((exam) => {
          const isEditing = editingExamId === exam.id;
          const examSubjects = subjects.filter((s) => s.exam_id === exam.id);

          return (
            <Card key={exam.id} className="p-6 bg-[var(--card)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      {exam.name}
                    </h2>
                    <Badge variant={exam.is_active ? "pyq" : "default"}>
                      {exam.is_active ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                    {exam.category && <Badge variant="default">{exam.category}</Badge>}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {exam.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(exam)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border border-[var(--border)] hover:bg-[var(--muted)] cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{exam.is_active ? "Deactivate" : "Activate"}</span>
                  </button>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(exam)}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-[var(--border)] hover:bg-[var(--muted)] cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Marking Rules</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingExamId(null)}
                        className="h-9 px-3 rounded-md text-xs font-medium border border-[var(--border)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveExam(exam)}
                        className="h-9 px-4 rounded-md text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 cursor-pointer"
                      >
                        Save Rules
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Marking Scheme Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-md border border-[var(--border)] bg-[var(--background)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                    Correct Answer Marks
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editCorrect}
                      onChange={(e) => setEditCorrect(parseFloat(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-mono font-semibold rounded-md border border-[var(--border)] bg-[var(--card)]"
                    />
                  ) : (
                    <div className="text-2xl font-mono font-semibold text-[var(--sage)] tabular-nums mt-1">
                      +{exam.marking_scheme.correct}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-md border border-[var(--border)] bg-[var(--background)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                    Negative Marking Penalty
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editWrong}
                      onChange={(e) => setEditWrong(parseFloat(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-mono font-semibold rounded-md border border-[var(--border)] bg-[var(--card)]"
                    />
                  ) : (
                    <div className="text-2xl font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
                      {exam.marking_scheme.wrong}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-md border border-[var(--border)] bg-[var(--background)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                    Standard Duration
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value, 10))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-mono font-semibold rounded-md border border-[var(--border)] bg-[var(--card)]"
                    />
                  ) : (
                    <div className="text-2xl font-mono font-semibold text-[var(--foreground)] tabular-nums mt-1">
                      {exam.time_limit_minutes || exam.default_time_minutes || 60} min
                    </div>
                  )}
                </div>
              </div>

              {/* Subjects & Topics CRUD */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Configured Subjects ({examSubjects.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setAddingSubjectForExam(
                        addingSubjectForExam === exam.id ? null : exam.id
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {addingSubjectForExam === exam.id && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--accent-muted)] border border-[var(--accent)]/30">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="New subject name (e.g. Science & Tech)..."
                      className="flex-1 h-8 px-3 rounded text-xs border border-[var(--border)] bg-[var(--card)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateSubject(exam.id)}
                      className="h-8 px-3 rounded text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] cursor-pointer"
                    >
                      Save Subject
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {examSubjects.map((sub) => {
                    const subTopics = topics.filter((t) => t.subject_id === sub.id);

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-md border border-[var(--border)] bg-[var(--background)] space-y-2.5"
                      >
                        <div className="font-medium text-xs text-[var(--foreground)] flex items-center justify-between">
                          <span>{sub.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAddingTopicForSubject(
                                addingTopicForSubject === sub.id ? null : sub.id
                              )
                            }
                            className="text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
                          >
                            + Add Topic
                          </button>
                        </div>

                        {addingTopicForSubject === sub.id && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={newTopicName}
                              onChange={(e) => setNewTopicName(e.target.value)}
                              placeholder="New topic name..."
                              className="flex-1 h-7 px-2.5 rounded text-xs border border-[var(--border)] bg-[var(--card)]"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreateTopic(sub.id)}
                              className="h-7 px-2.5 rounded text-[11px] font-medium bg-[var(--primary)] text-[var(--primary-foreground)] cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {subTopics.length === 0 ? (
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              Core syllabus topics configured
                            </span>
                          ) : (
                            subTopics.map((top) => (
                              <span
                                key={top.id}
                                className="px-2 py-0.5 rounded text-[11px] bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
                              >
                                {top.name}
                              </span>
                            ))
                          )}
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
