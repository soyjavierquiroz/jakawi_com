import { createHash } from "node:crypto";
import { apiRateLimitMessage, userFacingRateLimitMessage } from "@/config/rate-limits";

export type RateLimitPolicy = {
  id: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
let lastCleanupAtMs = Date.now();

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function normalizeKeyPart(value: string | null | undefined) {
  const cleanValue = value?.trim().toLowerCase();
  return cleanValue?.length ? cleanValue : null;
}

function cleanupExpiredBuckets(nowMs: number) {
  if (nowMs - lastCleanupAtMs < 60_000 && buckets.size < 1000) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAtMs <= nowMs) buckets.delete(key);
  }
  lastCleanupAtMs = nowMs;
}

export function getClientIpFromHeaders(headers: Pick<Headers, "get">): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("cf-connecting-ip")?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
}

export function createRateLimitKey(policy: RateLimitPolicy, keyParts: Array<string | null | undefined>) {
  const normalizedParts = keyParts.map(normalizeKeyPart).filter((value): value is string => Boolean(value));
  const material = normalizedParts.length ? normalizedParts.join("|") : "fallback";
  return `rl:${policy.id}:${sha256(material)}`;
}

function allowedResult(policy: RateLimitPolicy, remaining = policy.limit) {
  return {
    allowed: true,
    remaining,
    limit: policy.limit,
    resetAt: new Date(Date.now() + policy.windowSeconds * 1000),
    retryAfterSeconds: 0,
  };
}

export async function checkRateLimit(options: {
  policy: RateLimitPolicy;
  keyParts: Array<string | null | undefined>;
}): Promise<RateLimitResult> {
  try {
    const nowMs = Date.now();
    cleanupExpiredBuckets(nowMs);

    const key = createRateLimitKey(options.policy, options.keyParts);
    const existing = buckets.get(key);
    const resetAtMs = existing && existing.resetAtMs > nowMs ? existing.resetAtMs : nowMs + options.policy.windowSeconds * 1000;
    const count = existing && existing.resetAtMs > nowMs ? existing.count + 1 : 1;
    const bucket = { count, resetAtMs };
    buckets.set(key, bucket);

    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
    return {
      allowed: count <= options.policy.limit,
      remaining: Math.max(0, options.policy.limit - count),
      limit: options.policy.limit,
      resetAt: new Date(resetAtMs),
      retryAfterSeconds: count <= options.policy.limit ? 0 : retryAfterSeconds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn("Rate limiter failed open", message);
    return allowedResult(options.policy);
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(Math.max(1, result.retryAfterSeconds)),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      ok: false,
      error: "RATE_LIMITED",
      message: apiRateLimitMessage,
    },
    {
      status: 429,
      headers: rateLimitHeaders(result),
    },
  );
}

export async function assertRateLimitOrThrow(options: {
  policy: RateLimitPolicy;
  keyParts: Array<string | null | undefined>;
}) {
  const result = await checkRateLimit(options);
  if (!result.allowed) throw new Error(userFacingRateLimitMessage);
  return result;
}
