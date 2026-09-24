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

export interface AIQuestionProvider {
  name: string;
  generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedModelQuestion[]>;
}
