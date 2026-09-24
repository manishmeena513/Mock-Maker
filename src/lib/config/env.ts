/**
 * Production Environment Configuration & Validation Guard
 * Ensures strict security, prevents placeholder credentials in production,
 * and guarantees in-memory fallback is disabled in live deployments.
 */

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isProductionRuntime(): boolean {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return false;
  }
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  // When running locally on localhost without explicit production flags
  if (
    !process.env.VERCEL &&
    !process.env.CI &&
    (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) &&
    process.env.STRICT_PROD_GUARD !== "true"
  ) {
    return false;
  }
  return true;
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && !url.includes("localhost")) {
    return url.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://mockmaster.vercel.app";
}

export function validateProductionEnvironment(): EnvValidationResult {
  const errors: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Supabase Validation
  if (!supabaseUrl || supabaseUrl === "https://mockmaster.supabase.co" || supabaseUrl.includes("placeholder")) {
    errors.push("Missing or placeholder NEXT_PUBLIC_SUPABASE_URL in production.");
  }

  if (!supabaseKey || supabaseKey.includes("placeholder") || supabaseKey.includes("mock-")) {
    errors.push("Missing or placeholder NEXT_PUBLIC_SUPABASE_ANON_KEY in production.");
  }

  // App URL Validation
  if (isProductionRuntime() && (!appUrl || appUrl.includes("localhost"))) {
    errors.push("NEXT_PUBLIC_APP_URL must be configured to a valid public URL in production.");
  }

  // Gemini API Key Validation
  if (geminiKey && (geminiKey.includes("mock-") || geminiKey.includes("placeholder"))) {
    errors.push("GEMINI_API_KEY cannot be a mock or placeholder in production.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export class ProductionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionConfigurationError";
  }
}

export function assertProductionDatabaseConfigured(): void {
  if (isProductionRuntime()) {
    const { isValid, errors } = validateProductionEnvironment();
    if (!isValid) {
      throw new ProductionConfigurationError(
        `Production Database Error: In-memory fallback is strictly disabled in production mode. Failed checks: ${errors.join(" ")}`
      );
    }
  }
}
