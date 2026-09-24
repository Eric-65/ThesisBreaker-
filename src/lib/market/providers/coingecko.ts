import { cachedFetch } from "../cache";
import { safeFetch, safeJson } from "../http";
import { classifyFreshness, type HistoricalSeries, type MarketQuote } from "../types";

/**
 * CoinGecko fallback provider. Uses public REST endpoints. If the free API
 * plan is rate-limited we simply return null and the router moves on.
 */
const BASE = "https://api.coingecko.com/api/v3";

function headers(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  const h: Record<string, string> = { accept: "application/json" };
  if (key) h["x-cg-demo-api-key"] = key;
  return h;
}

interface RawCoin {
  id: string;
  symbol: string;
  name: string;
  market_data?: {
    current_price?: { usd?: number };
    high_24h?: { usd?: number };
    low_24h?: { usd?: number };
    price_change_24h?: number;
    price_change_percentage_24h?: number;
    total_volume?: { usd?: number };
    market_cap?: { usd?: number };
  };
  last_updated?: string;
  image?: { thumb?: string };
}

export async function coingeckoQuote(id: string, displaySymbol?: string): Promise<MarketQuote | null> {
  return cachedFetch<MarketQuote | null>(`cg:quote:${id}`, 30_000, async () => {
    const res = await safeFetch(
      `${BASE}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
      { headers: headers(), timeoutMs: 5500 },
    );
    const raw = await safeJson<RawCoin>(res);
    if (!raw?.market_data?.current_price?.usd) return null;
    const md = raw.market_data;
    const ts = raw.last_updated ?? new Date().toISOString();
    return {
      symbol: (displaySymbol ?? raw.symbol).toUpperCase(),
      name: raw.name,
      assetType: "CRYPTO",
      price: md.current_price?.usd ?? null,
      bid: null,
      ask: null,
      change24h: md.price_change_24h ?? null,
      changePercent24h: md.price_change_percentage_24h ?? null,
      volume24h: md.total_volume?.usd ?? null,
      marketCap: md.market_cap?.usd ?? null,
      high24h: md.high_24h?.usd ?? null,
      low24h: md.low_24h?.usd ?? null,
      previousClose: null,
      currency: "USD",
      timestamp: ts,
      source: "COINGECKO",
      feed: "CoinGecko",
      status: classifyFreshness(ts, "CRYPTO", "LIVE"),
    };
  });
}

interface RawChart {
  prices?: [number, number][]; // [ts, price]
  total_volumes?: [number, number][];
}

export async function coingeckoHistory(id: string, days = 30): Promise<HistoricalSeries | null> {
  return cachedFetch<HistoricalSeries | null>(`cg:hist:${id}:${days}`, 5 * 60_000, async () => {
    const res = await safeFetch(
      `${BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
      { headers: headers(), timeoutMs: 6000 },
    );
    const raw = await safeJson<RawChart>(res);
    if (!raw?.prices || raw.prices.length === 0) return null;
    return {
      symbol: id.toUpperCase(),
      timeframe: `${days}D`,
      bars: raw.prices.map(([t, p]) => ({
        t: new Date(t).toISOString(),
        o: p,
        h: p,
        l: p,
        c: p,
        v: 0,
      })),
      source: "COINGECKO",
      status: "LIVE",
      fetchedAt: new Date().toISOString(),
    };
  });
}

interface RawSearch {
  coins?: { id: string; symbol: string; name: string }[];
}

export async function coingeckoSearch(q: string): Promise<{ id: string; symbol: string; name: string }[]> {
  return cachedFetch(`cg:search:${q}`, 10 * 60_000, async () => {
    const res = await safeFetch(`${BASE}/search?query=${encodeURIComponent(q)}`, {
      headers: headers(),
      timeoutMs: 5000,
    });
    const raw = await safeJson<RawSearch>(res);
    return (raw?.coins ?? []).slice(0, 8);
  });
}
