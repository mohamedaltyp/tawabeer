import { NextRequest } from 'next/server';

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  max: number;
  /** Optional custom key generator; defaults to x-forwarded-for or x-real-ip */
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Periodically clean up expired entries (every 60 seconds)
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
  // Unref so it doesn't keep the process alive
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

export function createRateLimiter(options: RateLimiterOptions): {
  check: (req: NextRequest) => RateLimitResult;
} {
  const { windowMs, max, keyGenerator } = options;
  const getKey = keyGenerator ?? defaultKeyGenerator;

  ensureCleanup();

  return {
    check(req: NextRequest): RateLimitResult {
      const key = getKey(req);
      const now = Date.now();
      const existing = store.get(key);

      // If no entry or window has expired, start fresh
      if (!existing || now > existing.resetAt) {
        const resetAt = now + windowMs;
        store.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          remaining: max - 1,
          resetAt,
        };
      }

      // Within the current window
      if (existing.count >= max) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.resetAt,
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: max - existing.count,
        resetAt: existing.resetAt,
      };
    },
  };
}
