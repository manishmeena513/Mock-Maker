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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Syllabus &amp; Rules Engine ({exams.length} Exams)
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Examinations, Subjects &amp; Topics CRUD
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create, edit, activate, or deactivate competitive exams, official subjects, and syllabus topics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateExam((prev) => !prev)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateExam ? "Close Form" : "Add New Examination"}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
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
        <Card className="p-6 bg-white dark:bg-[#131c2e] border-2 border-blue-600 dark:border-blue-500">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Create New Competitive Examination
          </h2>
          <form onSubmit={handleCreateExam} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Name *
              </label>
              <input
                type="text"
                required
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g.BPSC Combined Prelims"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Slug (optional)
              </label>
              <input
                type="text"
                value={newExamSlug}
                onChange={(e) => setNewExamSlug(e.target.value)}
                placeholder="e.g. bpsc-prelims"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={newExamCategory}
                onChange={(e) => setNewExamCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
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
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Conducting Body
              </label>
              <input
                type="text"
                value={newExamBody}
                onChange={(e) => setNewExamBody(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Marks (Correct / Wrong)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newExamCorrect}
                  onChange={(e) => setNewExamCorrect(parseFloat(e.target.value))}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newExamWrong}
                  onChange={(e) => setNewExamWrong(parseFloat(e.target.value))}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                value={newExamDuration}
                onChange={(e) => setNewExamDuration(parseInt(e.target.value, 10))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newExamDesc}
                onChange={(e) => setNewExamDesc(e.target.value)}
                placeholder="Official syllabus description..."
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search 22 exams..."
            className="w-full h-9 pl-8 pr-3 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e]"
          />
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-5">
        {filteredExams.map((exam) => {
          const isEditing = editingExamId === exam.id;
          const examSubjects = subjects.filter((s) => s.exam_id === exam.id);

          return (
            <Card key={exam.id} className="p-6 bg-white dark:bg-[#131c2e] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {exam.name}
                    </h2>
                    <Badge variant={exam.is_active ? "pyq" : "default"}>
                      {exam.is_active ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                    {exam.category && <Badge variant="default">{exam.category}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {exam.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(exam)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{exam.is_active ? "Deactivate" : "Activate"}</span>
                  </button>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(exam)}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Marking Rules</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingExamId(null)}
                        className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveExam(exam)}
                        className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Save Rules
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Marking Scheme Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Correct Answer Marks
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editCorrect}
                      onChange={(e) => setEditCorrect(parseFloat(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e]"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                      +{exam.marking_scheme.correct}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Negative Marking Penalty
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editWrong}
                      onChange={(e) => setEditWrong(parseFloat(e.target.value))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e]"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-1">
                      {exam.marking_scheme.wrong}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Standard Duration
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value, 10))}
                      className="mt-1.5 w-full h-9 px-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e]"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                      {exam.time_limit_minutes || exam.default_time_minutes || 60} min
                    </div>
                  )}
                </div>
              </div>

              {/* Subjects & Topics CRUD */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
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
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {addingSubjectForExam === exam.id && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="New subject name (e.g. Science & Tech)..."
                      className="flex-1 h-8 px-3 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateSubject(exam.id)}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white cursor-pointer"
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
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f172a] space-y-2.5"
                      >
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{sub.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAddingTopicForSubject(
                                addingTopicForSubject === sub.id ? null : sub.id
                              )
                            }
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
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
                              className="flex-1 h-7 px-2.5 rounded text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131c2e]"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreateTopic(sub.id)}
                              className="h-7 px-2.5 rounded text-[11px] font-semibold bg-blue-600 text-white cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {subTopics.length === 0 ? (
                            <span className="text-[11px] text-slate-400">
                              Core syllabus topics configured
                            </span>
                          ) : (
                            subTopics.map((top) => (
                              <span
                                key={top.id}
                                className="px-2 py-0.5 rounded-md text-[11px] bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
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
