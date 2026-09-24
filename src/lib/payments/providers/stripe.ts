import crypto from "node:crypto";
import { PRICING_PLANS } from "@/lib/plans/config";
import {
  CreateOrderParams,
  PaymentOrder,
  PaymentProviderAdapter,
  PaymentWebhookResult,
  WebhookVerificationInput,
} from "../types";

export class StripeProvider implements PaymentProviderAdapter {
  public providerName = "stripe" as const;

  private getSecretKey(): string {
    return process.env.STRIPE_SECRET_KEY || "";
  }

  private getWebhookSecret(): string {
    return process.env.STRIPE_WEBHOOK_SECRET || "default_stripe_secret";
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const planKey = params.planId === "premium_annual" ? "annual" : "monthly";
    const plan = PRICING_PLANS[planKey];
    const amount = plan.amountPaise; // in paise
    const currency = "inr";

    const secretKey = this.getSecretKey();

    if (secretKey) {
      try {
        const body = new URLSearchParams();
        body.append("payment_method_types[0]", "card");
        body.append("mode", "payment");
        body.append("client_reference_id", params.userId);
        body.append("metadata[userId]", params.userId);
        body.append("metadata[planId]", params.planId);
        body.append("line_items[0][price_data][currency]", currency);
        body.append("line_items[0][price_data][unit_amount]", amount.toString());
        body.append("line_items[0][price_data][product_data][name]", plan.name);
        body.append("line_items[0][quantity]", "1");
        body.append("success_url", `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?payment=success`);
        body.append("cancel_url", `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing?payment=cancelled`);

        const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (res.ok) {
          const session = await res.json();
          return {
            orderId: session.id,
            amount,
            currency: currency.toUpperCase(),
            provider: "stripe",
            planId: params.planId,
            notes: {
              userId: params.userId,
              checkoutUrl: session.url,
            },
          };
        }
      } catch (err) {
        console.warn("Stripe API request failed, falling back to local order:", err);
      }
    }

    // Mock/Dev fallback
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId: mockSessionId,
      amount,
      currency: currency.toUpperCase(),
      provider: "stripe",
      planId: params.planId,
      notes: {
        userId: params.userId,
      },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<PaymentWebhookResult> {
    const { rawBody, signature } = input;
    const secret = this.getWebhookSecret();

    if (!signature) {
      return {
        success: false,
        eventId: `unknown_${Date.now()}`,
        provider: "stripe",
        error: "Missing stripe-signature header",
      };
    }

    // Parse Stripe signature format: t=timestamp,v1=signature
    const parts = signature.split(",");
    let timestamp = "";
    let signatureHash = "";

    for (const part of parts) {
      const [key, value] = part.trim().split("=");
      if (key === "t") timestamp = value;
      if (key === "v1") signatureHash = value;
    }

    if (!timestamp || !signatureHash) {
      return {
        success: false,
        eventId: `bad_header_${Date.now()}`,
        provider: "stripe",
        error: "Malformed stripe-signature header",
      };
    }

    // Expected signature: HMAC SHA256 of timestamp + "." + rawBody
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(signatureHash, "utf8");

    const isValid =
      expectedBuffer.length === actualBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    if (!isValid) {
      return {
        success: false,
        eventId: `unverified_${Date.now()}`,
        provider: "stripe",
        error: "Invalid Stripe webhook signature",
      };
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        success: false,
        eventId: `bad_json_${Date.now()}`,
        provider: "stripe",
        error: "Invalid JSON payload in Stripe webhook body",
      };
    }

    const eventId = (payload.id as string) || `evt_stripe_${Date.now()}`;
    const eventType = (payload.type as string) || "checkout.session.completed";
    const dataObj = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
    const metadata = (dataObj?.metadata as Record<string, string>) || {};

    const userId = metadata.userId || (dataObj?.client_reference_id as string) || "default-user";
    const planId = metadata.planId || "premium_monthly";
    const isAnnual = planId === "premium_annual";

    const periodEndDate = new Date();
    if (isAnnual) {
      periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
    } else {
      periodEndDate.setDate(periodEndDate.getDate() + 30);
    }

    return {
      success: true,
      eventId,
      provider: "stripe",
      userId,
      planType: "PREMIUM",
      amountPaid: (dataObj?.amount_total as number) || (isAnnual ? 299900 : 49900),
      currency: ((dataObj?.currency as string) || "inr").toUpperCase(),
      providerSubscriptionId: (dataObj?.id as string) || `sub_stripe_${Date.now()}`,
      providerCustomerId: (dataObj?.customer as string) || undefined,
      status: "active",
      currentPeriodEnd: periodEndDate.toISOString(),
      eventType,
    };
  }
}
