"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  Send,
  Square,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { useAIAssistant } from "./AIAssistantContext";

function FormattedAIContent({ content }: { content: string }) {
  // Parse code blocks and structured paragraphs cleanly
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-[var(--foreground)] break-words">
      {blocks.map((block, idx) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const lines = block.slice(3, -3).trim().split("\n");
          const firstLine = lines[0]?.trim() || "";
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const codeContent = hasLang ? lines.slice(1).join("\n") : lines.join("\n");
          return (
            <pre
              key={idx}
              className="max-w-full overflow-x-auto touch-scroll rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--foreground)]"
            >
              <code>{codeContent}</code>
            </pre>
          );
        }

        const lines = block.split("\n");
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;

              // Highlight standard MCQ mentor headings
              if (/^(Answer|Why|Why other options are incorrect|Exam takeaway):$/i.test(trimmed)) {
                const label = trimmed.replace(/:$/, "");
                const isAnswer = /^Answer$/i.test(label);
                const isTakeaway = /^Exam takeaway$/i.test(label);
                return (
                  <div
                    key={lineIdx}
                    className={`pt-2 first:pt-0 text-[11px] font-mono font-semibold uppercase tracking-wider ${
                      isAnswer
                        ? "text-[var(--sage)]"
                        : isTakeaway
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {label}:
                  </div>
                );
              }

              if (trimmed.startsWith("### ")) {
                return (
                  <h4
                    key={lineIdx}
                    className="pt-1 font-display text-sm font-bold text-[var(--foreground)]"
                  >
                    {renderInlineMarkdown(trimmed.slice(4))}
                  </h4>
                );
              }

              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/70" />
                    <span className="flex-1">{renderInlineMarkdown(trimmed.slice(2))}</span>
                  </div>
                );
              }

              if (/^\d+\.\s+/.test(trimmed)) {
                const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
                if (match) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-1">
                      <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                        {match[1]}
                      </span>
                      <span className="flex-1">{renderInlineMarkdown(match[2])}</span>
                    </div>
                  );
                }
              }

              return <p key={lineIdx}>{renderInlineMarkdown(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--foreground)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function AIAssistantDrawer() {
  const {
    isOpen,
    closeAssistant,
    examContext,
    messages,
    sendMessage,
    stopGeneration,
    clearConversation,
    isGenerating,
    error,
    quotaExceeded,
    usage,
  } = useAIAssistant();

  const [input, setInput] = useState("");
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, messages.length, isGenerating]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAssistant();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeAssistant]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const msg = input.trim();
    setLastUserMessage(msg);
    setInput("");
    await sendMessage(msg);
  };

  const handleRetryLast = () => {
    if (!lastUserMessage || isGenerating) return;
    sendMessage(lastUserMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContext = Boolean(
    examContext?.exam || examContext?.subject || examContext?.topic || examContext?.questionText
  );

  const quickPrompts = examContext?.questionText
    ? [
        "Solve this question and explain all 4 options",
        "Give an option elimination technique for this question",
        "Summarize the core concept and exam takeaway",
        ...(examContext?.userAnswer
          ? ["Explain why my selected answer is right or wrong"]
          : []),
      ]
    : [
        "Give me high-yield revision points for this topic",
        "Create 1 practice MCQ with option-by-option explanation",
        "Explain common exam traps and elimination rules",
        "Suggest a 7-day mock & revision strategy",
      ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={closeAssistant}
        aria-hidden="true"
      />

      {/* Drawer Panel: Responsive width on laptop (480px) and desktop (520px) */}
      <aside
        role="dialog"
        aria-label="MockMaster AI Exam Preparation Assistant"
        className="relative z-10 flex h-full min-h-dvh-safe max-h-dvh-safe w-full flex-col border-l border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl sm:max-w-[440px] lg:max-w-[480px] xl:max-w-[520px] animate-drawer-right"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold tracking-tight text-[var(--foreground)]">
                  MockMaster AI
                </h2>
                {usage && (
                  <span className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">
                    {usage.tier} · {usage.remaining}/{usage.limit} left
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                Exam Preparation Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={clearConversation}
              disabled={messages.length === 0 && !isGenerating}
              title="Clear conversation"
              aria-label="Clear conversation"
              className="mm-btn-press inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              type="button"
              onClick={closeAssistant}
              title="Close AI Assistant"
              aria-label="Close AI Assistant"
              className="mm-btn-press inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Exam / Question Context Bar */}
        {hasContext && (
          <div className="border-b border-[var(--border)] bg-[var(--muted)]/40 px-4 py-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] min-w-0">
                <BookOpen className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                {examContext?.exam && (
                  <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono font-semibold text-[var(--accent)]">
                    {examContext.exam}
                  </span>
                )}
                {examContext?.subject && (
                  <span className="text-[var(--muted-foreground)] font-medium truncate">
                    {examContext.subject}
                  </span>
                )}
                {examContext?.topic && (
                  <span className="text-[var(--muted-foreground)] truncate">
                    · {examContext.topic}
                  </span>
                )}
              </div>
              {examContext?.questionText && (
                <button
                  type="button"
                  onClick={() => setShowQuestionPreview((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline shrink-0 cursor-pointer"
                >
                  <span>Active Question</span>
                  {showQuestionPreview ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>

            {examContext?.questionText && showQuestionPreview && (
              <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs text-[var(--muted-foreground)] space-y-1 animate-editorial">
                <p className="font-medium text-[var(--foreground)] line-clamp-3">
                  {examContext.questionText}
                </p>
                {examContext.userAnswer && (
                  <p className="font-mono text-[11px]">
                    Selected Option: <strong className="text-[var(--foreground)]">{examContext.userAnswer}</strong>
                    {examContext.mode !== "exam" && examContext.correctAnswer && (
                      <>
                        {" "}
                        · Correct Option:{" "}
                        <strong className="text-[var(--sage)]">
                          {examContext.correctAnswer}
                        </strong>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto touch-scroll px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4 py-2 animate-editorial">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Competitive Exam Mentor</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Ask MockMaster AI to break down any MCQ, explain why each option (A/B/C/D) is right or wrong, teach elimination shortcuts, or build concise revision notes.
                </p>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] p-2.5 text-[11px] font-mono text-[var(--muted-foreground)] space-y-0.5">
                  <div className="text-[var(--foreground)] font-semibold">Structured MCQ Format:</div>
                  <div>• Answer: [correct option]</div>
                  <div>• Why: [concise explanation]</div>
                  <div>• Why other options are incorrect: A / B / C / D</div>
                  <div>• Exam takeaway: [short revision point]</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                  Suggested Prompts
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickPrompts.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(promptText)}
                      disabled={isGenerating}
                      className="mm-btn-press flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-xs text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--muted)]/50 cursor-pointer"
                    >
                      <span className="min-w-0 pr-2">{promptText}</span>
                      <HelpCircle className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col animate-fade-in ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3.5 py-2.5 ${
                    msg.role === "user"
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] text-xs sm:text-sm"
                      : "w-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                      {msg.content}
                    </p>
                  ) : (
                    <FormattedAIContent content={msg.content} />
                  )}
                </div>
                <span className="mt-1 px-1 font-mono text-[10px] text-[var(--muted-foreground)]">
                  {msg.role === "user" ? "You" : "MockMaster AI"}
                </span>
              </div>
            ))
          )}

          {/* Typing / Generation Indicator */}
          {isGenerating && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3.5 py-2.5 animate-editorial">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] min-w-0">
                <span className="flex gap-1 shrink-0">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]" />
                </span>
                <span className="truncate">Formulating explanation...</span>
              </div>
              <button
                type="button"
                onClick={stopGeneration}
                className="mm-btn-press inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] shrink-0 cursor-pointer"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                <span>Stop generation</span>
              </button>
            </div>
          )}

          {/* Error / Quota Notice */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-[var(--destructive)] space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed break-words">{error}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {lastUserMessage && !quotaExceeded && (
                  <button
                    type="button"
                    onClick={handleRetryLast}
                    className="mm-btn-press inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Request</span>
                  </button>
                )}
                {quotaExceeded && (
                  <Link
                    href="/pricing"
                    onClick={closeAssistant}
                    className="mm-btn-press inline-flex items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90"
                  >
                    <span>Upgrade Plan for Higher AI Quota</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer with iOS/Android safe-area bottom support */}
        <form
          onSubmit={handleSend}
          className="border-t border-[var(--border)] bg-[var(--card)] p-3 space-y-2 safe-pb shrink-0"
        >
          <div className="relative flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your exam..."
              maxLength={2000}
              className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base sm:text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={stopGeneration}
                title="Stop generation"
                aria-label="Stop generation"
                className="mm-btn-press inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                title="Send message"
                aria-label="Send message"
                className="mm-btn-press inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40 shrink-0 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-[var(--sage)]" />
              <span>Powered by Gemini · Exam-Aware Context</span>
            </span>
            <button
              type="button"
              onClick={clearConversation}
              disabled={messages.length === 0 && !isGenerating}
              className="hover:text-[var(--foreground)] disabled:opacity-40 cursor-pointer"
            >
              Clear conversation
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
