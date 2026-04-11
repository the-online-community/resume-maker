/**
 * Simple in-memory sliding-window rate limiter.
 * Tracks timestamps of recent requests per user and rejects
 * if the user exceeds `maxRequests` within `windowMs`.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Check if a user has exceeded the rate limit.
 * Returns { limited: false } if OK, or { limited: true, retryAfter } if blocked.
 */
export function checkRateLimit(
  userId: string,
  { maxRequests = 5, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {},
): { limited: false } | { limited: true; retryAfter: number } {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;
  const key = userId;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { limited: true, retryAfter };
  }

  entry.timestamps.push(now);
  return { limited: false };
}

/**
 * Returns a 429 Response if the user is rate-limited, or null if OK.
 * Usage: const blocked = rateLimitResponse(userId); if (blocked) return blocked;
 */
export function rateLimitResponse(
  userId: string,
  opts?: { maxRequests?: number; windowMs?: number },
): Response | null {
  const result = checkRateLimit(userId, opts);
  if (!result.limited) return null;

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
      },
    },
  );
}
