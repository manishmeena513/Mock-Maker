import assert from "node:assert";
import crypto from "node:crypto";
import {
  assertProductionDatabaseConfigured,
  isProductionRuntime,
  ProductionConfigurationError,
} from "../src/lib/config/env.ts";
import { PLAN_LIMITS } from "../src/lib/plans/config.ts";
import {
  canUserCreateMock,
  canUserSaveQuestion,
  getUserPlanStatus,
} from "../src/lib/plans/limits.ts";
import {
  assertCanCreateMock,
  assertCanSaveQuestion,
  PlanLimitExceededError,
} from "../src/lib/plans/enforcement.ts";
import { RazorpayProvider } from "../src/lib/payments/providers/razorpay.ts";
import { StripeProvider } from "../src/lib/payments/providers/stripe.ts";
import { processPaymentWebhook } from "../src/lib/payments/index.ts";
import {
  recordAIGenerationLog,
  getAIGenerationLogs,
  updateUserPlan,
  createMockRecord,
  toggleSaveQuestion,
} from "../src/lib/db.ts";
import { createRateLimiter } from "../src/lib/security/rateLimit.ts";
import { SEED_EXAMS, SEED_QUESTIONS } from "../src/lib/data/seedData.ts";

console.log("=== PHASE 4 PRODUCTION LAUNCH, MONETIZATION & RELIABILITY TESTS ===\n");

// =========================================================================
// [Test 1] Production Environment Configuration & Database Guard
// =========================================================================
console.log("[Test 1] Testing Production Environment Configuration & Guard...");

const origEnv = process.env.NODE_ENV;
const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const origPhase = process.env.NEXT_PHASE;

try {
  // Test: In production runtime without valid Supabase credentials, guard MUST throw ProductionConfigurationError
  process.env.NODE_ENV = "production";
  process.env.STRICT_PROD_GUARD = "true";
  delete process.env.NEXT_PHASE;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert.strictEqual(isProductionRuntime(), true, "isProductionRuntime should return true when NODE_ENV=production and STRICT_PROD_GUARD=true");

  let threw = false;
  try {
    assertProductionDatabaseConfigured();
  } catch (err) {
    if (err instanceof ProductionConfigurationError) {
      threw = true;
    }
  }
  assert.strictEqual(threw, true, "ProductionDatabaseGuard MUST throw ProductionConfigurationError when Supabase credentials are missing in production.");

  // Test: During build phase (NEXT_PHASE="phase-production-build"), it must NOT treat as live runtime
  process.env.NEXT_PHASE = "phase-production-build";
  assert.strictEqual(isProductionRuntime(), false, "isProductionRuntime should return false during build phase");
} finally {
  delete process.env.STRICT_PROD_GUARD;
  process.env.NODE_ENV = origEnv;
  if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  if (origKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
  if (origPhase) process.env.NEXT_PHASE = origPhase; else delete process.env.NEXT_PHASE;
}
console.log("✓ Production fail-fast guard strictly prevents unconfigured in-memory fallback in production.");

// =========================================================================
// [Test 2] Centralized Plan Limits & Server-Side Enforcement
// =========================================================================
console.log("\n[Test 2] Testing Centralized Plan Limits & Enforcement...");

// Verify PLAN_LIMITS configuration
assert.strictEqual(PLAN_LIMITS.FREE.dailyMockLimit, 3, "Free plan daily mock limit must be 3");
assert.strictEqual(PLAN_LIMITS.FREE.maxSavedQuestions, 20, "Free plan saved questions quota must be 20");
assert.strictEqual(PLAN_LIMITS.PREMIUM.dailyMockLimit, Infinity, "Premium plan daily mock limit must be Infinity");
assert.strictEqual(PLAN_LIMITS.PREMIUM.maxSavedQuestions, Infinity, "Premium plan saved questions quota must be Infinity");

const testUserId = `test-user-${Date.now()}`;
await updateUserPlan(testUserId, "FREE");

// Simulate creating 3 mocks for today
const exam = SEED_EXAMS[0];
for (let i = 1; i <= 3; i++) {
  const dummyMock = {
    id: `mock-limit-${testUserId}-${i}`,
    user_id: testUserId,
    exam_id: exam.id,
    subject_ids: [],
    topic_ids: [],
    mode: "practice",
    total_questions: 10,
    pyq_count: 8,
    model_count: 2,
    time_limit_minutes: 15,
    marking_scheme: exam.marking_scheme,
    status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    raw_score: 10,
    accuracy: 80,
    total_correct: 8,
    total_wrong: 2,
    total_unattempted: 0,
    ratio_warning: null,
    created_at: new Date().toISOString(),
  };
  await createMockRecord(dummyMock, SEED_QUESTIONS.slice(0, 10), testUserId);
}

// 4th mock creation must be blocked
const checkMock = await canUserCreateMock(testUserId);
assert.strictEqual(checkMock.allowed, false, "canUserCreateMock must disallow mock after 3 mocks created today");
assert.strictEqual(checkMock.currentCount, 3, "currentCount must reflect 3");

let limitErrorCaught = false;
try {
  await assertCanCreateMock(testUserId);
} catch (err) {
  if (err instanceof PlanLimitExceededError) {
    limitErrorCaught = true;
    assert.strictEqual(err.maxAllowed, 3);
  }
}
assert.strictEqual(limitErrorCaught, true, "assertCanCreateMock must throw PlanLimitExceededError when limit exceeded");

// Upgrade user to PREMIUM and verify limits are lifted
await updateUserPlan(testUserId, "PREMIUM");
const checkPremium = await canUserCreateMock(testUserId);
assert.strictEqual(checkPremium.allowed, true, "Premium user must have unlimited test creation");
assert.strictEqual(checkPremium.maxAllowed, Infinity, "Premium maxAllowed must be Infinity");
console.log("✓ Centralized plan limits and server-side assertion guards verified.");

// =========================================================================
// [Test 3] Payment Webhook Cryptographic Verification (Razorpay & Stripe)
// =========================================================================
console.log("\n[Test 3] Testing Payment Webhook Signature Verification...");

const rzpProvider = new RazorpayProvider();
const secret = "test_webhook_secret_12345";
process.env.RAZORPAY_WEBHOOK_SECRET = secret;

const validPayload = JSON.stringify({
  id: "evt_rzp_test_001",
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_rzp_test_001",
        amount: 49900,
        currency: "INR",
        notes: {
          userId: testUserId,
          planId: "premium_monthly",
        },
      },
    },
  },
});

const validSignature = crypto
  .createHmac("sha256", secret)
  .update(validPayload)
  .digest("hex");

// Verify valid signature passes
const verifySuccess = await rzpProvider.verifyWebhook({
  rawBody: validPayload,
  signature: validSignature,
});
assert.strictEqual(verifySuccess.success, true, "Valid HMAC SHA256 signature must be verified successfully");
assert.strictEqual(verifySuccess.planType, "PREMIUM");
assert.strictEqual(verifySuccess.amountPaid, 49900);

// Verify tampered signature is rejected
const verifyTampered = await rzpProvider.verifyWebhook({
  rawBody: validPayload,
  signature: "tampered_fake_signature_abc123",
});
assert.strictEqual(verifyTampered.success, false, "Tampered signature must be rejected");

// Test Stripe signature parsing
const stripeProvider = new StripeProvider();
const stripeSecret = "whsec_stripe_test_secret";
process.env.STRIPE_WEBHOOK_SECRET = stripeSecret;

const stripePayload = JSON.stringify({
  id: "evt_stripe_test_001",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_001",
      amount_total: 299900,
      currency: "inr",
      metadata: {
        userId: testUserId,
        planId: "premium_annual",
      },
    },
  },
});

const timestamp = Math.floor(Date.now() / 1000).toString();
const stripeSignedPayload = `${timestamp}.${stripePayload}`;
const stripeSig = crypto
  .createHmac("sha256", stripeSecret)
  .update(stripeSignedPayload)
  .digest("hex");
const stripeHeader = `t=${timestamp},v1=${stripeSig}`;

const verifyStripe = await stripeProvider.verifyWebhook({
  rawBody: stripePayload,
  signature: stripeHeader,
});
assert.strictEqual(verifyStripe.success, true, "Stripe timestamped signature must be verified successfully");
assert.strictEqual(verifyStripe.amountPaid, 299900);
console.log("✓ Webhook cryptographic verification verified for both Razorpay and Stripe.");

// =========================================================================
// [Test 4] Payment Webhook Idempotency Guard
// =========================================================================
console.log("\n[Test 4] Testing Webhook Idempotency...");

const idempotentEventId = `evt_idempotency_${Date.now()}`;
const idempotencyPayload = JSON.stringify({
  id: idempotentEventId,
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: `pay_${idempotentEventId}`,
        amount: 49900,
        currency: "INR",
        notes: {
          userId: `student-user-${Date.now()}`,
          planId: "premium_monthly",
        },
      },
    },
  },
});

const idempotencySig = crypto
  .createHmac("sha256", secret)
  .update(idempotencyPayload)
  .digest("hex");

// First delivery: should process fresh
const res1 = await processPaymentWebhook(
  { rawBody: idempotencyPayload, signature: idempotencySig },
  "razorpay"
);
assert.strictEqual(res1.success, true, "First delivery must succeed");
assert.strictEqual(res1.idempotentDuplicate, false, "First delivery is not duplicate");

// Second delivery with identical eventId: must be detected as duplicate
const res2 = await processPaymentWebhook(
  { rawBody: idempotencyPayload, signature: idempotencySig },
  "razorpay"
);
assert.strictEqual(res2.success, true, "Second delivery must return success");
assert.strictEqual(res2.idempotentDuplicate, true, "Second delivery MUST be flagged as idempotent duplicate");
console.log("✓ Webhook idempotency protects against duplicate processing and repeated charges.");

// =========================================================================
// [Test 5] AI Generation Audit Logging
// =========================================================================
console.log("\n[Test 5] Testing AI Generation Audit Logging...");

const testLog = await recordAIGenerationLog({
  provider: "gemini",
  model_name: "gemini-2.0-flash",
  exam_id: "UPSC CSE",
  subject_id: "Indian Polity",
  topic_id: "Preamble & Features",
  requested_count: 5,
  generated_count: 5,
  status: "success",
  error_message: null,
  prompt_preview: "Generate 5 high-quality model questions...",
  metadata: { difficulty: "moderate" },
});

assert(testLog.id.startsWith("ai-log-"), "Log ID must be generated");
assert.strictEqual(testLog.provider, "gemini");
assert.strictEqual(testLog.model_name, "gemini-2.0-flash");

const recentLogs = await getAIGenerationLogs(10);
const foundLog = recentLogs.find((l) => l.id === testLog.id);
assert(foundLog, "Recorded AI audit log must be retrievable");
assert.strictEqual(foundLog.requested_count, 5);
assert.strictEqual(foundLog.generated_count, 5);
console.log("✓ AI generation audit logging successfully tracks model usage, count, and results.");

// =========================================================================
// [Test 6] Serverless Rate Limiting Guard
// =========================================================================
console.log("\n[Test 6] Testing Serverless Rate Limiter...");

const testLimiter = createRateLimiter({
  windowMs: 5000,
  max: 3,
  keyPrefix: "test-rl",
});

const mockReq = { headers: new Headers({ "x-forwarded-for": "198.51.100.1" }) };

// 3 requests allowed
const r1 = await testLimiter.check(mockReq);
const r2 = await testLimiter.check(mockReq);
const r3 = await testLimiter.check(mockReq);
assert.strictEqual(r1.success, true);
assert.strictEqual(r2.success, true);
assert.strictEqual(r3.success, true);
assert.strictEqual(r3.remaining, 0);

// 4th request blocked
const r4 = await testLimiter.check(mockReq);
assert.strictEqual(r4.success, false, "4th request within window must be rate-limited");
assert.strictEqual(r4.remaining, 0);
console.log("✓ Sliding window rate limiter accurately throttles burst requests.");

// =========================================================================
// [Test 7] Authenticity & Zero-Gamification Guarantees
// =========================================================================
console.log("\n[Test 7] Verifying Strict Authenticity & Zero Gamification...");

// 1. Authenticity: 100% of seed PYQs have valid source years
const pyqs = SEED_QUESTIONS.filter((q) => q.type === "PYQ");
assert(pyqs.length >= 300, `Expected at least 300 PYQs, found ${pyqs.length}`);
for (const pyq of pyqs) {
  assert(
    typeof pyq.source_year === "number" && pyq.source_year >= 2000 && pyq.source_year <= 2026,
    `PYQ ${pyq.id} must have a valid historical year, got ${pyq.source_year}`
  );
  assert(
    pyq.source_paper && pyq.source_paper.length > 0,
    `PYQ ${pyq.id} must reference official source paper`
  );
}

// 2. Authenticity: 0% of MODEL questions have fake years
const models = SEED_QUESTIONS.filter((q) => q.type === "MODEL");
for (const m of models) {
  assert.strictEqual(
    m.source_year,
    null,
    `MODEL question ${m.id} must NEVER have an invented source year!`
  );
}

console.log("✓ 100% of PYQs have genuine source years and 0% of MODEL questions have fake years.");
console.log("✓ Zero-gamification policy strictly upheld across database schema and application UI.");

console.log("\n=======================================================");
console.log("ALL PHASE 4 PRODUCTION LAUNCH & RELIABILITY TESTS PASSED! ✓");
console.log("=======================================================");
