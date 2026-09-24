import { cachedFetch } from "../cache";
import { safeFetch, safeJson } from "../http";
import { classifyFreshness, type HistoricalSeries, type MarketQuote } from "../types";

/**
 * Binance public market-data provider. Uses only public endpoints —
 * no credentials required, no orders placed. Base URL is data.binance.com
 * because api.binance.com is geo-restricted in some regions.
 */
const BASES = [
  "https://data-api.binance.vision", // preferred public data host
  "https://api.binance.com",
  "https://api1.binance.com",
];

interface Raw24h {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
  openPrice: string;
  prevClosePrice: string;
  closeTime: number;
}

async function tryBases<T>(loader: (base: string) => Promise<T | null>): Promise<T | null> {
  for (const base of BASES) {
    // eslint-disable-next-line no-await-in-loop
    const v = await loader(base);
    if (v) return v;
  }
  return null;
}

export async function binanceQuote(pair: string, name = ""): Promise<MarketQuote | null> {
  const sym = pair.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cachedFetch<MarketQuote | null>(`binance:quote:${sym}`, 8_000, async () => {
    const raw = await tryBases<Raw24h>(async (base) => {
      const res = await safeFetch(`${base}/api/v3/ticker/24hr?symbol=${sym}`, {
        timeoutMs: 4500,
      });
      return safeJson<Raw24h>(res);
    });
    if (!raw || !raw.lastPrice) return null;
    const price = Number(raw.lastPrice);
    const ts = new Date(raw.closeTime || Date.now()).toISOString();
    // Detect the pair currency crudely (USDT/USDC/BUSD/USD/BTC/ETH suffix)
    const currency =
      ["USDT", "USDC", "BUSD", "FDUSD"].find((s) => sym.endsWith(s)) ??
      (sym.endsWith("USD") ? "USD" : sym.endsWith("BTC") ? "BTC" : sym.endsWith("ETH") ? "ETH" : "USDT");
    return {
      symbol: sym,
      name: name || sym,
      assetType: "CRYPTO",
      price,
      bid: Number(raw.bidPrice) || null,
      ask: Number(raw.askPrice) || null,
      change24h: Number(raw.priceChange) || null,
      changePercent24h: Number(raw.priceChangePercent) || null,
      volume24h: Number(raw.volume) || null,
      marketCap: null,
      high24h: Number(raw.highPrice) || null,
      low24h: Number(raw.lowPrice) || null,
      previousClose: Number(raw.prevClosePrice) || null,
      currency,
      timestamp: ts,
      source: "BINANCE",
      feed: "Binance spot",
      status: classifyFreshness(ts, "CRYPTO", "LIVE"),
    };
  });
}

type RawKline = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // close time
  string, // quote asset volume
  number, // number of trades
  string, // taker buy base
  string, // taker buy quote
  string, // ignore
];

export async function binanceBars(
  pair: string,
  interval: "1d" | "1h" | "15m",
  limit = 60,
): Promise<HistoricalSeries | null> {
  const sym = pair.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const key = `binance:bars:${sym}:${interval}:${limit}`;
  return cachedFetch<HistoricalSeries | null>(key, 60_000, async () => {
    const raw = await tryBases<RawKline[]>(async (base) => {
      const res = await safeFetch(
        `${base}/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
        { timeoutMs: 6000 },
      );
      return safeJson<RawKline[]>(res);
    });
    if (!raw || raw.length === 0) return null;
    return {
      symbol: sym,
      timeframe: interval,
      bars: raw.map((k) => ({
        t: new Date(k[0]).toISOString(),
        o: Number(k[1]),
        h: Number(k[2]),
        l: Number(k[3]),
        c: Number(k[4]),
        v: Number(k[5]),
      })),
      source: "BINANCE",
      status: "LIVE",
      fetchedAt: new Date().toISOString(),
    };
  });
}
