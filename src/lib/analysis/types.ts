import { z } from "zod";

// Shared by server and client. Contains no secrets and no server imports.

export const CATEGORIES = [
  "fundamental",
  "technical",
  "timing",
  "liquidity",
  "macro",
  "sentiment",
] as const;
export const STATUSES = ["holds", "weak", "broken"] as const;
export const VERDICTS = ["PASS", "REVISE", "BLOCK"] as const;

export type Category = (typeof CATEGORIES)[number];
export type AssumptionStatus = (typeof STATUSES)[number];
export type Verdict = (typeof VERDICTS)[number];
export type Direction = "long" | "short" | "neutral";
export type AssetClass = "stock_token" | "crypto";
export type Engine = "qwen" | "offline";

const lower = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);
const upper = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : v);
const text = (max: number) => z.string().trim().min(1).max(max);

export const AssumptionSchema = z.object({
  id: z.coerce.string().trim().min(1).max(12),
  text: text(400),
  category: z.preprocess(lower, z.enum(CATEGORIES)),
  evidenceFor: z.array(text(400)).max(6).default([]),
  evidenceAgainst: z.array(text(400)).max(6).default([]),
  /** What would be needed to check this assumption but isn't in the evidence (e.g. on-chain data, news). */
  unverified: z.array(text(300)).max(4).default([]),
  status: z.preprocess(lower, z.enum(STATUSES)),
  fragility: z.coerce
    .number()
    .min(0)
    .max(100)
    .transform((n) => Math.round(n)),
});

/** What Qwen must return. Validated strictly before anything is shown or saved. */
export const QwenAnalysisSchema = z.object({
  symbol: z.string().trim().max(12).nullish(),
  direction: z.preprocess(lower, z.enum(["long", "short", "neutral"])).catch("neutral"),
  horizon: z.string().trim().max(80).nullish(),
  assumptions: z.array(AssumptionSchema).min(4).max(8),
  verdict: z.preprocess(upper, z.enum(VERDICTS)),
  weakestAssumptionId: z.coerce.string().trim().min(1),
  whatMustBeTrue: z.array(text(300)).min(1).max(6),
  summary: text(700),
});

export type Assumption = z.infer<typeof AssumptionSchema>;
export type QwenAnalysis = z.infer<typeof QwenAnalysisSchema>;

export interface TickerSnapshot {
  last: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  quoteVolume24h: number;
  spreadPct: number | null;
  ts: number;
}

export interface CandleStats {
  granularity: string;
  count: number;
  windowChangePct: number;
  hourlyVolPct: number; // stdev of candle-to-candle returns, in %
  windowHigh: number;
  windowLow: number;
  closes: number[]; // downsampled, oldest first
  /** Candle open times (ms) matching `closes`. Absent in snapshots saved before it existed. */
  times?: number[];
}

/** A reference market (BTC/ETH for crypto, SPY/QQQ for stocks) over the same window. */
export interface BenchmarkSnapshot {
  underlying: string;
  exchangeSymbol: string;
  change24hPct: number;
  windowChangePct: number;
  /** Hourly closes and their open times (ms), oldest first. */
  closes: number[];
  times: number[];
}

/** Positioning on the asset's Bitget USDT perpetual. */
export interface DerivativesSnapshot {
  symbol: string;
  /** Current funding rate per interval, in % (positive = longs pay shorts). */
  fundingRatePct: number;
  fundingIntervalHours: number | null;
  /** Settled funding rates, oldest first, in %. */
  fundingHistory: { ts: number; ratePct: number }[];
  /** Open interest in contracts (base asset units) and in USDT. */
  openInterest: number;
  openInterestUsdt: number | null;
  /** Latest share of open position size that is long, in %. */
  positionLongPct: number | null;
  /** Latest share of trader accounts that are net long, in %. */
  accountLongPct: number | null;
  /** Hourly share of open position size that is long, oldest first. */
  longShortHistory: { ts: number; positionLongPct: number }[];
}

/** Longer context from daily candles (e.g. distance from the 1-year high). */
export interface RangeStats {
  days: number;
  high: number;
  low: number;
  changePct: number;
  fromHighPct: number; // negative = below the high
}

export interface MarketSnapshot {
  provider: string;
  underlying: string;
  exchangeSymbol: string | null;
  assetClass: AssetClass | null;
  ticker: TickerSnapshot | null;
  candles: CandleStats | null;
  /** Optional: absent in snapshots saved before it existed. */
  daily?: RangeStats | null;
  /** Optional: broader market over the same window. */
  benchmarks?: BenchmarkSnapshot[];
  /** Optional: futures positioning. Null when Bitget lists no perpetual for the asset. */
  derivatives?: DerivativesSnapshot | null;
  fetchedAt: string;
  error: string | null;
}

export interface StressTestResult {
  id: string | null;
  idea: string;
  symbol: string | null;
  assetClass: AssetClass | null;
  direction: Direction;
  horizon: string | null;
  assumptions: Assumption[];
  verdict: Verdict;
  fragility: number;
  weakestAssumptionId: string;
  whatMustBeTrue: string[];
  summary: string;
  market: MarketSnapshot | null;
  engine: Engine;
  model: string | null;
  cached: boolean;
  notices: string[];
  createdAt: string;
}

/** Events streamed from POST /api/analyze as SSE `data:` lines. */
export type StreamEvent =
  | { type: "step"; id: StepId; status: "active" | "done" | "skipped" | "failed"; detail?: string }
  | { type: "market"; market: MarketSnapshot }
  | { type: "delta"; channel: "reasoning" | "content"; text: string }
  | { type: "assumption"; text: string }
  | { type: "result"; result: StressTestResult }
  | { type: "error"; message: string };

export type StepId = "parse" | "cache" | "market" | "extract" | "score" | "save";

export const STEP_LABELS: Record<StepId, string> = {
  parse: "Reading the trade idea…",
  cache: "Checking recent runs…",
  market: "Checking market data on Bitget…",
  extract: "Extracting assumptions…",
  score: "Scoring fragility…",
  save: "Saving verdict…",
};
