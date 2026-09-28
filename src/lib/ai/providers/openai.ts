import {
  AIQuestionProvider,
  GenerateQuestionsParams,
  GeneratedModelQuestion,
  AIAssistantChatParams,
  AIAssistantChatResponse,
  ExtractQuestionsChunkParams,
  ExtractedCandidateItem,
} from "../types";

export class OpenAIProvider implements AIQuestionProvider {
  name = "openai";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  async generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedModelQuestion[]> {
    console.log(
      `[OpenAIProvider stub] Called for exam=${params.examName}, count=${params.count}. Ready for Phase 2 API swap.`
    );
    return [];
  }

  async chatWithAssistant(params: AIAssistantChatParams): Promise<AIAssistantChatResponse> {
    return {
      reply: `Answer:\nOption A\n\nWhy:\nDetailed explanation for: ${params.message}\n\nWhy other options are incorrect:\nA / B / C / D\n\nExam takeaway:\nFocus on core syllabus concepts.`,
      model: "gpt-4o-mini",
      provider: this.name,
      latencyMs: 5,
    };
  }

  async extractQuestionsFromChunk(
    _params: ExtractQuestionsChunkParams
  ): Promise<ExtractedCandidateItem[]> {
    return [];
  }
}
