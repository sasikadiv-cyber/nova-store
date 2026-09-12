/**
 * Retries a database operation a few times when it fails with a transient
 * connection error (connection dropped, timeout, pool warm-up).
 *
 * This keeps a momentary database hiccup from surfacing as a "Server
 * Components render error" and blanking an entire page.
 */

const TRANSIENT_PATTERNS = [
  "connection terminated unexpectedly",
  "connection refused",
  "connection reset",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "timeout",
  "terminating connection due to",
  "canceling statement due to statement timeout",
  "could not connect to server",
  "socket hang up",
];

function isTransient(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return false;
  return TRANSIENT_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  const { retries = 3, delayMs = 120 } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === retries) {
        throw error;
      }
      // Exponential-ish backoff so the next attempt waits a bit longer.
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
