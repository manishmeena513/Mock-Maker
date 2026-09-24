import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIQuestionProvider,
  GenerateQuestionsParams,
  GeneratedModelQuestion,
  GeneratedQuestionItemSchema,
} from "../types";
import { recordAIGenerationLog } from "@/lib/db";

export class GeminiProvider implements AIQuestionProvider {
  name = "gemini";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
  }

  async generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedModelQuestion[]> {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const requestedCount = Math.min(Math.max(1, params.count || 5), 20);

    if (!this.apiKey || this.apiKey.includes("placeholder") || this.apiKey.includes("mock-")) {
      console.warn("Gemini API key is not configured. Falling back to pre-approved model questions.");
      return [];
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const sampleContext =
      params.samplePyqs && params.samplePyqs.length > 0
        ? `\nFEW-SHOT AUTHENTIC EXAM STYLE REFERENCES (DO NOT COPY, USE FOR TONE/DIFFICULTY):\n${JSON.stringify(
            params.samplePyqs,
            null,
            2
          )}\n`
        : "";

    const prompt = `You are an expert examination question setter for ${params.examName}.

TASK: Generate ${requestedCount} high-quality MODEL multiple-choice questions for subject "${params.subjectName}" and topic "${params.topicName}".
Difficulty Level: ${params.difficulty}
${sampleContext}
STRICT EXAM RULES:
- Never label or refer to any question as a Previous Year Question (PYQ).
- Follow the official ${params.examName} syllabus and question framing style.
- Formulate 4 mutually exclusive, plausible options (A, B, C, D).
- Ensure only one answer is unambiguously correct.
- Provide a structured explanation covering: why, concept, exam_perspective, remember, related_concept.

OUTPUT FORMAT: Strict JSON matching this schema:
{
  "questions": [
    {
      "question_text": "Question text here...",
      "option_a": "Option A text",
      "option_b": "Option B text",
      "option_c": "Option C text",
      "option_d": "Option D text",
      "correct_answer": "A",
      "explanation": {
        "why": "Detailed reason why correct answer is right...",
        "concept": "Core underlying concept...",
        "exam_perspective": "Why this matters in the exam...",
        "remember": "Short memory hook or rule...",
        "related_concept": "Related articles, topics, or formulas..."
      },
      "difficulty": "${params.difficulty}"
    }
  ]
}`;

    // Retry handling with exponential backoff and timeout
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // 25 second timeout guard
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API request timed out after 25s")), 25000)
        );

        const apiPromise = model.generateContent(prompt);
        const response = await Promise.race([apiPromise, timeoutPromise]);

        const rawText = response.response.text();
        if (!rawText || rawText.trim().length === 0) {
          throw new Error("Empty response from Gemini API");
        }

        // Clean markdown JSON code fences if present
        let cleaned = rawText.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsed = JSON.parse(cleaned);
        const rawList = Array.isArray(parsed?.questions)
          ? parsed.questions
          : Array.isArray(parsed)
          ? parsed
          : [];

        // Validate each question against the strict Zod schema
        const validatedQuestions: GeneratedModelQuestion[] = [];
        for (const rawQ of rawList) {
          const res = GeneratedQuestionItemSchema.safeParse(rawQ);
          if (res.success) {
            validatedQuestions.push(res.data);
          } else {
            console.warn("Skipping malformed AI question:", res.error.issues);
          }
        }

        // Audit log generation event
        try {
          await recordAIGenerationLog({
            provider: "gemini",
            model_name: modelName,
            exam_id: params.examName,
            subject_id: params.subjectName,
            topic_id: params.topicName,
            requested_count: requestedCount,
            generated_count: validatedQuestions.length,
            status: validatedQuestions.length > 0 ? "success" : "failed",
            error_message: null,
            prompt_preview: prompt.substring(0, 200),
            metadata: { difficulty: params.difficulty },
          });
        } catch {
          // ignore logging errors
        }

        return validatedQuestions;
      } catch (err: unknown) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isRateLimitOrTransient =
          errMsg.includes("429") ||
          errMsg.includes("ResourceExhausted") ||
          errMsg.includes("503") ||
          errMsg.includes("timed out");

        if (attempt <= maxRetries && isRateLimitOrTransient) {
          const backoffMs = attempt * 1500;
          console.warn(`Gemini attempt ${attempt} failed (${errMsg}). Retrying in ${backoffMs}ms...`);
          await new Promise((r) => setTimeout(r, backoffMs));
        } else {
          console.error(`Gemini question generation error after attempt ${attempt}:`, errMsg);

          try {
            await recordAIGenerationLog({
              provider: "gemini",
              model_name: modelName,
              exam_id: params.examName,
              subject_id: params.subjectName,
              topic_id: params.topicName,
              requested_count: requestedCount,
              generated_count: 0,
              status: "failed",
              error_message: errMsg,
              prompt_preview: prompt.substring(0, 200),
              metadata: { difficulty: params.difficulty },
            });
          } catch {
            // ignore logging errors
          }

          return [];
        }
      }
    }

    return [];
  }
}
