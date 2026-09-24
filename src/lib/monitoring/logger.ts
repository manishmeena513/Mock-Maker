import { NextResponse } from "next/server";

const SENSITIVE_KEYS = new Set([
  "apikey",
  "api_key",
  "secret",
  "password",
  "authorization",
  "token",
  "credit_card",
  "card_number",
  "cvv",
  "gemini_api_key",
  "stripe_secret_key",
  "razorpay_key_secret",
]);

function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("secret") || lowerKey.includes("key")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? sanitizeData(context) : undefined;
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp,
        message,
        ...(cleanContext ? { context: cleanContext } : {}),
      })
    );
  },

  warn(message: string, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? sanitizeData(context) : undefined;
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp,
        message,
        ...(cleanContext ? { context: cleanContext } : {}),
      })
    );
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? sanitizeData(context) : undefined;
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;

    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp,
        message,
        error: errorDetails,
        ...(cleanContext ? { context: cleanContext } : {}),
      })
    );
  },
};

export function withRequestIdHeaders(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("X-Request-ID", requestId);
  return response;
}
