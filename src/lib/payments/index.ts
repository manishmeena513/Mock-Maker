import { PaymentProvider, UserPlanType } from "@/types/database";
import { RazorpayProvider, resolvePlanFromPlanId } from "./providers/razorpay";
import { StripeProvider } from "./providers/stripe";
import {
  CreateOrderParams,
  PaymentOrder,
  PaymentProviderAdapter,
  PaymentWebhookResult,
  VerifyCheckoutSignatureInput,
  WebhookVerificationInput,
} from "./types";
import {
  hasWebhookEventBeenProcessed,
  recordWebhookEvent,
  createOrUpdateSubscription,
  updateUserPlan,
  recordPaymentTransaction,
  updatePaymentTransactionStatus,
} from "@/lib/db";

export * from "./types";

const razorpayAdapter = new RazorpayProvider();
const stripeAdapter = new StripeProvider();

export function getPaymentProvider(preferred?: PaymentProvider): PaymentProviderAdapter {
  const provider = preferred || (process.env.PAYMENT_PROVIDER as PaymentProvider) || "razorpay";
  if (provider === "stripe") {
    return stripeAdapter;
  }
  return razorpayAdapter;
}

export async function createPaymentOrder(
  params: CreateOrderParams,
  preferredProvider?: PaymentProvider
): Promise<PaymentOrder> {
  const adapter = getPaymentProvider(preferredProvider);
  const order = await adapter.createOrder(params);
  const resolved = resolvePlanFromPlanId(params.planId);

  await recordPaymentTransaction({
    user_id: params.userId,
    plan: resolved.planType === "PREMIUM" ? "PRO" : resolved.planType,
    plan_code: resolved.planCode,
    billing_cycle: resolved.billingCycle,
    amount_paise: order.amount,
    currency: order.currency,
    provider: order.provider,
    provider_order_id: order.orderId,
    provider_payment_id: null,
    provider_signature: null,
    status: "created",
    metadata: {
      planId: params.planId,
      userEmail: params.userEmail || "",
    },
  });

  return order;
}

export async function verifyAndActivatePayment(
  input: VerifyCheckoutSignatureInput
): Promise<{
  verified: boolean;
  planType: UserPlanType;
  planCode: string;
  validUntil: string;
  error?: string;
}> {
  const verification = razorpayAdapter.verifyPaymentSignature(input);
  if (!verification.valid) {
    await updatePaymentTransactionStatus(input.orderId, {
      provider_payment_id: input.paymentId,
      provider_signature: input.signature,
      status: "failed",
    });
    return {
      verified: false,
      planType: "FREE",
      planCode: verification.planCode,
      validUntil: "",
      error: "Invalid payment signature verification",
    };
  }

  await updatePaymentTransactionStatus(input.orderId, {
    provider_payment_id: input.paymentId,
    provider_signature: input.signature,
    status: "captured",
  });

  await createOrUpdateSubscription({
    user_id: input.userId,
    plan: verification.planType,
    plan_type: verification.planType,
    status: "active",
    provider: "razorpay",
    provider_subscription_id: input.paymentId,
    provider_customer_id: input.orderId,
    current_period_start: new Date().toISOString(),
    current_period_end: verification.currentPeriodEnd,
    cancel_at_period_end: false,
  });

  await updateUserPlan(input.userId, verification.planType, verification.currentPeriodEnd);

  return {
    verified: true,
    planType: verification.planType,
    planCode: verification.planCode,
    validUntil: verification.currentPeriodEnd,
  };
}

export async function processPaymentWebhook(
  input: WebhookVerificationInput,
  preferredProvider?: PaymentProvider
): Promise<PaymentWebhookResult & { idempotentDuplicate?: boolean }> {
  const adapter = getPaymentProvider(preferredProvider);
  const result = await adapter.verifyWebhook(input);

  if (!result.success) {
    return result;
  }

  // Idempotency check: has this event already been processed?
  const alreadyProcessed = await hasWebhookEventBeenProcessed(result.eventId);
  if (alreadyProcessed) {
    return {
      ...result,
      idempotentDuplicate: true,
    };
  }

  // Activate or update subscription
  if (result.userId && result.planType) {
    if (result.providerOrderId) {
      await updatePaymentTransactionStatus(result.providerOrderId, {
        provider_payment_id: result.providerSubscriptionId || null,
        status: "captured",
      });
    } else {
      await recordPaymentTransaction({
        user_id: result.userId,
        plan: result.planType,
        plan_code: result.planCode || "PRO_MONTHLY",
        billing_cycle: result.billingCycle || "monthly",
        amount_paise: result.amountPaid || 5900,
        currency: result.currency || "INR",
        provider: result.provider,
        provider_order_id: result.providerSubscriptionId || `ord_${result.eventId}`,
        provider_payment_id: result.providerSubscriptionId || null,
        provider_signature: null,
        status: "captured",
        metadata: { eventId: result.eventId },
      });
    }

    await createOrUpdateSubscription({
      user_id: result.userId,
      plan: result.planType,
      plan_type: result.planType,
      status: result.status || "active",
      provider: result.provider,
      provider_subscription_id: result.providerSubscriptionId || null,
      provider_customer_id: result.providerCustomerId || null,
      current_period_start: new Date().toISOString(),
      current_period_end: result.currentPeriodEnd || null,
      cancel_at_period_end: false,
    });

    await updateUserPlan(result.userId, result.planType, result.currentPeriodEnd);
  }

  // Record webhook event so subsequent retries are safely ignored
  await recordWebhookEvent({
    event_id: result.eventId,
    provider: result.provider,
    event_type: result.eventType || "payment.received",
    payload: { verified: true, plan: result.planType },
  });

  return {
    ...result,
    idempotentDuplicate: false,
  };
}
