import "server-only";
import { z } from "zod";
import {
  MarketDataError,
  type Candle,
  type Granularity,
  type MarketDataProvider,
  type Ticker,
  type TradableSymbol,
} from "./provider";

/**
 * Bitget public spot market data, REST API v2. No API key required.
 *   GET /api/v2/spot/market/tickers?symbol=BTCUSDT
 *   GET /api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1h&limit=72
 *   GET /api/v2/spot/public/symbols
 * Every response is wrapped as { code: "00000", msg, requestTime, data }.
 */
const BASE_URL = "https://api.bitget.com";
const TIMEOUT_MS = 8_000;

const num = z.union([z.string(), z.number()]).transform((v) => Number(v));
const optNum = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined || v === "" ? null : Number(v)));

const Envelope = z.object({
  code: z.union([z.string(), z.number()]).transform(String),
  msg: z.string().optional(),
  data: z.unknown(),
});

const TickerRow = z.object({
  symbol: z.string(),
  lastPr: num,
  open: num.optional(),
  high24h: num,
  low24h: num,
  change24h: num,
  baseVolume: num.optional(),
  quoteVolume: num.optional(),
  usdtVolume: num.optional(),
  bidPr: optNum,
  askPr: optNum,
  ts: num,
});

// [ts, open, high, low, close, baseVolume, usdtVolume, quoteVolume]
const CandleRow = z.array(z.union([z.string(), z.number()])).min(6);

const SymbolRow = z.object({
  symbol: z.string(),
  baseCoin: z.string(),
  quoteCoin: z.string(),
  status: z.string().optional(),
});

// Small in-process TTL cache so the ticker strip and repeated analyses don't hammer the API.
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function request(path: string, params: Record<string, string | number> = {}): Promise<unknown> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new MarketDataError(`Bitget unreachable: ${(err as Error).message}`, "network");
  }
  if (!res.ok) throw new MarketDataError(`Bitget HTTP ${res.status} for ${url.pathname}`, "http");

  const parsed = Envelope.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new MarketDataError("Unexpected Bitget response shape", "parse");
  if (parsed.data.code !== "00000") {
    throw new MarketDataError(`Bitget error ${parsed.data.code}: ${parsed.data.msg ?? ""}`, "api");
  }
  return parsed.data.data;
}

export class BitgetSpotProvider implements MarketDataProvider {
  readonly id = "bitget-spot-v2";

  async getTicker(symbol: string): Promise<Ticker> {
    return cached(`t:${symbol}`, 10_000, async () => {
      const data = await request("/api/v2/spot/market/tickers", { symbol });
      const rows = z.array(TickerRow).safeParse(data);
      if (!rows.success) throw new MarketDataError("Unexpected ticker payload", "parse");
      const r = rows.data.find((row) => row.symbol === symbol);
      if (!r) throw new MarketDataError(`No ticker for ${symbol}`, "not_found");
      return {
        symbol: r.symbol,
        last: r.lastPr,
        open24h: r.open ?? r.lastPr / (1 + r.change24h),
        high24h: r.high24h,
        low24h: r.low24h,
        change24h: r.change24h,
        baseVolume: r.baseVolume ?? 0,
        quoteVolume: r.usdtVolume ?? r.quoteVolume ?? 0,
        bid: r.bidPr,
        ask: r.askPr,
        ts: r.ts,
      };
    });
  }

  async getCandles(
    symbol: string,
    { granularity, limit = 72 }: { granularity: Granularity; limit?: number },
  ): Promise<Candle[]> {
    return cached(`c:${symbol}:${granularity}:${limit}`, 60_000, async () => {
      const data = await request("/api/v2/spot/market/candles", { symbol, granularity, limit });
      const rows = z.array(CandleRow).safeParse(data);
      if (!rows.success) throw new MarketDataError("Unexpected candle payload", "parse");
      return rows.data
        .map((r) => ({
          ts: Number(r[0]),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          baseVolume: Number(r[5]),
          quoteVolume: Number(r[6] ?? r[7] ?? 0),
        }))
        .filter((c) => Number.isFinite(c.close))
        .sort((a, b) => a.ts - b.ts);
    });
  }

  async listSymbols(): Promise<TradableSymbol[]> {
    return cached("symbols", 60 * 60_000, async () => {
      const data = await request("/api/v2/spot/public/symbols");
      const rows = z.array(SymbolRow).safeParse(data);
      if (!rows.success) throw new MarketDataError("Unexpected symbols payload", "parse");
      return rows.data.map((r) => ({
        symbol: r.symbol,
        baseCoin: r.baseCoin.toUpperCase(),
        quoteCoin: r.quoteCoin.toUpperCase(),
        online: !r.status || r.status === "online",
      }));
    });
  }
}
