import "server-only";

// Fixed-window, in-memory limiter. Good enough for a single-instance demo
// deployment; protects the Qwen credit budget from a runaway client.
const hits = new Map<string, { windowStart: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    hits.set(key, { windowStart: now, count: 1 });
    if (hits.size > 5_000) {
      for (const [k, v] of hits) if (now - v.windowStart >= windowMs) hits.delete(k);
    }
    return { ok: true, retryAfterS: 0 };
  }
  entry.count++;
  if (entry.count > limit) {
    return { ok: false, retryAfterS: Math.ceil((entry.windowStart + windowMs - now) / 1000) };
  }
  return { ok: true, retryAfterS: 0 };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
