import "server-only";
import type { AssetClass, CandleStats, MarketSnapshot } from "@/lib/analysis/types";
import { BitgetSpotProvider } from "./bitget";
import type { Candle, MarketDataProvider } from "./provider";
import { resolveSymbol } from "./symbols";

export const marketData: MarketDataProvider = new BitgetSpotProvider();

function candleStats(candles: Candle[], granularity: string): CandleStats | null {
  if (candles.length < 2) return null;
  const closes = candles.map((c) => c.close);
  const returns = closes.slice(1).map((c, i) => c / closes[i] - 1);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const step = Math.max(1, Math.floor(closes.length / 48));
  return {
    granularity,
    count: candles.length,
    windowChangePct: (closes.at(-1)! / closes[0] - 1) * 100,
    hourlyVolPct: Math.sqrt(variance) * 100,
    windowHigh: Math.max(...candles.map((c) => c.high)),
    windowLow: Math.min(...candles.map((c) => c.low)),
    closes: closes.filter((_, i) => i % step === 0 || i === closes.length - 1),
  };
}

/** Price evidence for one underlying. Never throws: failures land in `error`. */
export async function getMarketSnapshot(
  underlying: string,
  hint: AssetClass | null,
): Promise<MarketSnapshot> {
  const base: MarketSnapshot = {
    provider: marketData.id,
    underlying,
    exchangeSymbol: null,
    assetClass: hint,
    ticker: null,
    candles: null,
    fetchedAt: new Date().toISOString(),
    error: null,
  };
  try {
    const resolved = await resolveSymbol(marketData, underlying, hint);
    if (!resolved) {
      return { ...base, error: `${underlying} is not listed as a tradable USDT spot pair on Bitget` };
    }
    const [ticker, candles] = await Promise.all([
      marketData.getTicker(resolved.exchangeSymbol),
      marketData.getCandles(resolved.exchangeSymbol, { granularity: "1h", limit: 72 }),
    ]);
    const spread =
      ticker.bid && ticker.ask && ticker.ask > 0
        ? ((ticker.ask - ticker.bid) / ((ticker.ask + ticker.bid) / 2)) * 100
        : null;
    return {
      ...base,
      exchangeSymbol: resolved.exchangeSymbol,
      assetClass: resolved.assetClass,
      ticker: {
        last: ticker.last,
        change24hPct: ticker.change24h * 100,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        quoteVolume24h: ticker.quoteVolume,
        spreadPct: spread,
        ts: ticker.ts,
      },
      candles: candleStats(candles, "1h"),
    };
  } catch (err) {
    return { ...base, error: (err as Error).message };
  }
}

export interface StripQuote {
  underlying: string;
  exchangeSymbol: string;
  last: number;
  change24hPct: number;
}

export async function getStripQuotes(underlyings: string[]): Promise<StripQuote[]> {
  const settled = await Promise.allSettled(
    underlyings.map(async (u) => {
      const r = await resolveSymbol(marketData, u);
      if (!r) return null;
      const t = await marketData.getTicker(r.exchangeSymbol);
      return { underlying: u, exchangeSymbol: r.exchangeSymbol, last: t.last, change24hPct: t.change24h * 100 };
    }),
  );
  return settled.flatMap((s) => (s.status === "fulfilled" && s.value ? [s.value] : []));
}
