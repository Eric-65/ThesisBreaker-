/** Process-scoped TTL cache for provider responses. Prevents hammering
 * public endpoints from React re-renders and dedupes concurrent calls.
 * NOT a distributed cache — fine for a single-process demo. */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const g = globalThis as typeof globalThis & {
  __tbMarketCache?: Map<string, Entry<unknown>>;
  __tbInflight?: Map<string, Promise<unknown>>;
};

const store: Map<string, Entry<unknown>> = g.__tbMarketCache ?? new Map();
const inflight: Map<string, Promise<unknown>> = g.__tbInflight ?? new Map();
if (process.env.NODE_ENV !== "production") {
  g.__tbMarketCache = store;
  g.__tbInflight = inflight;
}

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Fetch through cache + inflight dedupe. */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  const existing = inflight.get(key);
  if (existing) return (await existing) as T;
  const p = (async () => {
    try {
      const v = await loader();
      cacheSet(key, v, ttlMs);
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return (await p) as T;
}
