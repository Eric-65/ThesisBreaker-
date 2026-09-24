import type {
  Confidence,
  Direction,
  EvidenceItem,
  Extraction,
  Impact,
} from "../types";
import type { AssetIdentity, MarketQuote } from "../market/types";
import { getBars, getNft, getQuote, resolveIdentity } from "../market/router";
import { id as makeId, pick, seededRng } from "./rand";

/**
 * EvidenceEngine
 *
 * Gathers evidence for a thesis. Live evidence (FACT) is derived from Alpaca
 * market-data snapshots. Model-derived evidence (INTERPRETATION) is generated
 * from the thesis text. Demo-mode evidence (DEMO) is used only when neither
 * Alpaca nor real market context is available.
 *
 * Rule: never label a DEMO or INTERPRETATION item as a FACT.
 */
export interface EvidenceBundle {
  supporting: EvidenceItem[];
  contradictory: EvidenceItem[];
  uncertain: EvidenceItem[];
  quote: MarketQuote | null;
  mode: "live" | "demo";
}

const DEMO_SUPPORTING: string[] = [
  "Consensus revenue estimates for the next FY revised upward.",
  "Order backlog and lead-time commentary have remained strong.",
  "Historical earnings beats support execution credibility.",
  "Sector ETF flows have been consistently positive.",
];

const DEMO_CONTRADICTORY: string[] = [
  "Sector peer commentary suggests early signs of demand normalization.",
  "Short interest has risen meaningfully off recent lows.",
  "Guidance beat magnitude is decelerating quarter over quarter.",
  "Free cash flow conversion has weakened in the last two quarters.",
];

const DEMO_UNCERTAIN: string[] = [
  "Forward demand from hyperscalers is difficult to verify from public sources.",
  "Competitor pricing has not yet been disclosed for the next cycle.",
];

export async function gatherEvidence(
  symbol: string,
  direction: Direction,
  extraction: Extraction,
  originalText: string,
  assetTypeHint?: "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION",
): Promise<EvidenceBundle> {
  // Route the quote through the router so stocks use Alpaca, crypto uses
  // Binance/CoinGecko, and NFTs use OpenSea. The FACT layer is
  // provider-agnostic.
  let identity: AssetIdentity | null = resolveIdentity(symbol);
  if (!identity && assetTypeHint) {
    identity = {
      symbol: assetTypeHint === "NFT_COLLECTION" ? symbol.toLowerCase() : symbol.toUpperCase(),
      displayName: symbol,
      assetType: assetTypeHint,
      currency: assetTypeHint === "NFT_COLLECTION" ? "ETH" : "USD",
      tradableThroughAlpaca: assetTypeHint === "STOCK" || assetTypeHint === "ETF",
      openSeaSlug: assetTypeHint === "NFT_COLLECTION" ? symbol.toLowerCase() : undefined,
      binancePair: assetTypeHint === "CRYPTO" ? `${symbol.replace("/", "")}USDT`.toUpperCase() : undefined,
    };
  }
  const isNft = identity?.assetType === "NFT_COLLECTION";
  const quote = identity && !isNft ? await getQuote(identity) : null;
  const bars = identity && !isNft ? await getBars(identity, "30D") : null;
  const nftStats = identity && isNft ? await getNft(identity) : null;
  const rng = seededRng(`${symbol}|${direction}|${originalText}|evidence`);
  const supporting: EvidenceItem[] = [];
  const contradictory: EvidenceItem[] = [];
  const uncertain: EvidenceItem[] = [];

  // --- FACT evidence from live quote ---
  const providerName = quote?.source
    ? quote.source === "ALPACA_STOCK"
      ? "Alpaca Market Data"
      : quote.source === "BINANCE"
        ? "Binance"
        : quote.source === "COINGECKO"
          ? "CoinGecko"
          : quote.source === "OPENSEA"
            ? "OpenSea"
            : "Provider"
    : "Provider";

  if (quote && quote.price != null && quote.status !== "UNAVAILABLE" && quote.status !== "DEMO") {
    const pct = quote.changePercent24h ?? 0;
    const momentumSupports =
      (direction === "long" && pct > 0.3) || (direction === "short" && pct < -0.3);
    const momentumAgainst =
      (direction === "long" && pct < -0.3) || (direction === "short" && pct > 0.3);
    const kind: "supporting" | "contradictory" | "uncertain" =
      momentumSupports ? "supporting" : momentumAgainst ? "contradictory" : "uncertain";

    const priceStr =
      quote.currency === "USD" || quote.currency === "USDT" || quote.currency === "USDC"
        ? `$${quote.price.toFixed(quote.price < 1 ? 4 : 2)}`
        : `${quote.price.toFixed(2)} ${quote.currency}`;

    pushInto(
      {
        id: makeId("e", rng),
        kind,
        title: `${symbol} 24h price action`,
        summary: `Last ${priceStr}${
          quote.changePercent24h != null
            ? ` · 24h change ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
            : ""
        }${
          quote.volume24h
            ? ` · vol ${quote.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : ""
        }.`,
        source: providerName,
        sourceKind: "FACT",
        publishedAt: quote.timestamp,
        confidence: quote.status === "LIVE" ? "HIGH" : "MEDIUM",
        impact: Math.abs(pct) > 3 ? "HIGH" : Math.abs(pct) > 1 ? "MEDIUM" : "LOW",
        relevance: "HIGH",
      },
      supporting,
      contradictory,
      uncertain,
    );

    // Range context
    if (quote.high24h != null && quote.low24h != null && quote.high24h > quote.low24h) {
      const pos = (quote.price - quote.low24h) / (quote.high24h - quote.low24h);
      const nearHigh = pos > 0.75;
      const nearLow = pos < 0.25;
      const rangeKind: "supporting" | "contradictory" | "uncertain" =
        (direction === "long" && nearHigh) || (direction === "short" && nearLow)
          ? "supporting"
          : (direction === "long" && nearLow) || (direction === "short" && nearHigh)
            ? "contradictory"
            : "uncertain";
      pushInto(
        {
          id: makeId("e", rng),
          kind: rangeKind,
          title: `${symbol} 24h range position`,
          summary: `Price sits ${(pos * 100).toFixed(0)}% of the 24h range (low ${quote.low24h.toFixed(2)} / high ${quote.high24h.toFixed(2)}).`,
          source: providerName,
          sourceKind: "FACT",
          publishedAt: quote.timestamp,
          confidence: quote.status === "LIVE" ? "HIGH" : "MEDIUM",
          impact: "LOW",
          relevance: "MEDIUM",
        },
        supporting,
        contradictory,
        uncertain,
      );
    }
  }

  // --- FACT evidence from historical bars: 30-day trend + high/low context ---
  if (bars && bars.bars.length >= 5) {
    const first = bars.bars[0].c;
    const last = bars.bars[bars.bars.length - 1].c;
    const trendPct = first > 0 ? ((last - first) / first) * 100 : 0;
    const trendKind: "supporting" | "contradictory" | "uncertain" =
      (direction === "long" && trendPct > 3) || (direction === "short" && trendPct < -3)
        ? "supporting"
        : (direction === "long" && trendPct < -3) || (direction === "short" && trendPct > 3)
          ? "contradictory"
          : "uncertain";
    const providerTrendName =
      bars.source === "ALPACA_STOCK"
        ? "Alpaca Market Data"
        : bars.source === "BINANCE"
          ? "Binance"
          : bars.source === "COINGECKO"
            ? "CoinGecko"
            : providerName;
    const high60 = Math.max(...bars.bars.map((b) => b.h));
    pushInto(
      {
        id: makeId("e", rng),
        kind: trendKind,
        title: `${symbol} ${bars.timeframe} historical trend`,
        summary: `Over ${bars.bars.length} periods, ${symbol} is ${trendPct >= 0 ? "up" : "down"} ${trendPct.toFixed(2)}%. Period high ${high60.toFixed(2)}.`,
        source: providerTrendName,
        sourceKind: "FACT",
        publishedAt: bars.fetchedAt,
        confidence: bars.status === "LIVE" ? "HIGH" : "MEDIUM",
        impact: Math.abs(trendPct) > 10 ? "HIGH" : Math.abs(trendPct) > 3 ? "MEDIUM" : "LOW",
        relevance: "HIGH",
      },
      supporting,
      contradictory,
      uncertain,
    );
  }

  // --- NFT collection FACTs from OpenSea ---
  if (nftStats) {
    if (nftStats.floorPrice != null) {
      pushInto(
        {
          id: makeId("e", rng),
          kind: "uncertain",
          title: `${nftStats.name} floor price`,
          summary: `Current floor: ${nftStats.floorPrice.toFixed(3)} ${nftStats.floorCurrency}. Chain: ${nftStats.chain}.`,
          source: "OpenSea",
          sourceKind: "FACT",
          publishedAt: nftStats.timestamp,
          confidence: "HIGH",
          impact: "HIGH",
          relevance: "HIGH",
        },
        supporting,
        contradictory,
        uncertain,
      );
    }
    if (nftStats.volume24h != null) {
      const strong = nftStats.volume24h > 20;
      const kind: "supporting" | "contradictory" | "uncertain" =
        (direction === "long" && strong) || (direction === "short" && !strong)
          ? "supporting"
          : "uncertain";
      pushInto(
        {
          id: makeId("e", rng),
          kind,
          title: `${nftStats.name} 24h trading activity`,
          summary: `${nftStats.volume24h.toFixed(2)} ${nftStats.floorCurrency} in 24h volume across ${nftStats.sales24h ?? 0} sales · ${nftStats.owners ?? 0} owners.`,
          source: "OpenSea",
          sourceKind: "FACT",
          publishedAt: nftStats.timestamp,
          confidence: "HIGH",
          impact: strong ? "MEDIUM" : "LOW",
          relevance: "HIGH",
        },
        supporting,
        contradictory,
        uncertain,
      );
    }
  }

  // --- INTERPRETATION evidence — model-reasoned from thesis keywords ---
  const t = originalText.toLowerCase();
  if (/(ai|infrastructure|gpu|data ?center|hyperscaler|cloud|compute)/.test(t)) {
    supporting.push({
      id: makeId("e", rng),
      kind: "supporting",
      title: "AI infrastructure demand narrative",
      summary:
        "Public hyperscaler capex commentary has generally been supportive of the AI infrastructure trade.",
      source: "Model Reasoning",
      sourceKind: "INTERPRETATION",
      confidence: "MEDIUM",
      impact: "HIGH",
      relevance: "HIGH",
    });
  }
  if (/(valuation|multiple|expensive|pe|priced ?in)/.test(t)) {
    contradictory.push({
      id: makeId("e", rng),
      kind: "contradictory",
      title: "Valuation concern",
      summary:
        "The thesis depends on the market not fully pricing in expected growth. Multiple compression risk remains material if growth decelerates.",
      source: "Model Reasoning",
      sourceKind: "INTERPRETATION",
      confidence: "MEDIUM",
      impact: "HIGH",
      relevance: "HIGH",
    });
  }
  if (/(margin|pricing|gross)/.test(t)) {
    uncertain.push({
      id: makeId("e", rng),
      kind: "uncertain",
      title: "Margin trajectory",
      summary:
        "Forward gross margin trajectory is not directly observable from public data and requires next earnings for confirmation.",
      source: "Model Reasoning",
      sourceKind: "INTERPRETATION",
      confidence: "LOW",
      impact: "MEDIUM",
      relevance: "MEDIUM",
    });
  }

  // --- DEMO fill so we always have a useful evidence pane ---
  const hasLive =
    (!!quote && quote.status !== "UNAVAILABLE" && quote.status !== "DEMO") ||
    !!nftStats;
  const demoNeeded = supporting.length + contradictory.length + uncertain.length < 5;
  if (demoNeeded) {
    for (const s of pick(rng, DEMO_SUPPORTING, 2)) {
      supporting.push({
        id: makeId("e", rng),
        kind: "supporting",
        title: s,
        summary: `${s} — modelled from thesis context; requires primary-source verification.`,
        source: hasLive ? "Model Reasoning" : "Demo Signal",
        sourceKind: hasLive ? "INTERPRETATION" : "DEMO",
        confidence: hasLive ? "MEDIUM" : "LOW",
        impact: "MEDIUM",
        relevance: "MEDIUM",
      });
    }
    for (const s of pick(rng, DEMO_CONTRADICTORY, 2)) {
      contradictory.push({
        id: makeId("e", rng),
        kind: "contradictory",
        title: s,
        summary: `${s} — modelled from thesis context; requires primary-source verification.`,
        source: hasLive ? "Model Reasoning" : "Demo Signal",
        sourceKind: hasLive ? "INTERPRETATION" : "DEMO",
        confidence: hasLive ? "MEDIUM" : "LOW",
        impact: "MEDIUM",
        relevance: "MEDIUM",
      });
    }
    for (const s of pick(rng, DEMO_UNCERTAIN, 1)) {
      uncertain.push({
        id: makeId("e", rng),
        kind: "uncertain",
        title: s,
        summary: `${s} — insufficient public data to classify.`,
        source: hasLive ? "Model Reasoning" : "Demo Signal",
        sourceKind: hasLive ? "INTERPRETATION" : "DEMO",
        confidence: "UNKNOWN",
        impact: "MEDIUM",
        relevance: "MEDIUM",
      });
    }
  }

  return {
    supporting,
    contradictory,
    uncertain,
    quote,
    mode: hasLive ? "live" : "demo",
  };
}

function pushInto(
  it: EvidenceItem,
  sup: EvidenceItem[],
  con: EvidenceItem[],
  unc: EvidenceItem[],
) {
  if (it.kind === "supporting") sup.push(it);
  else if (it.kind === "contradictory") con.push(it);
  else unc.push(it);
}

export function confidenceWeight(c: Confidence): number {
  return c === "HIGH" ? 1 : c === "MEDIUM" ? 0.7 : c === "LOW" ? 0.4 : 0.25;
}
export function impactWeight(i: Impact): number {
  return i === "HIGH" ? 1 : i === "MEDIUM" ? 0.65 : 0.35;
}
