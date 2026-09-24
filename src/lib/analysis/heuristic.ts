import type { ParsedIdea } from "./parseIdea";
import { overallFragility, pickWeakest, ruleVerdict, statusFromFragility } from "./scoring";
import type { Assumption, Category, MarketSnapshot, Verdict } from "./types";

/**
 * Offline heuristic: keyword rules + live price evidence (when available).
 * Deterministic for a given idea and market snapshot. Used when Qwen is not
 * configured or fails, so the demo never breaks. Clearly labeled in the UI.
 */

interface Draft {
  text: string;
  category: Category;
  base: number;
  evidenceFor: string[];
  evidenceAgainst: string[];
}

interface Rule {
  test: RegExp;
  build: (ctx: Ctx) => Draft;
}

interface Ctx {
  t: string; // display ticker
  dir: ParsedIdea["direction"];
  horizon: string | null;
  isToken: boolean;
}

const SRC = "[Offline heuristic]";
const MKT = "[Bitget market data]";

const RULES: Rule[] = [
  {
    test: /\b(earnings|eps|beat|guidance|revenue|sales|margins?|report)\b/i,
    build: ({ t }) => ({
      text: `${t}'s earnings will beat expectations and the beat is not already priced in.`,
      category: "fundamental",
      base: 64,
      evidenceFor: [`${SRC} The idea names a concrete, dated catalyst, which makes it testable.`],
      evidenceAgainst: [
        `${SRC} A headline beat often fails to move price when guidance or whisper numbers disappoint.`,
        `${SRC} No consensus estimates were available offline to check the bar the report must clear.`,
      ],
    }),
  },
  {
    test: /\b(dip|pullback|pull back|reverse|reversal|bounce|rebound|oversold|mean[- ]revert)\b/i,
    build: ({ t }) => ({
      text: `The recent move in ${t} is a temporary pullback that will reverse, not the start of a trend.`,
      category: "technical",
      base: 55,
      evidenceFor: [`${SRC} Short-term pullbacks do frequently mean-revert in trending names.`],
      evidenceAgainst: [`${SRC} Nothing in the idea distinguishes a dip from a breakdown (no level, no volume signal).`],
    }),
  },
  {
    test: /\b(breakout|break out|resistance|support|momentum|trend|all[- ]time high|ath|moving average)\b/i,
    build: ({ t }) => ({
      text: `${t} will hold its key levels and momentum will continue in the trade's direction.`,
      category: "technical",
      base: 50,
      evidenceFor: [`${SRC} The idea references price structure, so it has a checkable invalidation level.`],
      evidenceAgainst: [`${SRC} Momentum signals flip quickly around catalysts and low-liquidity hours.`],
    }),
  },
  {
    test: /\b(fed|fomc|rates?|cpi|inflation|jobs|payrolls|macro|tariffs?|recession|yields?)\b/i,
    build: () => ({
      text: "Macro data and rate expectations will not move against the position during the window.",
      category: "macro",
      base: 52,
      evidenceFor: [`${SRC} The idea acknowledges a macro driver instead of ignoring it.`],
      evidenceAgainst: [`${SRC} Macro releases move the whole tape; single-name theses rarely control for them.`],
    }),
  },
  {
    test: /\b(hype|everyone|sentiment|twitter|social|fomo|crowd(?:ed)?|retail|squeeze|narrative)\b/i,
    build: ({ t }) => ({
      text: `Sentiment around ${t} will stay supportive and positioning is not already crowded.`,
      category: "sentiment",
      base: 58,
      evidenceFor: [`${SRC} Strong narratives can sustain moves longer than fundamentals suggest.`],
      evidenceAgainst: [`${SRC} When "everyone" agrees, the marginal buyer is already in — a crowded trade.`],
    }),
  },
];

function timingDraft(ctx: Ctx, idea: string): Draft | null {
  const tight = /\b(weekend|monday|tuesday|wednesday|thursday|friday|tomorrow|tonight|overnight|intraday|today|by the close|this week|\d+\s*(?:hours?|days?))\b/i;
  if (!tight.test(idea) && !ctx.horizon) return null;
  const h = ctx.horizon;
  const window = !h
    ? "within the stated window"
    : /^(over|by|within|in|into|before|after|this|next|today|tonight|tomorrow|overnight|intraday)\b/i.test(h)
      ? h
      : `within ${h}`;
  return {
    text: `The expected move will happen ${window}, not merely eventually.`,
    category: "timing",
    base: tight.test(idea) ? 66 : 50,
    evidenceFor: [`${SRC} A defined window makes the trade falsifiable and limits time risk.`],
    evidenceAgainst: [`${SRC} Being right on direction but wrong on timing still loses money on a short window.`],
  };
}

function liquidityDraft(ctx: Ctx, idea: string): Draft {
  const weekend = /\b(weekend|saturday|sunday|overnight|after[- ]hours|pre[- ]market|monday)\b/i.test(idea);
  if (ctx.isToken) {
    return {
      text: `The ${ctx.t} rToken will track the underlying stock closely${weekend ? " while the U.S. market is closed" : ""}, with enough liquidity to exit near fair value.`,
      category: "liquidity",
      base: weekend ? 68 : 48,
      evidenceFor: [`${SRC} rTokens trade 24/7, so the position can be adjusted outside U.S. hours.`],
      evidenceAgainst: [
        weekend
          ? `${SRC} With the U.S. cash market closed there is no underlying price discovery; the token can gap to the Monday open.`
          : `${SRC} Tokenized-stock order books are typically thinner than the underlying's.`,
      ],
    };
  }
  return {
    text: `There is enough liquidity in ${ctx.t} to enter and exit near the quoted price.`,
    category: "liquidity",
    base: 35,
    evidenceFor: [`${SRC} Major USDT pairs usually have deep books.`],
    evidenceAgainst: [],
  };
}

function fillerDrafts(ctx: Ctx): Draft[] {
  return [
    {
      text: `No unscheduled news or macro shock will hit ${ctx.t} during the holding period.`,
      category: "macro",
      base: 45,
      evidenceFor: [`${SRC} Most short windows pass without a shock.`],
      evidenceAgainst: [`${SRC} The idea has no plan for an adverse headline.`],
    },
    {
      text: `Other traders are not already positioned the same way on ${ctx.t}.`,
      category: "sentiment",
      base: 50,
      evidenceFor: [],
      evidenceAgainst: [`${SRC} Positioning data was not available offline; this is unverified.`],
    },
    {
      text: `The thesis has a clear exit if it is wrong.`,
      category: "timing",
      base: 55,
      evidenceFor: [],
      evidenceAgainst: [`${SRC} The idea states no invalidation level or stop.`],
    },
  ];
}

function applyMarket(d: Draft, m: MarketSnapshot | null, dir: ParsedIdea["direction"]): number {
  let f = d.base;
  const tk = m?.ticker;
  if (!tk) {
    d.evidenceAgainst.push(`${SRC} No live market data was available; this assumption is unverified.`);
    return f + 5;
  }
  const sign = dir === "short" ? -1 : 1;
  const ch = tk.change24hPct;
  const c = m?.candles;

  if (d.category === "technical" || d.category === "timing") {
    if (dir !== "neutral" && Math.abs(ch) >= 0.5) {
      const withUs = sign * ch > 0;
      const line = `${MKT} 24h change is ${ch.toFixed(2)}% — ${withUs ? "moving with" : "moving against"} the ${dir} idea.`;
      (withUs ? d.evidenceFor : d.evidenceAgainst).push(line);
      f += withUs ? -8 : 10;
    }
    if (c && d.category === "technical") {
      const pos = (tk.last - c.windowLow) / Math.max(1e-9, c.windowHigh - c.windowLow);
      const line = `${MKT} Price sits at ${(pos * 100).toFixed(0)}% of its ${c.count}h range (${c.windowLow.toPrecision(5)}–${c.windowHigh.toPrecision(5)}).`;
      const favorable = dir === "short" ? pos > 0.7 : pos < 0.3;
      (favorable ? d.evidenceFor : d.evidenceAgainst).push(line);
      f += favorable ? -4 : 4;
    }
  }
  if (d.category === "timing" && c) {
    d.evidenceAgainst.push(
      `${MKT} Hourly volatility is ${c.hourlyVolPct.toFixed(2)}%; over a short window, noise of that size can swamp the expected move.`,
    );
    if (c.hourlyVolPct > 1.5) f += 6;
  }
  if (d.category === "liquidity") {
    const vol = tk.quoteVolume24h;
    const line = `${MKT} 24h volume is ${Math.round(vol).toLocaleString("en-US")} USDT${tk.spreadPct !== null ? `, spread ${tk.spreadPct.toFixed(3)}%` : ""}.`;
    if (vol < 1_000_000 || (tk.spreadPct ?? 0) > 0.3) {
      d.evidenceAgainst.push(line);
      f += 12;
    } else {
      d.evidenceFor.push(line);
      f -= 8;
    }
  }
  return f;
}

export interface HeuristicOutput {
  direction: ParsedIdea["direction"];
  horizon: string | null;
  assumptions: Assumption[];
  verdict: Verdict;
  weakestAssumptionId: string;
  whatMustBeTrue: string[];
  summary: string;
  fragility: number;
}

export function heuristicAnalysis(idea: string, parsed: ParsedIdea, market: MarketSnapshot | null): HeuristicOutput {
  const ctx: Ctx = {
    t: parsed.symbol ?? "the asset",
    dir: parsed.direction,
    horizon: parsed.horizon,
    isToken: parsed.assetClass === "stock_token" || market?.assetClass === "stock_token",
  };

  const drafts: Draft[] = RULES.filter((r) => r.test.test(idea)).map((r) => r.build(ctx));
  const timing = timingDraft(ctx, idea);
  if (timing) drafts.push(timing);
  drafts.push(liquidityDraft(ctx, idea));
  for (const f of fillerDrafts(ctx)) {
    if (drafts.length >= 4) break;
    if (!drafts.some((d) => d.category === f.category && d.text === f.text)) drafts.push(f);
  }

  const assumptions: Assumption[] = drafts.slice(0, 8).map((d, i) => {
    const fragility = Math.max(5, Math.min(95, Math.round(applyMarket(d, market, parsed.direction))));
    return {
      id: `A${i + 1}`,
      text: d.text,
      category: d.category,
      evidenceFor: d.evidenceFor.slice(0, 4),
      evidenceAgainst: d.evidenceAgainst.slice(0, 4),
      status: statusFromFragility(fragility),
      fragility,
    };
  });

  const verdict = ruleVerdict(assumptions);
  const weakestAssumptionId = pickWeakest(assumptions);
  const top = [...assumptions].sort((a, b) => b.fragility - a.fragility).slice(0, 3);
  const weakest = assumptions.find((a) => a.id === weakestAssumptionId)!;

  return {
    direction: parsed.direction,
    horizon: parsed.horizon,
    assumptions,
    verdict,
    weakestAssumptionId,
    whatMustBeTrue: top.map((a) => a.text),
    summary: `Offline heuristic (Qwen not used): ${assumptions.length} assumptions were extracted by keyword rules${
      market?.ticker ? " and checked against live Bitget prices" : ""
    }. The weakest is ${weakest.category}: "${weakest.text}" Treat this as a rough first pass.`,
    fragility: overallFragility(assumptions),
  };
}
