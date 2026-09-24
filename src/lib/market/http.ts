/** Fetch with a hard timeout that returns null instead of throwing. */
export async function safeFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 5000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function safeJson<T>(res: Response | null): Promise<T | null> {
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
