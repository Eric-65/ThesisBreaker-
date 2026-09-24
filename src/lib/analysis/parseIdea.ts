import type { AssetClass, Direction } from "./types";
import { NAME_TO_TICKER, isCrypto, isEquity } from "@/lib/market/universe";

export interface ParsedIdea {
  symbol: string | null;
  assetClass: AssetClass | null;
  direction: Direction;
  horizon: string | null;
}

const HORIZON_PATTERNS: RegExp[] = [
  /\bover the weekend\b/i,
  /\bby (?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i,
  /\b(?:by|before|into|after) (?:the )?(?:close|open|earnings|fomc|cpi|print|report)\b/i,
  /\b(?:today|tonight|tomorrow|overnight|intraday)\b/i,
  /\b(?:this|next) (?:week|month|quarter|year)\b/i,
  /\bwithin \d+\s*(?:hours?|days?|weeks?|months?)\b/i,
  /\b(?:in|for) (?:the )?(?:next )?\d+\s*(?:hours?|days?|weeks?|months?)\b/i,
  /\b(?:short|long)[- ]term\b/i,
];

/** Deterministic pre-parse, used to fetch the right market data before calling the model. */
export function parseIdea(idea: string): ParsedIdea {
  const symbol = findSymbol(idea);
  const mentionsToken = /\br-?tokens?\b|\btokeni[sz]ed\b|\bstock token\b/i.test(idea);
  let assetClass: AssetClass | null = null;
  if (symbol) {
    if (mentionsToken || isEquity(symbol)) assetClass = "stock_token";
    else if (isCrypto(symbol)) assetClass = "crypto";
  }

  const direction = pickDirection(idea);

  const horizon = HORIZON_PATTERNS.map((re) => idea.match(re)?.[0]).find(Boolean) ?? null;
  return { symbol, assetClass, direction, horizon };
}

function pickDirection(idea: string): Direction {
  // Explicit position words win over implied ones ("short the bounce" is short).
  const explicitLong = /\b(long|buy|buying|calls?)\b/i.test(idea);
  const explicitShort = /\b(short|shorting|sell|selling|puts?)\b/i.test(idea);
  if (explicitLong !== explicitShort) return explicitLong ? "long" : "short";
  const impliedLong = /\b(bull(?:ish)?|accumulate|go up|rally|bounce|rebound|breakout)\b/i.test(idea);
  const impliedShort = /\b(bear(?:ish)?|fade|dump|go down|breakdown|crash)\b/i.test(idea);
  if (impliedLong !== impliedShort) return impliedLong ? "long" : "short";
  return "neutral";
}

function findSymbol(idea: string): string | null {
  const dollar = idea.match(/\$([A-Za-z]{1,6})\b/);
  if (dollar) return dollar[1].toUpperCase();

  // "NVDA rToken", "RNVDA", or a known ticker written in caps.
  for (const m of idea.matchAll(/\b([A-Z]{1,6})(?:USDT)?\b/g)) {
    const raw = m[1];
    const t = raw.length > 2 && raw.startsWith("R") && isEquity(raw.slice(1)) ? raw.slice(1) : raw;
    if (isEquity(t) || isCrypto(t)) return t;
  }

  const lower = idea.toLowerCase();
  for (const [name, ticker] of Object.entries(NAME_TO_TICKER)) {
    const re = new RegExp(`(^|[^a-z])${name.replace(/[&]/g, "\\$&")}([^a-z]|$)`);
    if (re.test(lower)) return ticker;
  }
  return null;
}

/** Normalization used for the cache key: case, whitespace and trailing punctuation don't matter. */
export function normalizeIdea(idea: string): string {
  return idea.toLowerCase().replace(/\s+/g, " ").replace(/[.!?\s]+$/, "").trim();
}
