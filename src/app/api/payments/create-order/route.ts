import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPaymentOrder } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { paymentLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

const CreateOrderSchema = z.object({
  planId: z.enum(["premium_monthly", "premium_annual"]),
  provider: z.enum(["razorpay", "stripe"]).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  const rateCheck = await paymentLimiter.check(request);
  if (!rateCheck.success) {
    logger.warn("Rate limit exceeded on payment order creation", { requestId });
    return withRequestIdHeaders(
      NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 }),
      requestId
    );
  }

  try {
    let userId = "default-user";
    let userEmail: string | undefined;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
        userEmail = user.email;
      }
    } catch {
      // dev fallback
    }

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return withRequestIdHeaders(
        NextResponse.json(
          { error: "Invalid request payload", details: parsed.error.format() },
          { status: 400 }
        ),
        requestId
      );
    }

    const order = await createPaymentOrder(
      {
        planId: parsed.data.planId,
        userId,
        userEmail,
      },
      parsed.data.provider
    );

    logger.info("Created payment order", { orderId: order.orderId, planId: order.planId, userId });

    return withRequestIdHeaders(
      NextResponse.json({
        success: true,
        order,
      }),
      requestId
    );
  } catch (error) {
    logger.error("Payment order creation error", error, { requestId });
    return withRequestIdHeaders(
      NextResponse.json(
        { error: "Failed to initialize payment order" },
        { status: 500 }
      ),
      requestId
    );
  }
}
