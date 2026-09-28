import { z } from "zod";
import type { DifficultyLevel, StructuredExplanation } from "@/types/database";

export const GeneratedExplanationSchema = z.object({
  why: z.string().min(1, "explanation.why is required"),
  concept: z.string().min(1, "explanation.concept is required"),
  exam_perspective: z.string().optional().default(""),
  remember: z.string().optional().default(""),
  related_concept: z.string().optional().default(""),
});

export const GeneratedQuestionItemSchema = z.object({
  question_text: z.string().min(5, "question_text must be at least 5 characters"),
  option_a: z.string().min(1, "option_a is required"),
  option_b: z.string().min(1, "option_b is required"),
  option_c: z.string().min(1, "option_c is required"),
  option_d: z.string().min(1, "option_d is required"),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: GeneratedExplanationSchema,
  difficulty: z.enum(["easy", "moderate", "hard"]).default("moderate"),
});

export type GeneratedModelQuestion = z.infer<typeof GeneratedQuestionItemSchema>;

export interface GenerateQuestionsParams {
  examName: string;
  subjectName: string;
  topicName: string;
  count: number;
  difficulty: DifficultyLevel;
  samplePyqs?: Array<{
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
  }>;
}

export const AIAssistantContextSchema = z
  .object({
    exam: z.string().max(120).nullable().optional(),
    subject: z.string().max(120).nullable().optional(),
    topic: z.string().max(160).nullable().optional(),
    questionText: z.string().max(2500).nullable().optional(),
    options: z
      .object({
        A: z.string().max(600).optional(),
        B: z.string().max(600).optional(),
        C: z.string().max(600).optional(),
        D: z.string().max(600).optional(),
      })
      .nullable()
      .optional(),
    userAnswer: z.enum(["A", "B", "C", "D"]).nullable().optional(),
    correctAnswer: z.enum(["A", "B", "C", "D"]).nullable().optional(),
    explanation: z.string().max(2500).nullable().optional(),
    mode: z
      .enum(["practice", "exam", "results", "revision", "explorer", "general"])
      .nullable()
      .optional(),
    page: z.string().max(120).nullable().optional(),
  })
  .optional();

export type AIAssistantContextPayload = z.infer<typeof AIAssistantContextSchema>;

export const AIAssistantHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export type AIAssistantHistoryItem = z.infer<typeof AIAssistantHistoryItemSchema>;

export const AIAssistantChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message exceeds maximum length of 2000 characters"),
  history: z.array(AIAssistantHistoryItemSchema).max(12).optional().default([]),
  context: AIAssistantContextSchema,
});

export interface AIAssistantChatParams {
  message: string;
  history?: AIAssistantHistoryItem[];
  context?: AIAssistantContextPayload;
  userId?: string;
}

export interface AIAssistantChatResponse {
  reply: string;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface ExtractedCandidateItem {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D" | null;
  requires_answer_verification?: boolean;
  explanation?: {
    why?: string;
    concept?: string;
    exam_perspective?: string;
    remember?: string;
    related_concept?: string;
  } | string;
  exam?: string | null;
  subject?: string | null;
  topic?: string | null;
  source_year?: number | null;
  source_paper?: string | null;
  source_line?: number | null;
  question_type?: "PYQ" | "MODEL";
  difficulty?: DifficultyLevel;
  confidence?: number;
}

export interface ExtractQuestionsChunkParams {
  content: string;
  filename: string;
  sourcePath: string;
  sourceRepository: string;
  defaultExam?: string | null;
  defaultSubject?: string | null;
  defaultTopic?: string | null;
  defaultQuestionType?: "PYQ" | "MODEL" | "AUTO";
}

export interface AIQuestionProvider {
  name: string;
  generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedModelQuestion[]>;
  chatWithAssistant(params: AIAssistantChatParams): Promise<AIAssistantChatResponse>;
  extractQuestionsFromChunk(params: ExtractQuestionsChunkParams): Promise<ExtractedCandidateItem[]>;
}

