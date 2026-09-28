import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  records: Map<string, RateLimitRecord>;
}

const g = globalThis as unknown as { __rate_limit_store?: RateLimitStore };
if (!g.__rate_limit_store) {
  g.__rate_limit_store = {
    records: new Map(),
  };
}

const store = g.__rate_limit_store;

export interface RateLimitOptions {
  windowMs: number; // e.g., 60 * 1000 for 1 minute
  max: number;      // max requests per window
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function getClientIp(req: Request | NextRequest): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }
  return "127.0.0.1";
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = "rl" } = options;

  return {
    async check(req: Request | NextRequest, customId?: string): Promise<RateLimitResult> {
      const identifier = customId || getClientIp(req);
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();

      // Clean up expired entries periodically
      if (store.records.size > 5000) {
        for (const [k, v] of store.records.entries()) {
          if (now > v.resetTime) {
            store.records.delete(k);
          }
        }
      }

      const record = store.records.get(key);

      if (!record || now > record.resetTime) {
        // New window
        const resetTime = now + windowMs;
        store.records.set(key, { count: 1, resetTime });
        return {
          success: true,
          limit: max,
          remaining: max - 1,
          reset: resetTime,
        };
      }

      if (record.count >= max) {
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset: record.resetTime,
        };
      }

      record.count += 1;
      return {
        success: true,
        limit: max,
        remaining: max - record.count,
        reset: record.resetTime,
      };
    },
  };
}

// Pre-configured standard limiters
export const aiGenerationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 generations per minute per client
  keyPrefix: "ai-gen",
});

export const importLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15,             // 15 imports per minute
  keyPrefix: "import",
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 payment attempts per minute
  keyPrefix: "pay",
});

export const aiChatLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 12,             // 12 chat requests per minute per user/IP
  keyPrefix: "ai-chat",
});

export const githubImportLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 8,              // 8 GitHub import operations per minute per admin
  keyPrefix: "gh-import",
});

export function resetRateLimitStore(): void {
  store.records.clear();
}
