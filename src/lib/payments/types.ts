import { PaymentProvider, SubscriptionStatus, UserPlanType } from "@/types/database";

export type CheckoutPlanId =
  | "pro_monthly"
  | "pro_yearly"
  | "elite_monthly"
  | "elite_yearly"
  | "PRO_MONTHLY"
  | "PRO_YEARLY"
  | "ELITE_MONTHLY"
  | "ELITE_YEARLY"
  | "premium_monthly"
  | "premium_annual";

export interface CreateOrderParams {
  planId: CheckoutPlanId;
  userId: string;
  userEmail?: string;
  userName?: string;
}

export interface PaymentOrder {
  orderId: string;
  amount: number; // in smallest currency unit (paise / cents)
  currency: string;
  provider: PaymentProvider;
  planId: string;
  planType: UserPlanType;
  billingCycle: "monthly" | "yearly";
  keyId?: string; // Client-side public key for checkout widget
  notes?: Record<string, string>;
}

export interface VerifyCheckoutSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
  planId: CheckoutPlanId;
  userId: string;
}

export interface WebhookVerificationInput {
  rawBody: string;
  signature: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface PaymentWebhookResult {
  success: boolean;
  eventId: string;
  provider: PaymentProvider;
  userId?: string;
  planType?: UserPlanType;
  planCode?: string;
  billingCycle?: "monthly" | "yearly";
  amountPaid?: number;
  currency?: string;
  providerOrderId?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string;
  eventType?: string;
  error?: string;
}

export interface PaymentProviderAdapter {
  providerName: PaymentProvider;
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  verifyWebhook(input: WebhookVerificationInput): Promise<PaymentWebhookResult>;
}
