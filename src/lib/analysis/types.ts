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
  market: "Checking price evidence on Bitget…",
  extract: "Extracting assumptions…",
  score: "Scoring fragility…",
  save: "Saving verdict…",
};
