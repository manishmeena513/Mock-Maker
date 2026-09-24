import { PaymentProvider, SubscriptionStatus, UserPlanType } from "@/types/database";

export interface CreateOrderParams {
  planId: "premium_monthly" | "premium_annual";
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
  keyId?: string; // Client-side public key for checkout widget
  notes?: Record<string, string>;
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
  amountPaid?: number;
  currency?: string;
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
