interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;

    setInterval(() => this.cleanup(), windowMs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  isBlocked(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return false;
    }
    return entry.count >= this.maxAttempts;
  }

  increment(key: string): { blocked: boolean; remainingMs: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { blocked: false, remainingMs: 0 };
    }

    entry.count++;
    const remainingMs = Math.max(0, entry.resetAt - now);
    return { blocked: entry.count >= this.maxAttempts, remainingMs };
  }

  reset(key: string) {
    this.store.delete(key);
  }
}
