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
            className="w-full h-10 sm:h-9 pl-9 pr-3 text-base sm:text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
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
              className="mm-btn-press inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] text-[var(--foreground)] font-medium"
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
        className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1"
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
              className={`mm-btn-press px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-2xs"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Responsive Editorial Examination Grid (1-col on mobile/tablet, 2-col on laptop/desktop) */}
      {filteredExams.length === 0 ? (
        <div className="py-12 text-center text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] animate-fade-in">
          No examinations match &ldquo;{query}&rdquo;. Try clearing your search filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 animate-fade-in">
          {filteredExams.map((exam) => {
            const examSubjects = subjectsByExam.get(exam.id) || [];
            const duration = exam.time_limit_minutes || exam.default_time_minutes || 60;
            return (
              <div
                key={exam.id}
                className="mm-card-interactive p-4 sm:p-5 rounded-lg border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between gap-4 group min-w-0"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <Link
                        href={`/exam/${exam.slug}`}
                        className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors"
                      >
                        {exam.name}
                      </Link>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                        {exam.conducting_body || exam.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--muted-foreground)] tabular-nums">
                      +{exam.marking_scheme.correct} / {exam.marking_scheme.wrong} · {duration}m
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {examSubjects.length > 0 && (
                      <>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                          Subjects:
                        </span>
                        {examSubjects.slice(0, 3).map((subName) => (
                          <span
                            key={subName}
                            className="text-[11px] text-[var(--foreground)]/85 after:content-['·'] last:after:content-none after:ml-1.5 after:text-[var(--muted-foreground)]"
                          >
                            {subName}
                          </span>
                        ))}
                        {examSubjects.length > 3 && (
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            +{examSubjects.length - 3} more
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/exam/${exam.slug}`}
                      className="mm-btn-press h-8 px-3 rounded-md text-xs font-medium inline-flex items-center border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      Syllabus
                    </Link>
                    <Link
                      href={`/mock/configure?exam=${exam.slug}`}
                      className="mm-btn-press h-8 px-3.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                    >
                      <span>Practice</span>
                      <ArrowRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
