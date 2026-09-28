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
} from "lucide-react";
import { useAIAssistant } from "./AIAssistantContext";

function FormattedAIContent({ content }: { content: string }) {
  // Parse code blocks and structured paragraphs cleanly
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-foreground">
      {blocks.map((block, idx) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const lines = block.slice(3, -3).trim().split("\n");
          const firstLine = lines[0]?.trim() || "";
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const codeContent = hasLang ? lines.slice(1).join("\n") : lines.join("\n");
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-lg border border-border bg-secondary/70 p-3 font-mono text-xs text-foreground"
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
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isTakeaway
                        ? "text-primary"
                        : "text-muted-foreground"
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
                    className="pt-1 font-display text-sm font-bold text-foreground"
                  >
                    {renderInlineMarkdown(trimmed.slice(4))}
                  </h4>
                );
              }

              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span className="flex-1">{renderInlineMarkdown(trimmed.slice(2))}</span>
                  </div>
                );
              }

              if (/^\d+\.\s+/.test(trimmed)) {
                const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
                if (match) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-1">
                      <span className="font-mono text-xs font-semibold text-primary">
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
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary"
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages.length, isGenerating]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg);
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
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={closeAssistant}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-label="MockMaster AI Exam Preparation Assistant"
        className="relative z-10 flex h-full w-full flex-col border-l border-border bg-card text-card-foreground shadow-2xl sm:max-w-[430px]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-primary border border-primary/25">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                  MockMaster AI
                </h2>
                {usage && (
                  <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                    {usage.tier} · {usage.remaining}/{usage.limit} left
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Exam Preparation Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearConversation}
              disabled={messages.length === 0 && !isGenerating}
              title="Clear conversation"
              aria-label="Clear conversation"
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              type="button"
              onClick={closeAssistant}
              title="Close AI Assistant"
              aria-label="Close AI Assistant"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Exam / Question Context Bar */}
        {hasContext && (
          <div className="border-b border-border bg-secondary/40 px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                {examContext?.exam && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-primary">
                    {examContext.exam}
                  </span>
                )}
                {examContext?.subject && (
                  <span className="text-muted-foreground font-medium">
                    {examContext.subject}
                  </span>
                )}
                {examContext?.topic && (
                  <span className="text-muted-foreground">
                    · {examContext.topic}
                  </span>
                )}
              </div>
              {examContext?.questionText && (
                <button
                  type="button"
                  onClick={() => setShowQuestionPreview((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
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
              <div className="mt-2 rounded-md border border-border bg-card p-2.5 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground line-clamp-3">
                  {examContext.questionText}
                </p>
                {examContext.userAnswer && (
                  <p className="font-mono text-[11px]">
                    Selected Option: <strong className="text-foreground">{examContext.userAnswer}</strong>
                    {examContext.mode !== "exam" && examContext.correctAnswer && (
                      <>
                        {" "}
                        · Correct Option:{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400">
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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Competitive Exam Mentor</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask MockMaster AI to break down any MCQ, explain why each option (A/B/C/D) is right or wrong, teach elimination shortcuts, or build concise revision notes.
                </p>
                <div className="rounded-lg border border-border/70 bg-card p-2.5 text-[11px] font-mono text-muted-foreground space-y-0.5">
                  <div className="text-foreground font-semibold">Structured MCQ Format:</div>
                  <div>• Answer: [correct option]</div>
                  <div>• Why: [concise explanation]</div>
                  <div>• Why other options are incorrect: A / B / C / D</div>
                  <div>• Exam takeaway: [short revision point]</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Suggested Prompts
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickPrompts.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(promptText)}
                      disabled={isGenerating}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-secondary/50"
                    >
                      <span>{promptText}</span>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3.5 py-2.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground text-sm"
                      : "w-full border border-border bg-secondary/25 text-foreground"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  ) : (
                    <FormattedAIContent content={msg.content} />
                  )}
                </div>
                <span className="mt-1 px-1 font-mono text-[10px] text-muted-foreground">
                  {msg.role === "user" ? "You" : "MockMaster AI"}
                </span>
              </div>
            ))
          )}

          {/* Typing / Generation Indicator */}
          {isGenerating && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </span>
                <span>Analyzing exam context & formulating explanation...</span>
              </div>
              <button
                type="button"
                onClick={stopGeneration}
                className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                <span>Stop generation</span>
              </button>
            </div>
          )}

          {/* Error / Quota Notice */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {quotaExceeded && (
                <div className="pt-1">
                  <Link
                    href="/pricing"
                    onClick={closeAssistant}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <span>Upgrade Plan for Higher AI Quota</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form
          onSubmit={handleSend}
          className="border-t border-border bg-card p-3 space-y-2"
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
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={stopGeneration}
                title="Stop generation"
                aria-label="Stop generation"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 shrink-0"
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
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Powered by Gemini · Exam-Aware Context</span>
            </span>
            <button
              type="button"
              onClick={clearConversation}
              disabled={messages.length === 0 && !isGenerating}
              className="hover:text-foreground disabled:opacity-40"
            >
              Clear conversation
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
