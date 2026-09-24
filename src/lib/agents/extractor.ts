import type { Assumption, Direction, Extraction } from "../types";
import { seededRng, id as makeId } from "./rand";

/**
 * ThesisExtractor
 *
 * Turns free-form thesis text into a structured Extraction: main claim,
 * assumptions, catalysts, invalidation conditions, and required evidence.
 *
 * This is a deterministic heuristic implementation designed to be
 * swapped out for an LLM-based extractor (LlmThesisExtractor) later
 * without changing any downstream code — it returns the exact
 * Extraction schema every downstream agent depends on.
 */
export interface ExtractInput {
  symbol: string;
  direction: Direction;
  timeHorizon: string;
  originalText: string;
  catalysts?: string;
  expectedOutcome?: string;
  assetType?: "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
}

const CATALYST_HINTS: Record<string, string> = {
  earnings: "Upcoming earnings report",
  guidance: "Company guidance update",
  launch: "Product launch",
  product: "Product cycle",
  fed: "Fed policy decision",
  macro: "Macro data print",
  rate: "Rate cut / hike decision",
  ai: "AI infrastructure spending",
  chip: "Semi capex cycle",
  gpu: "GPU / accelerator demand",
  cloud: "Hyperscaler capex",
  demand: "End-market demand trend",
  regulation: "Regulatory decision",
};

export function extractThesis(input: ExtractInput): Extraction {
  const at = input.assetType ?? "STOCK";
  const symbol = at === "NFT_COLLECTION" ? input.symbol.toLowerCase() : input.symbol.toUpperCase();
  const displaySymbol = symbol;
  const text = input.originalText || "";
  const t = text.toLowerCase();
  const rng = seededRng(`${symbol}|${input.direction}|${text}`);

  // --- Main claim ---
  const upVerb = at === "NFT_COLLECTION" ? "appreciate" : "outperform";
  const downVerb = at === "NFT_COLLECTION" ? "depreciate" : "underperform";
  const mainClaim =
    input.direction === "long"
      ? `${displaySymbol} will ${upVerb} over the next ${input.timeHorizon}.`
      : `${displaySymbol} will ${downVerb} over the next ${input.timeHorizon}.`;

  // --- Assumptions ---
  const assumptions: Assumption[] = [];
  const push = (text: string, weight: number) =>
    assumptions.push({
      id: makeId("a", rng),
      text,
      weight,
      status: "UNCERTAIN",
      reasoning: "",
    });

  if (/(ai|infrastructure|gpu|data ?center|compute|chip|accelerator|hyperscaler|cloud)/.test(t)) {
    push("AI infrastructure demand continues growing through the stated horizon.", 5);
  }
  if (/(margin|pricing|gross|operating|discount)/.test(t)) {
    push(`${symbol} maintains pricing power and defends gross margins.`, 4);
  }
  if (/(revenue|growth|top ?line|sales|demand)/.test(t)) {
    push(`${symbol} revenue growth remains at or above consensus.`, 5);
  }
  if (/(competition|competitor|moat|market share|rival)/.test(t)) {
    push(`${symbol} defends its competitive position against emerging rivals.`, 4);
  }
  if (/(valuation|multiple|pe|p\/e|expensive|cheap|priced|priced ?in)/.test(t)) {
    push("Current valuation does not fully price in the expected trajectory.", 4);
  }
  if (/(fed|rate|yield|macro|inflation|liquidity)/.test(t)) {
    push("The macro backdrop does not force multiple compression in the horizon.", 3);
  }
  if (/(earning|guidance|beat|report|call)/.test(t)) {
    push(`${symbol} delivers an in-line to above-consensus print at next earnings.`, 4);
  }
  if (/(catalyst|launch|product|announcement|conference|keynote)/.test(t)) {
    push("The identified catalyst materializes within the stated horizon.", 4);
  }

  // Fallbacks so we always have at least 3-4 real assumptions
  if (input.direction === "long") {
    if (assumptions.length < 3) push(`Demand for ${symbol}'s core product continues expanding.`, 4);
    if (assumptions.length < 4) push(`${symbol} executes without a material operational misstep.`, 4);
    if (assumptions.length < 5) push("Broad market conditions remain neutral to constructive.", 3);
  } else {
    if (assumptions.length < 3) push(`${symbol} fails to meet elevated growth expectations.`, 5);
    if (assumptions.length < 4) push("Multiple compresses as growth decelerates.", 4);
    if (assumptions.length < 5) push("No positive surprise catalyst emerges in the horizon.", 3);
  }

  const finalAssumptions = assumptions.slice(0, 5);

  // --- Catalysts ---
  const catalystSet = new Set<string>();
  for (const key of Object.keys(CATALYST_HINTS)) {
    if (t.includes(key)) catalystSet.add(CATALYST_HINTS[key]);
  }
  if (input.catalysts) {
    for (const c of input.catalysts.split(/[,;\n]/g)) {
      const v = c.trim();
      if (v) catalystSet.add(v);
    }
  }
  if (catalystSet.size === 0) {
    catalystSet.add("Next earnings print");
    catalystSet.add("Sector demand commentary");
  }
  const catalysts = Array.from(catalystSet).slice(0, 5);

  // --- Invalidation conditions ---
  const invalidationConditions: string[] = [
    `${symbol} guides revenue below consensus at next earnings.`,
    "Gross margin declines more than 200bps sequentially.",
    input.direction === "long"
      ? `${symbol} closes below its 200-day moving average on above-average volume.`
      : `${symbol} breaks out above prior resistance on strong volume.`,
  ];

  // --- Evidence requirements ---
  const evidenceRequirements: string[] = [
    "Independent primary-source data on end-market demand.",
    "Forward guidance from at least one direct competitor.",
    `Recent price action and volume on ${symbol}.`,
  ];

  return {
    mainClaim,
    direction: input.direction,
    timeHorizon: input.timeHorizon,
    catalysts,
    assumptions: finalAssumptions,
    invalidationConditions,
    evidenceRequirements,
    expectedOutcome: input.expectedOutcome?.trim() || "",
  };
}
