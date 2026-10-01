import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, AIAssistantChatRequestSchema } from "@/lib/ai";
import { GeminiServiceError, getConfiguredGeminiModel } from "@/lib/ai/providers/gemini";
import { getVerifiedServerUser } from "@/lib/auth/server";
import { canUserSendAIChatMessage } from "@/lib/plans/limits";
import { recordAIAssistantUsageLog } from "@/lib/db";
import { aiChatLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

function redactUserId(userId: string): string {
  if (!userId || userId.length <= 8) return "u_redacted";
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

async function resolveAuthenticatedUser(req: NextRequest): Promise<{
  authenticated: boolean;
  userId?: string;
  error?: string;
}> {
  if (process.env.NODE_ENV !== "production") {
    const testAuth = req.headers.get("x-test-auth");
    if (testAuth === "unauthenticated") {
      return {
        authenticated: false,
        error: "Authentication required. Please sign in to use MockMaster AI Assistant.",
      };
    }
    const testUserId = req.headers.get("x-test-user-id");
    if (testUserId) {
      return { authenticated: true, userId: testUserId };
    }
  }

  const verified = await getVerifiedServerUser();
  if (verified.isSupabaseConfigured) {
    if (!verified.authenticated || !verified.userId) {
      return {
        authenticated: false,
        error: "Authentication required. Please sign in to use MockMaster AI Assistant.",
      };
    }
    return { authenticated: true, userId: verified.userId };
  }

  return { authenticated: true, userId: "default-user" };
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.authenticated || !auth.userId) {
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 }),
      requestId
    );
  }

  const quota = await canUserSendAIChatMessage(auth.userId);
  return withRequestIdHeaders(
    NextResponse.json(
      {
        success: true,
        usage: {
          used: quota.currentCount,
          limit: quota.maxAllowed,
          remaining: quota.remaining,
          tier: quota.tier,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
        },
      }
    ),
    requestId
  );
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const configuredModel = getConfiguredGeminiModel();

  // 1. Authentication Check
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.authenticated || !auth.userId) {
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 }),
      requestId
    );
  }

  const userId = auth.userId;

  // 2. Per-Minute Burst Rate Limiting
  const rateCheck = await aiChatLimiter.check(req, userId);
  if (!rateCheck.success) {
    logger.warn("Rate limit exceeded on AI Assistant chat", {
      requestId,
      userId: redactUserId(userId),
      provider: "gemini",
      model: configuredModel,
      status: 429,
      errorCategory: "rate_limited",
    });
    await recordAIAssistantUsageLog({
      user_id: userId,
      provider: "gemini",
      model: configuredModel,
      message_length: 0,
      response_length: 0,
      latency_ms: 0,
      status: "rate_limited",
      error_message: "Per-minute burst rate limit exceeded",
    });
    return withRequestIdHeaders(
      NextResponse.json(
        {
          error: "Too many messages sent in a short window. Please wait a few seconds before asking again.",
          errorCategory: "rate_limited",
          requestId,
        },
        { status: 429 }
      ),
      requestId
    );
  }

  // 3. Parse & Validate Payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withRequestIdHeaders(
      NextResponse.json({ error: "Invalid JSON request body.", requestId }, { status: 400 }),
      requestId
    );
  }

  const parsed = AIAssistantChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid chat request payload.";
    return withRequestIdHeaders(
      NextResponse.json(
        { error: firstIssue, errorCategory: "invalid_request", requestId },
        { status: 400 }
      ),
      requestId
    );
  }

  // 4. Plan-Based Daily Quota Check
  const quota = await canUserSendAIChatMessage(userId);
  if (!quota.allowed) {
    await recordAIAssistantUsageLog({
      user_id: userId,
      provider: "gemini",
      model: configuredModel,
      message_length: parsed.data.message.length,
      response_length: 0,
      latency_ms: 0,
      status: "rate_limited",
      context_exam: parsed.data.context?.exam || null,
      context_subject: parsed.data.context?.subject || null,
      context_topic: parsed.data.context?.topic || null,
      error_message: "Daily plan quota exceeded",
    });

    return withRequestIdHeaders(
      NextResponse.json(
        {
          error: quota.reason || "Daily AI Assistant message quota reached.",
          quotaExceeded: true,
          errorCategory: "quota_exceeded",
          requestId,
          usage: {
            used: quota.currentCount,
            limit: quota.maxAllowed,
            remaining: 0,
            tier: quota.tier,
          },
        },
        { status: 429 }
      ),
      requestId
    );
  }

  // 5. Call Existing AI Provider (Gemini)
  const aiProvider = getAIProvider();
  const startTime = Date.now();

  try {
    const result = await aiProvider.chatWithAssistant({
      message: parsed.data.message,
      history: parsed.data.history,
      context: parsed.data.context,
      userId,
    });

    await recordAIAssistantUsageLog({
      user_id: userId,
      provider: result.provider,
      model: result.model,
      message_length: parsed.data.message.length,
      response_length: result.reply.length,
      latency_ms: result.latencyMs,
      status: "success",
      context_exam: parsed.data.context?.exam || null,
      context_subject: parsed.data.context?.subject || null,
      context_topic: parsed.data.context?.topic || null,
      error_message: null,
    });

    const newUsed = quota.currentCount + 1;
    const newRemaining = Math.max(0, quota.maxAllowed - newUsed);

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        reply: result.reply,
        model: result.model,
        provider: result.provider,
        latencyMs: result.latencyMs,
        requestId,
        usage: {
          used: newUsed,
          limit: quota.maxAllowed,
          remaining: newRemaining,
          tier: quota.tier,
        },
      }),
      requestId
    );
  } catch (err: unknown) {
    const latencyMs = Math.max(1, Date.now() - startTime);
    const isGeminiErr = err instanceof GeminiServiceError;
    const errorCategory = isGeminiErr ? err.category : "service_error";
    const errorCode = isGeminiErr ? err.statusCode : 503;
    const modelAttempted = isGeminiErr ? err.model : configuredModel;
    const isTimeout = isGeminiErr ? err.isTimeout : false;
    const upstreamMessage = isGeminiErr ? err.upstreamMessage : undefined;
    const userMessage =
      isGeminiErr && err.message
        ? err.message
        : "AI couldn't process that request right now. Please try again.";

    // Structured server-side diagnostic log (never logs GEMINI_API_KEY, tokens, or secrets)
    logger.error("AI Assistant chat failure", err, {
      requestId,
      provider: aiProvider.name,
      model: modelAttempted,
      status: 503,
      errorCategory,
      errorCode,
      timeout: isTimeout,
      upstreamMessage,
      userId: redactUserId(userId),
    });

    await recordAIAssistantUsageLog({
      user_id: userId,
      provider: aiProvider.name,
      model: modelAttempted,
      message_length: parsed.data.message.length,
      response_length: 0,
      latency_ms: latencyMs,
      status: "failed",
      context_exam: parsed.data.context?.exam || null,
      context_subject: parsed.data.context?.subject || null,
      context_topic: parsed.data.context?.topic || null,
      error_message: `${errorCategory} (${errorCode})`,
    });

    return withRequestIdHeaders(
      NextResponse.json(
        {
          error: userMessage,
          errorCategory,
          requestId,
          usage: {
            used: quota.currentCount,
            limit: quota.maxAllowed,
            remaining: quota.remaining,
            tier: quota.tier,
          },
        },
        { status: 503 }
      ),
      requestId
    );
  }
}
