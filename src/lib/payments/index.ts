import { PaymentProvider } from "@/types/database";
import { RazorpayProvider } from "./providers/razorpay";
import { StripeProvider } from "./providers/stripe";
import {
  CreateOrderParams,
  PaymentOrder,
  PaymentProviderAdapter,
  PaymentWebhookResult,
  WebhookVerificationInput,
} from "./types";
import {
  hasWebhookEventBeenProcessed,
  recordWebhookEvent,
  createOrUpdateSubscription,
  updateUserPlan,
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
  return adapter.createOrder(params);
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
    await createOrUpdateSubscription({
      user_id: result.userId,
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
