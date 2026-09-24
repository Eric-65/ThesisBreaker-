/**
 * Market data contracts. The analysis pipeline only depends on these
 * interfaces, so Phase 2 can add a Bitget-MCP-backed fundamentals source
 * (earnings, estimates, insider activity, news) next to price data without
 * touching the prompt builder or the heuristic.
 */

export type Granularity =
  | "1min"
  | "5min"
  | "15min"
  | "30min"
  | "1h"
  | "4h"
  | "6h"
  | "12h"
  | "1day"
  | "1week";

export interface Ticker {
  symbol: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  /** Fractional change over 24h, e.g. 0.0123 = +1.23%. */
  change24h: number;
  baseVolume: number;
  quoteVolume: number;
  bid: number | null;
  ask: number | null;
  ts: number;
}

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  baseVolume: number;
  quoteVolume: number;
}

export interface TradableSymbol {
  symbol: string; // exchange symbol, e.g. "BTCUSDT"
  baseCoin: string;
  quoteCoin: string;
  online: boolean;
}

export interface MarketDataProvider {
  readonly id: string;
  getTicker(symbol: string): Promise<Ticker>;
  getCandles(symbol: string, opts: { granularity: Granularity; limit?: number }): Promise<Candle[]>;
  /** Full tradable list — used to verify symbols instead of guessing them. */
  listSymbols(): Promise<TradableSymbol[]>;
}

/** Phase 2 placeholder: implemented by a Bitget MCP adapter, not in Phase 1. */
export interface FundamentalsProvider {
  readonly id: string;
  getFundamentals(underlying: string): Promise<{
    facts: { label: string; value: string; source: string; asOf: string }[];
  }>;
}

export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly code: "network" | "http" | "api" | "parse" | "not_found",
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}
