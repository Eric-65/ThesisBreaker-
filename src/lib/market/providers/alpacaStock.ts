import { getAlpacaConfig } from "@/lib/alpaca";
import { cachedFetch } from "../cache";
import { safeFetch, safeJson } from "../http";
import { classifyFreshness, type HistoricalSeries, type MarketQuote } from "../types";

const DATA_BASE = "https://data.alpaca.markets";

interface RawSnapshot {
  latestTrade?: { p: number; t: string; x?: string };
  latestQuote?: { bp: number; ap: number; t: string };
  minuteBar?: { c: number; v: number; t: string };
  dailyBar?: { o: number; c: number; h: number; l: number; v: number; t: string };
  prevDailyBar?: { o: number; c: number; h: number; l: number; v: number };
}

async function fetchSnapshotRaw(symbol: string, feed: string): Promise<RawSnapshot | null> {
  const cfg = getAlpacaConfig();
  if (!cfg) return null;
  const url = `${DATA_BASE}/v2/stocks/${encodeURIComponent(symbol)}/snapshot?feed=${encodeURIComponent(feed)}`;
  const res = await safeFetch(url, {
    headers: {
      "APCA-API-KEY-ID": cfg.keyId,
      "APCA-API-SECRET-KEY": cfg.secret,
    },
    timeoutMs: 4500,
  });
  return safeJson<RawSnapshot>(res);
}

/**
 * Alpaca stock provider. On the free plan, real-time SIP is not entitled,
 * so we try `iex` (real-time IEX) first and fall back to `delayed_sip`
 * (15-min delayed SIP) — both are documented feeds.
 */
export async function alpacaStockQuote(symbol: string, name = ""): Promise<MarketQuote | null> {
  const sym = symbol.toUpperCase();
  const cfg = getAlpacaConfig();
  if (!cfg) return null;

  return cachedFetch<MarketQuote | null>(`alpaca:quote:${sym}`, 8_000, async () => {
    // Try IEX first (real-time, free tier), fall back to delayed_sip
    const feeds: { feed: string; label: string; delayed: boolean }[] = [
      { feed: "iex", label: "Alpaca IEX", delayed: false },
      { feed: "delayed_sip", label: "Alpaca SIP (15-min delayed)", delayed: true },
    ];

    for (const { feed, label, delayed } of feeds) {
      const raw = await fetchSnapshotRaw(sym, feed);
      if (!raw) continue;
      const price =
        raw.latestTrade?.p ??
        raw.minuteBar?.c ??
        raw.dailyBar?.c ??
        raw.prevDailyBar?.c ??
        null;
      if (price == null) continue;

      const ts = raw.latestTrade?.t ?? raw.minuteBar?.t ?? raw.dailyBar?.t ?? new Date().toISOString();
      const dailyOpen = raw.dailyBar?.o ?? raw.prevDailyBar?.c ?? null;
      const change24h =
        dailyOpen != null && price != null ? price - dailyOpen : null;
      const changePercent24h =
        dailyOpen != null && dailyOpen > 0 && change24h != null
          ? (change24h / dailyOpen) * 100
          : null;

      return {
        symbol: sym,
        name: name || sym,
        assetType: "STOCK",
        price,
        bid: raw.latestQuote?.bp ?? null,
        ask: raw.latestQuote?.ap ?? null,
        change24h,
        changePercent24h,
        volume24h: raw.dailyBar?.v ?? null,
        marketCap: null,
        high24h: raw.dailyBar?.h ?? null,
        low24h: raw.dailyBar?.l ?? null,
        previousClose: raw.prevDailyBar?.c ?? null,
        currency: "USD",
        timestamp: ts,
        source: "ALPACA_STOCK",
        feed: label,
        status: classifyFreshness(ts, "STOCK", delayed ? "DELAYED" : "LIVE"),
      };
    }
    return null;
  });
}

interface RawBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface RawBarsResp {
  bars?: RawBar[];
}

export async function alpacaStockBars(
  symbol: string,
  timeframe: "1Day" | "1Hour" | "15Min",
  limit = 60,
): Promise<HistoricalSeries | null> {
  const sym = symbol.toUpperCase();
  const cfg = getAlpacaConfig();
  if (!cfg) return null;

  const key = `alpaca:bars:${sym}:${timeframe}:${limit}`;
  return cachedFetch<HistoricalSeries | null>(key, 60_000, async () => {
    // Determine a start date that comfortably covers `limit` sessions.
    const daysBack = timeframe === "1Day" ? limit * 2 : timeframe === "1Hour" ? Math.ceil(limit / 6) + 4 : 3;
    const start = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();

    const feeds = ["iex", "delayed_sip"];
    for (const feed of feeds) {
      const url = new URL(`${DATA_BASE}/v2/stocks/${encodeURIComponent(sym)}/bars`);
      url.searchParams.set("timeframe", timeframe);
      url.searchParams.set("start", start);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("feed", feed);
      url.searchParams.set("adjustment", "raw");
      const res = await safeFetch(url.toString(), {
        headers: {
          "APCA-API-KEY-ID": cfg.keyId,
          "APCA-API-SECRET-KEY": cfg.secret,
        },
        timeoutMs: 6000,
      });
      const raw = await safeJson<RawBarsResp>(res);
      if (raw?.bars && raw.bars.length > 0) {
        return {
          symbol: sym,
          timeframe,
          bars: raw.bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })),
          source: "ALPACA_STOCK",
          status: feed === "iex" ? "LIVE" : "DELAYED",
          fetchedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  });
}

/** Best-effort asset metadata lookup (also acts as symbol validation). */
export async function alpacaStockAsset(symbol: string): Promise<{
  symbol: string;
  name: string;
  tradable: boolean;
  status: string;
} | null> {
  const cfg = getAlpacaConfig();
  if (!cfg) return null;
  return cachedFetch(`alpaca:asset:${symbol.toUpperCase()}`, 12 * 3600_000, async () => {
    const res = await safeFetch(
      `https://paper-api.alpaca.markets/v2/assets/${encodeURIComponent(symbol.toUpperCase())}`,
      {
        headers: {
          "APCA-API-KEY-ID": cfg.keyId,
          "APCA-API-SECRET-KEY": cfg.secret,
        },
        timeoutMs: 4000,
      },
    );
    const raw = await safeJson<{ symbol: string; name: string; tradable: boolean; status: string }>(res);
    return raw ?? null;
  });
}

/** Server clock — real market status (open / pre / after / closed). */
export async function alpacaClock(): Promise<{
  is_open: boolean;
  timestamp: string;
  next_open: string;
  next_close: string;
} | null> {
  const cfg = getAlpacaConfig();
  if (!cfg) return null;
  return cachedFetch("alpaca:clock", 30_000, async () => {
    const res = await safeFetch("https://paper-api.alpaca.markets/v2/clock", {
      headers: {
        "APCA-API-KEY-ID": cfg.keyId,
        "APCA-API-SECRET-KEY": cfg.secret,
      },
      timeoutMs: 3500,
    });
    return safeJson<{ is_open: boolean; timestamp: string; next_open: string; next_close: string }>(res);
  });
}
