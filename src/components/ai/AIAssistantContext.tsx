"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { AIAssistantContextPayload } from "@/lib/ai/types";

export interface AIAssistantMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  contextSnapshot?: {
    exam?: string | null;
    subject?: string | null;
    topic?: string | null;
    hasQuestion?: boolean;
  };
}

export interface AIAssistantUsageQuota {
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}

interface AIAssistantContextValue {
  isOpen: boolean;
  openAssistant: (initialPrompt?: string, overrideContext?: Partial<AIAssistantContextPayload>) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  examContext: AIAssistantContextPayload;
  setExamContext: (ctx: AIAssistantContextPayload) => void;
  updateExamContext: (partial: Partial<AIAssistantContextPayload>) => void;
  clearExamContext: () => void;
  messages: AIAssistantMessageItem[];
  sendMessage: (content: string, overrideContext?: AIAssistantContextPayload) => Promise<void>;
  stopGeneration: () => void;
  clearConversation: () => void;
  isGenerating: boolean;
  error: string | null;
  quotaExceeded: boolean;
  usage: AIAssistantUsageQuota | null;
}

const SESSION_STORAGE_KEY = "mockmaster_ai_assistant_session_v1";

const AIAssistantContext = createContext<AIAssistantContextValue | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [examContext, setExamContextState] = useState<AIAssistantContextPayload>({
    mode: "general",
  });
  const examContextRef = useRef<AIAssistantContextPayload>(examContext);
  const [messages, setMessages] = useState<AIAssistantMessageItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [usage, setUsage] = useState<AIAssistantUsageQuota | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Restore session conversation on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed.slice(-30));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Persist session conversation
  useEffect(() => {
    try {
      if (messages.length === 0) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
      }
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  // Listen for logout events to clear session chat history
  useEffect(() => {
    const handleClearOnLogout = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setMessages([]);
      setIsOpen(false);
      setError(null);
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
    };

    window.addEventListener("mockmaster:logout", handleClearOnLogout);
    return () => {
      window.removeEventListener("mockmaster:logout", handleClearOnLogout);
    };
  }, []);

  // Fetch initial quota when drawer opens for the first time
  useEffect(() => {
    if (isOpen && !usage) {
      fetch("/api/ai/chat", { method: "GET" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.usage) {
            setUsage(data.usage);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [isOpen, usage]);

  const setExamContext = useCallback((ctx: AIAssistantContextPayload) => {
    const nextCtx = ctx || { mode: "general" };
    examContextRef.current = nextCtx;
    setExamContextState(nextCtx);
  }, []);

  const updateExamContext = useCallback((partial: Partial<AIAssistantContextPayload>) => {
    setExamContextState((prev) => {
      const nextCtx: AIAssistantContextPayload = {
        ...(prev || {}),
        ...partial,
      };
      examContextRef.current = nextCtx;
      return nextCtx;
    });
  }, []);

  const clearExamContext = useCallback(() => {
    const nextCtx: AIAssistantContextPayload = { mode: "general" };
    examContextRef.current = nextCtx;
    setExamContextState(nextCtx);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const clearConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, overrideContext?: AIAssistantContextPayload) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating) return;

      setError(null);
      setQuotaExceeded(false);

      const activeCtx = overrideContext || examContextRef.current || examContext;
      const userMessage: AIAssistantMessageItem = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        contextSnapshot: {
          exam: activeCtx?.exam,
          subject: activeCtx?.subject,
          topic: activeCtx?.topic,
          hasQuestion: Boolean(activeCtx?.questionText),
        },
      };

      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyPayload,
            context: activeCtx,
          }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (data?.usage) {
          setUsage(data.usage);
        }

        if (!res.ok) {
          if (data?.quotaExceeded) {
            setQuotaExceeded(true);
          }
          setError(data?.error || "AI couldn't process that request right now. Please try again.");
          setIsGenerating(false);
          return;
        }

        const assistantMessage: AIAssistantMessageItem = {
          id: `msg-ai-${Date.now()}`,
          role: "assistant",
          content: data.reply || "No response generated.",
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User stopped generation intentionally
          return;
        }
        setError("Connection interrupted. Please try sending your question again.");
      } finally {
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    },
    [examContext, isGenerating, messages]
  );

  const openAssistant = useCallback(
    (initialPrompt?: string, overrideContext?: Partial<AIAssistantContextPayload>) => {
      let mergedContext: AIAssistantContextPayload | undefined;
      if (overrideContext) {
        mergedContext = {
          ...(examContextRef.current || {}),
          ...overrideContext,
        };
        examContextRef.current = mergedContext;
        setExamContextState(mergedContext);
      }
      setIsOpen(true);
      if (initialPrompt && initialPrompt.trim()) {
        const contextForPrompt = mergedContext || examContextRef.current;
        setTimeout(() => {
          sendMessage(initialPrompt.trim(), contextForPrompt);
        }, 50);
      }
    },
    [sendMessage]
  );

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        examContext,
        setExamContext,
        updateExamContext,
        clearExamContext,
        messages,
        sendMessage,
        stopGeneration,
        clearConversation,
        isGenerating,
        error,
        quotaExceeded,
        usage,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant(): AIAssistantContextValue {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) {
    // Provide safe no-op fallback if rendered outside provider
    return {
      isOpen: false,
      openAssistant: () => {},
      closeAssistant: () => {},
      toggleAssistant: () => {},
      examContext: { mode: "general" },
      setExamContext: () => {},
      updateExamContext: () => {},
      clearExamContext: () => {},
      messages: [],
      sendMessage: async () => {},
      stopGeneration: () => {},
      clearConversation: () => {},
      isGenerating: false,
      error: null,
      quotaExceeded: false,
      usage: null,
    };
  }
  return ctx;
}
