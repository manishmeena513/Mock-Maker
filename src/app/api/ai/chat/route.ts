import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, AIAssistantChatRequestSchema } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { canUserSendAIChatMessage } from "@/lib/plans/limits";
import { recordAIAssistantUsageLog } from "@/lib/db";
import { aiChatLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = Boolean(
    url &&
      key &&
      url !== "https://mockmaster.supabase.co" &&
      !key.includes("placeholder") &&
      !key.includes("mock-")
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return {
          authenticated: false,
          error: "Authentication required. Please sign in to use MockMaster AI Assistant.",
        };
      }
      return { authenticated: true, userId: user.id };
    } catch {
      return {
        authenticated: false,
        error: "Authentication session could not be verified.",
      };
    }
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
    NextResponse.json({
      success: true,
      usage: {
        used: quota.currentCount,
        limit: quota.maxAllowed,
        remaining: quota.remaining,
        tier: quota.tier,
      },
    }),
    requestId
  );
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

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
    logger.warn("Rate limit exceeded on AI Assistant chat", { requestId, userId });
    await recordAIAssistantUsageLog({
      user_id: userId,
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
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
      NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }),
      requestId
    );
  }

  const parsed = AIAssistantChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid chat request payload.";
    return withRequestIdHeaders(
      NextResponse.json(
        { error: firstIssue, details: parsed.error.format() },
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
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
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
    const errMsg =
      err instanceof Error
        ? err.message
        : "AI Assistant is temporarily unavailable. Please try again shortly.";

    logger.error("AI Assistant chat failure", err, { requestId, userId });

    await recordAIAssistantUsageLog({
      user_id: userId,
      provider: aiProvider.name,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      message_length: parsed.data.message.length,
      response_length: 0,
      latency_ms: latencyMs,
      status: "failed",
      context_exam: parsed.data.context?.exam || null,
      context_subject: parsed.data.context?.subject || null,
      context_topic: parsed.data.context?.topic || null,
      error_message: errMsg,
    });

    return withRequestIdHeaders(
      NextResponse.json(
        {
          error: "MockMaster AI is temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 }
      ),
      requestId
    );
  }
}
