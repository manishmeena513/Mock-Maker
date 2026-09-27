import crypto from "node:crypto";
import { PRICING_PLANS } from "@/lib/plans/config";
import { UserPlanType } from "@/types/database";
import {
  CheckoutPlanId,
  CreateOrderParams,
  PaymentOrder,
  PaymentProviderAdapter,
  PaymentWebhookResult,
  VerifyCheckoutSignatureInput,
  WebhookVerificationInput,
} from "../types";

export function resolvePlanFromPlanId(planId: string): {
  planKey: keyof typeof PRICING_PLANS;
  planType: UserPlanType;
  planCode: string;
  billingCycle: "monthly" | "yearly";
  amountPaise: number;
} {
  const normalized = planId.toLowerCase();
  if (normalized === "pro_monthly") {
    return {
      planKey: "pro_monthly",
      planType: "PRO",
      planCode: "PRO_MONTHLY",
      billingCycle: "monthly",
      amountPaise: PRICING_PLANS.pro_monthly.amountPaise,
    };
  }
  if (normalized === "pro_yearly") {
    return {
      planKey: "pro_yearly",
      planType: "PRO",
      planCode: "PRO_YEARLY",
      billingCycle: "yearly",
      amountPaise: PRICING_PLANS.pro_yearly.amountPaise,
    };
  }
  if (normalized === "elite_monthly") {
    return {
      planKey: "elite_monthly",
      planType: "ELITE",
      planCode: "ELITE_MONTHLY",
      billingCycle: "monthly",
      amountPaise: PRICING_PLANS.elite_monthly.amountPaise,
    };
  }
  if (normalized === "elite_yearly") {
    return {
      planKey: "elite_yearly",
      planType: "ELITE",
      planCode: "ELITE_YEARLY",
      billingCycle: "yearly",
      amountPaise: PRICING_PLANS.elite_yearly.amountPaise,
    };
  }
  if (normalized === "premium_annual") {
    return {
      planKey: "annual",
      planType: "PREMIUM",
      planCode: "ELITE_YEARLY",
      billingCycle: "yearly",
      amountPaise: PRICING_PLANS.annual.amountPaise,
    };
  }
  return {
    planKey: "monthly",
    planType: "PREMIUM",
    planCode: "PRO_MONTHLY",
    billingCycle: "monthly",
    amountPaise: PRICING_PLANS.monthly.amountPaise,
  };
}

export class RazorpayProvider implements PaymentProviderAdapter {
  public providerName = "razorpay" as const;

  private getKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  }

  private getKeySecret(): string {
    return process.env.RAZORPAY_KEY_SECRET || "";
  }

  private getWebhookSecret(): string {
    return process.env.RAZORPAY_WEBHOOK_SECRET || "default_razorpay_secret";
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const resolved = resolvePlanFromPlanId(params.planId);
    const amount = resolved.amountPaise;
    const currency = "INR";
    const receipt = `rcpt_${params.userId.substring(0, 8)}_${Date.now()}`;

    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();

    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            currency,
            receipt,
            notes: {
              userId: params.userId,
              planId: params.planId,
              planCode: resolved.planCode,
              planType: resolved.planType,
              billingCycle: resolved.billingCycle,
              userEmail: params.userEmail || "",
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            orderId: data.id,
            amount: data.amount,
            currency: data.currency,
            provider: "razorpay",
            planId: params.planId,
            planType: resolved.planType,
            billingCycle: resolved.billingCycle,
            keyId,
            notes: data.notes,
          };
        }
      } catch (err) {
        console.warn("Razorpay API request failed, falling back to local order:", err);
      }
    }

    // Mock/Dev fallback order
    const mockOrderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId: mockOrderId,
      amount,
      currency,
      provider: "razorpay",
      planId: params.planId,
      planType: resolved.planType,
      billingCycle: resolved.billingCycle,
      keyId: keyId || "rzp_test_mock_key",
      notes: {
        userId: params.userId,
        planId: params.planId,
        planCode: resolved.planCode,
        planType: resolved.planType,
        billingCycle: resolved.billingCycle,
      },
    };
  }

  verifyPaymentSignature(input: VerifyCheckoutSignatureInput): {
    valid: boolean;
    planType: UserPlanType;
    planCode: string;
    billingCycle: "monthly" | "yearly";
    amountPaise: number;
    currentPeriodEnd: string;
  } {
    const resolved = resolvePlanFromPlanId(input.planId as CheckoutPlanId);
    const secret = this.getKeySecret() || this.getWebhookSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");

    const isMockOrder =
      input.orderId.startsWith("order_rzp_") &&
      !this.getKeySecret() &&
      input.signature === "mock_verified_signature";

    let isValid = isMockOrder;
    if (!isValid && input.signature) {
      const expectedBuf = Buffer.from(expected, "utf8");
      const actualBuf = Buffer.from(input.signature, "utf8");
      isValid =
        expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf);
    }

    const periodEnd = new Date();
    if (resolved.billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    return {
      valid: isValid,
      planType: resolved.planType === "PREMIUM" ? "PRO" : resolved.planType,
      planCode: resolved.planCode,
      billingCycle: resolved.billingCycle,
      amountPaise: resolved.amountPaise,
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<PaymentWebhookResult> {
    const { rawBody, signature } = input;
    const secret = this.getWebhookSecret();

    if (!signature) {
      return {
        success: false,
        eventId: `unknown_${Date.now()}`,
        provider: "razorpay",
        error: "Missing signature header (x-razorpay-signature)",
      };
    }

    // Compute expected HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");

    const isValid =
      expectedBuffer.length === actualBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    if (!isValid) {
      return {
        success: false,
        eventId: `unverified_${Date.now()}`,
        provider: "razorpay",
        error: "Invalid webhook signature",
      };
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        success: false,
        eventId: `bad_json_${Date.now()}`,
        provider: "razorpay",
        error: "Invalid JSON payload in webhook body",
      };
    }

    const eventId = (payload.id as string) || (payload.event_id as string) || `rzp_evt_${Date.now()}`;
    const eventType = (payload.event as string) || "payment.captured";
    const paymentEntity = (payload.payload as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    const paymentEntityInner = (paymentEntity?.entity as Record<string, unknown>) || {};
    const notes = (paymentEntityInner.notes as Record<string, string>) || {};

    const userId = notes.userId || (payload.userId as string) || "default-user";
    const planId = notes.planId || "premium_monthly";
    const resolved = resolvePlanFromPlanId(planId);

    const periodEndDate = new Date();
    if (resolved.billingCycle === "yearly") {
      periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
    } else {
      periodEndDate.setDate(periodEndDate.getDate() + 30);
    }

    return {
      success: true,
      eventId,
      provider: "razorpay",
      userId,
      planType: resolved.planType,
      planCode: resolved.planCode,
      billingCycle: resolved.billingCycle,
      amountPaid: (paymentEntityInner.amount as number) || resolved.amountPaise,
      currency: (paymentEntityInner.currency as string) || "INR",
      providerOrderId: (paymentEntityInner.order_id as string) || undefined,
      providerSubscriptionId: (paymentEntityInner.id as string) || `rzp_pay_${Date.now()}`,
      status: "active",
      currentPeriodEnd: periodEndDate.toISOString(),
      eventType,
    };
  }
}
