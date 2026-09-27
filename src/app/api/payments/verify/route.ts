import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAndActivatePayment } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { paymentLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

const VerifyPaymentSchema = z.object({
  orderId: z.string().min(3),
  paymentId: z.string().min(3),
  signature: z.string().min(3),
  planId: z.enum([
    "pro_monthly",
    "pro_yearly",
    "elite_monthly",
    "elite_yearly",
    "PRO_MONTHLY",
    "PRO_YEARLY",
    "ELITE_MONTHLY",
    "ELITE_YEARLY",
    "premium_monthly",
    "premium_annual",
  ]),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  const rateCheck = await paymentLimiter.check(request);
  if (!rateCheck.success) {
    return withRequestIdHeaders(
      NextResponse.json({ error: "Rate limit exceeded. Please try again shortly." }, { status: 429 }),
      requestId
    );
  }

  try {
    let userId = "default-user";

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    } catch {
      // dev fallback
    }

    const body = await request.json();
    const parsed = VerifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return withRequestIdHeaders(
        NextResponse.json(
          { error: "Invalid payment verification payload", details: parsed.error.format() },
          { status: 400 }
        ),
        requestId
      );
    }

    const result = await verifyAndActivatePayment({
      orderId: parsed.data.orderId,
      paymentId: parsed.data.paymentId,
      signature: parsed.data.signature,
      planId: parsed.data.planId,
      userId,
    });

    if (!result.verified) {
      logger.warn("Payment signature verification failed", {
        orderId: parsed.data.orderId,
        userId,
        requestId,
      });
      return withRequestIdHeaders(
        NextResponse.json({ error: result.error || "Signature verification failed" }, { status: 400 }),
        requestId
      );
    }

    logger.info("Verified payment and upgraded user plan", {
      orderId: parsed.data.orderId,
      planType: result.planType,
      planCode: result.planCode,
      userId,
      requestId,
    });

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        planType: result.planType,
        planCode: result.planCode,
        validUntil: result.validUntil,
      }),
      requestId
    );
  } catch (error) {
    logger.error("Payment verification error", error, { requestId });
    return withRequestIdHeaders(
      NextResponse.json(
        { error: "Failed to verify payment signature" },
        { status: 500 }
      ),
      requestId
    );
  }
}
