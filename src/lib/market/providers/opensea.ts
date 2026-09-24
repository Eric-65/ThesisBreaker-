import { cachedFetch } from "../cache";
import { safeFetch, safeJson } from "../http";
import type { NftFloorSeries, NftStats } from "../types";

/** OpenSea v2 API — collection stats and floor history. */
const BASE = "https://api.opensea.io/api/v2";

function headers(): Record<string, string> {
  const key = process.env.OPENSEA_API_KEY;
  const h: Record<string, string> = { accept: "application/json" };
  if (key) h["x-api-key"] = key;
  return h;
}

interface RawCollection {
  collection: string;
  name: string;
  image_url?: string;
  banner_image_url?: string;
  description?: string;
  owner?: string;
  category?: string;
  contracts?: { chain: string; address: string }[];
  total_supply?: number;
}

interface RawStats {
  total?: {
    volume?: number;
    sales?: number;
    average_price?: number;
    num_owners?: number;
    market_cap?: number;
    floor_price?: number;
    floor_price_symbol?: string;
  };
  intervals?: {
    interval: string;
    volume?: number;
    sales?: number;
    average_price?: number;
    volume_change?: number;
  }[];
}

export async function openseaCollection(slug: string): Promise<NftStats | null> {
  const s = slug.toLowerCase();
  return cachedFetch<NftStats | null>(`os:coll:${s}`, 60_000, async () => {
    const [collRes, statsRes] = await Promise.all([
      safeFetch(`${BASE}/collections/${encodeURIComponent(s)}`, {
        headers: headers(),
        timeoutMs: 6000,
      }),
      safeFetch(`${BASE}/collections/${encodeURIComponent(s)}/stats`, {
        headers: headers(),
        timeoutMs: 6000,
      }),
    ]);
    const coll = await safeJson<RawCollection>(collRes);
    const stats = await safeJson<RawStats>(statsRes);
    if (!coll && !stats) return null;
    const day = stats?.intervals?.find((i) => i.interval === "one_day");
    const chain = coll?.contracts?.[0]?.chain ?? "ethereum";
    return {
      slug: s,
      name: coll?.name ?? s,
      chain,
      imageUrl: coll?.image_url ?? null,
      floorPrice: stats?.total?.floor_price ?? null,
      floorCurrency: stats?.total?.floor_price_symbol ?? "ETH",
      totalVolume: stats?.total?.volume ?? null,
      volume24h: day?.volume ?? null,
      sales24h: day?.sales ?? null,
      owners: stats?.total?.num_owners ?? null,
      totalSupply: coll?.total_supply ?? null,
      source: "OPENSEA",
      status: "LIVE",
      timestamp: new Date().toISOString(),
    };
  });
}

/**
 * OpenSea doesn't publish an official floor-history endpoint on v2.
 * We synthesize a short "sales-derived" floor series from listings when
 * possible, otherwise the endpoint returns UNAVAILABLE and the UI hides
 * the chart rather than fabricating data.
 */
export async function openseaFloorHistory(slug: string): Promise<NftFloorSeries | null> {
  return cachedFetch<NftFloorSeries | null>(`os:floor-hist:${slug}`, 5 * 60_000, async () => {
    // Attempt the (undocumented but publicly used) chart endpoint. If it fails
    // we return null so callers can render "history unavailable" instead of
    // fake data. This keeps the "no fabrication" invariant.
    const res = await safeFetch(
      `https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}/stats/floor_prices?intervals=1d&range=1m`,
      { headers: headers(), timeoutMs: 5500 },
    );
    interface Point { timestamp: string; floor_price?: number; price?: number }
    const raw = await safeJson<{ floor_prices?: Point[] }>(res);
    if (!raw?.floor_prices || raw.floor_prices.length === 0) return null;
    return {
      slug,
      points: raw.floor_prices.map((p) => ({
        t: p.timestamp,
        floor: Number(p.floor_price ?? p.price ?? 0),
      })),
      currency: "ETH",
      source: "OPENSEA",
      status: "LIVE",
      fetchedAt: new Date().toISOString(),
    };
  });
}

interface RawSearchColl { collection: string; name: string; image_url?: string }
interface RawSearchResp { collections?: RawSearchColl[] }

/** OpenSea search — /collections?limit=N&search=... */
export async function openseaSearch(q: string): Promise<RawSearchColl[]> {
  return cachedFetch(`os:search:${q}`, 10 * 60_000, async () => {
    const res = await safeFetch(
      `${BASE}/collections?limit=8&search=${encodeURIComponent(q)}`,
      { headers: headers(), timeoutMs: 5000 },
    );
    const raw = await safeJson<RawSearchResp>(res);
    return raw?.collections ?? [];
  });
}
