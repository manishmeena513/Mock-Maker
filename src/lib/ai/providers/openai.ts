import { AIQuestionProvider, GenerateQuestionsParams, GeneratedModelQuestion } from "../types";

export class OpenAIProvider implements AIQuestionProvider {
  name = "openai";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  async generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedModelQuestion[]> {
    console.log(`[OpenAIProvider stub] Called for exam=${params.examName}, count=${params.count}. Ready for Phase 2 API swap.`);
    // Future expansion: call OpenAI gpt-4o / gpt-4o-mini
    return [];
  }
}
