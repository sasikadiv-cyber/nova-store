import { NextResponse } from "next/server";

/**
 * Shared request guards for the route handlers.
 *
 * `assertSameOrigin` blocks cross-site form posts (CSRF), and `rateLimit`
 * throttles the endpoints that must not be hammered — sign-in, password
 * reset, contact and reviews. The counters live in module scope, so they are
 * per serverless instance: not a global budget, but enough to make brute
 * force and spam impractical while costing no infrastructure.
 */

/* --------------------------------------------------------------- same origin */

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit it (server-side, curl)

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------- rate limit */

type Bucket = { count: number; resetAt: number };

const globalForLimit = globalThis as typeof globalThis & {
  __novaRateBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForLimit.__novaRateBuckets ?? (globalForLimit.__novaRateBuckets = new Map());

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/** Sliding-window-ish counter keyed by the caller's choice (usually IP + route). */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: windowSeconds };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: windowSeconds };
}

/** Best-effort client identity for throttling. */
export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

/** The standard throttled response. */
export function tooManyRequests(result: RateLimitResult) {
  return NextResponse.json(
    { ok: false, error: "Too many attempts. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/** Combines the two guards: returns a response to send, or null when allowed. */
export function guard(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
): NextResponse | null {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
  }
  const result = rateLimit(clientKey(request, scope), limit, windowSeconds);
  if (!result.ok) return tooManyRequests(result);
  return null;
}

/* ----------------------------------------------------- safe inline JSON-LD */

/**
 * Serialises structured data for a <script> tag. Escaping "<" stops a product
 * field that contains "</script>" from breaking out into markup.
 */
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");
}
