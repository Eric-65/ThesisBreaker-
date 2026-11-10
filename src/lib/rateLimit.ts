import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { theses } from "@/db/schema";

// Fixed-window, in-memory limiter for short bursts. Per-instance only, so the
// hourly per-visitor cap below (backed by Postgres) is the one that holds
// across serverless instances.
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

/** Saved analyses by this user in the trailing window (durable, cross-instance). */
export async function recentAnalysesCount(userId: string, windowMs: number): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(theses)
    .where(and(eq(theses.userId, userId), gte(theses.createdAt, new Date(Date.now() - windowMs))));
  return row?.n ?? 0;
}
