type RateLimitEntry = { count: number; resetAt: number };

const entries = new Map<string, RateLimitEntry>();

/** Lightweight protection for a single running server instance. */
export function isRateLimited(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const existing = entries.get(key);

  if (!existing || existing.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  existing.count += 1;
  return existing.count > maximum;
}
