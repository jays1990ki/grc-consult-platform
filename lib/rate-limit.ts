/**
 * In-memory rate limiter — OWASP A04
 * No Redis required; suitable for single-instance MVP.
 *
 * Usage:
 *   const limiter = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
 *   const result  = limiter.check(ip);
 *   if (!result.allowed) return NextResponse.json({…}, { status: 429 });
 */

interface Entry {
  count:   number;
  resetAt: number; // epoch ms
}

interface CheckResult {
  allowed:     boolean;
  remaining:   number;
  retryAfter?: number; // seconds until reset
}

export interface RateLimiter {
  check(key: string): CheckResult;
  reset(key: string): void;
}

export function createRateLimiter(options: {
  max:      number;  // max requests per window
  windowMs: number;  // window in milliseconds
}): RateLimiter {
  const { max, windowMs } = options;
  const store = new Map<string, Entry>();

  // Periodic cleanup to prevent unbounded memory growth (~hourly)
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      Array.from(store.entries()).forEach(([key, entry]) => {
        if (now > entry.resetAt) store.delete(key);
      });
    }, Math.max(windowMs, 60_000));
  }

  return {
    check(key: string): CheckResult {
      const now  = Date.now();
      let entry  = store.get(key);

      if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs };
        store.set(key, entry);
        return { allowed: true, remaining: max - 1 };
      }

      if (entry.count >= max) {
        return {
          allowed:    false,
          remaining:  0,
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        };
      }

      entry.count++;
      return { allowed: true, remaining: max - entry.count };
    },

    reset(key: string) {
      store.delete(key);
    },
  };
}

// ── Pre-configured limiters ───────────────────────────────────────────────────

/** Login: 5 attempts per IP per 15 minutes */
export const loginLimiter = createRateLimiter({
  max:      5,
  windowMs: 15 * 60 * 1000,
});

/** File upload: 20 uploads per user per hour */
export const uploadLimiter = createRateLimiter({
  max:      20,
  windowMs: 60 * 60 * 1000,
});

/** MFA code verification: 5 attempts per IP per 15 minutes */
export const mfaLimiter = createRateLimiter({
  max:      5,
  windowMs: 15 * 60 * 1000,
});
