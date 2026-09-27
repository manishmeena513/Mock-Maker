"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Exam, Subject } from "@/types/database";
import { Search, ArrowRight } from "lucide-react";

interface ExamBrowserClientProps {
  exams: Exam[];
  subjects: Subject[];
}

const CATEGORY_TABS = [
  { id: "ALL", label: "All Examinations" },
  { id: "UPSC", label: "UPSC & State PCS" },
  { id: "SSC", label: "SSC" },
  { id: "BANKING", label: "Banking" },
  { id: "RAILWAYS", label: "Railways" },
  { id: "DEFENCE", label: "Defence" },
  { id: "TEACHING", label: "Teaching" },
  { id: "REGULATORY", label: "Regulatory" },
] as const;

function matchesGroup(exam: Exam, groupId: string): boolean {
  if (groupId === "ALL") return true;
  const cat = (exam.category || "").toLowerCase();
  const slug = exam.slug.toLowerCase();
  switch (groupId) {
    case "UPSC":
      return cat.includes("civil") || slug.includes("upsc") || slug.includes("uppsc") || slug.includes("epfo");
    case "SSC":
      return cat.includes("ssc") || slug.startsWith("ssc-");
    case "BANKING":
      return cat.includes("banking") || slug.startsWith("ibps") || slug.startsWith("sbi");
    case "RAILWAYS":
      return cat.includes("railway") || slug.startsWith("rrb");
    case "DEFENCE":
      return cat.includes("defence") || ["cds", "nda", "capf"].includes(slug);
    case "TEACHING":
      return cat.includes("teaching") || ["ctet", "ugc-net"].includes(slug);
    case "REGULATORY":
      return cat.includes("regulatory") || ["rbi-grade-b", "nabard-grade-a"].includes(slug);
    default:
      return true;
  }
}

export function ExamBrowserClient({ exams, subjects }: ExamBrowserClientProps) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("ALL");

  const subjectsByExam = useMemo(() => {
    const map = new Map<string, string[]>();
    subjects.forEach((s) => {
      const list = map.get(s.exam_id) || [];
      list.push(s.name);
      map.set(s.exam_id, list);
    });
    return map;
  }, [subjects]);

  const featuredExams = useMemo(
    () =>
      exams.filter((e) =>
        ["upsc-cse", "uppsc", "ssc-cgl"].includes(e.slug)
      ),
    [exams]
  );

  const filteredExams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exams.filter((exam) => {
      if (!matchesGroup(exam, activeGroup)) return false;
      if (!q) return true;
      const subNames = (subjectsByExam.get(exam.id) || []).join(" ").toLowerCase();
      return (
        exam.name.toLowerCase().includes(q) ||
        exam.slug.toLowerCase().includes(q) ||
        (exam.description || "").toLowerCase().includes(q) ||
        (exam.conducting_body || "").toLowerCase().includes(q) ||
        subNames.includes(q)
      );
    });
  }, [exams, activeGroup, query, subjectsByExam]);

  return (
    <div className="space-y-6">
      {/* Top Bar: Search + Featured Quick Links */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search examinations, commissions, or subjects..."
            aria-label="Search examinations"
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] mr-1">
            Featured:
          </span>
          {featuredExams.map((fe) => (
            <Link
              key={fe.id}
              href={`/mock/configure?exam=${fe.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] text-[var(--foreground)] font-medium transition-colors"
            >
              <span>{fe.slug === "upsc-cse" ? "UPSC CSE" : fe.slug === "uppsc" ? "UPPSC" : "SSC CGL"}</span>
              <ArrowRight className="w-3 h-3 text-[var(--accent)]" />
            </Link>
          ))}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="Examination categories"
        className="flex items-center gap-1 overflow-x-auto pb-1"
      >
        {CATEGORY_TABS.map((tab) => {
          const active = activeGroup === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveGroup(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Compact Editorial Examination Rows */}
      <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
        {filteredExams.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--muted-foreground)]">
            No examinations match &ldquo;{query}&rdquo;. Try clearing your search filter.
          </div>
        ) : (
          filteredExams.map((exam) => {
            const examSubjects = subjectsByExam.get(exam.id) || [];
            const duration = exam.time_limit_minutes || exam.default_time_minutes || 60;
            return (
              <div
                key={exam.id}
                className="py-4 px-2 sm:px-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[var(--card)]/70 transition-colors group"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/exam/${exam.slug}`}
                      className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors"
                    >
                      {exam.name}
                    </Link>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {exam.conducting_body || exam.category}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--muted-foreground)] border-l border-[var(--border)] pl-2">
                      +{exam.marking_scheme.correct} / {exam.marking_scheme.wrong} · {duration}m
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">
                    {exam.description}
                  </p>

                  {examSubjects.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                        Subjects:
                      </span>
                      {examSubjects.slice(0, 5).map((subName) => (
                        <span
                          key={subName}
                          className="text-[11px] text-[var(--foreground)]/80 after:content-['·'] last:after:content-none after:ml-1.5 after:text-[var(--muted-foreground)]"
                        >
                          {subName}
                        </span>
                      ))}
                      {examSubjects.length > 5 && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          +{examSubjects.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/exam/${exam.slug}`}
                    className="h-8 px-3 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Syllabus
                  </Link>
                  <Link
                    href={`/mock/configure?exam=${exam.slug}`}
                    className="h-8 px-3.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                  >
                    <span>Practice</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
