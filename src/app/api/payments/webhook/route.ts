import { NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/payments";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const rawBody = await request.text();
    const rzpSignature = request.headers.get("x-razorpay-signature");
    const stripeSignature = request.headers.get("stripe-signature");

    const provider = stripeSignature ? "stripe" : "razorpay";
    const signature = stripeSignature || rzpSignature || "";

    if (!signature) {
      logger.warn("Webhook received without provider signature", { requestId });
      return withRequestIdHeaders(
        NextResponse.json(
          { error: "Missing payment provider signature header" },
          { status: 400 }
        ),
        requestId
      );
    }

    const result = await processPaymentWebhook(
      {
        rawBody,
        signature,
      },
      provider
    );

    if (!result.success) {
      logger.warn("Webhook verification failed", { requestId, error: result.error, provider });
      return withRequestIdHeaders(
        NextResponse.json(
          { error: result.error || "Signature verification failed" },
          { status: 400 }
        ),
        requestId
      );
    }

    logger.info("Webhook processed successfully", {
      requestId,
      eventId: result.eventId,
      provider: result.provider,
      userId: result.userId,
      duplicate: result.idempotentDuplicate,
    });

    return withRequestIdHeaders(
      NextResponse.json({
        received: true,
        eventId: result.eventId,
        status: result.status,
        idempotentDuplicate: result.idempotentDuplicate,
      }),
      requestId
    );
  } catch (error) {
    logger.error("Webhook processing error", error, { requestId });
    return withRequestIdHeaders(
      NextResponse.json(
        { error: "Webhook internal processing failure" },
        { status: 500 }
      ),
      requestId
    );
  }
}
