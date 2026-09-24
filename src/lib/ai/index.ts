import { AIQuestionProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";

export function getAIProvider(): AIQuestionProvider {
  const providerName = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  switch (providerName) {
    case "openai":
      return new OpenAIProvider();
    case "gemini":
    default:
      return new GeminiProvider();
  }
}

export * from "./types";
