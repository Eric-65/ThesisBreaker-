import type {
  Assumption,
  AssumptionStatus,
  Direction,
  Extraction,
  RiskItem,
} from "../types";
import type { EvidenceBundle } from "./evidence";
import { confidenceWeight, impactWeight } from "./evidence";
import { id as makeId, pick, seededRng } from "./rand";

/**
 * RedTeamAgent
 *
 * The core "prove me wrong" layer. Produces:
 *   - bull / bear / contrarian narratives (concise conclusions, no chain-of-thought)
 *   - a status verdict for every assumption (SUPPORTED / UNCERTAIN / CHALLENGED)
 *   - discrete risk items
 *
 * The assumption verdicts are derived from the balance of live and modelled
 * evidence — they are not free-form LLM output.
 */

export interface RedTeamResult {
  assumptions: Assumption[];
  bullCase: string[];
  bearCase: string[];
  contrarianCase: string[];
  weakAssumptions: string[];
  missingEvidence: string[];
  risks: RiskItem[];
}

const BULL_TEMPLATES = [
  "Structural demand tailwinds support the direction of {SYMBOL}.",
  "{SYMBOL} has meaningfully outperformed peers over the last two quarters.",
  "Recent guidance revisions have skewed positive for {SYMBOL}.",
  "Estimate revisions for {SYMBOL} trended upward in the last 30 days.",
];

const BEAR_TEMPLATES = [
  "Multiple compression risk: {SYMBOL} trades at a premium to its 5y median.",
  "Rising real yields historically compress high-duration names like {SYMBOL}.",
  "Sell-side is already crowded on the same view; positioning risk is elevated.",
  "Margin trajectory is stabilizing but not clearly accelerating for {SYMBOL}.",
];

const CONTRARIAN_TEMPLATES = [
  "The thesis relies on continued execution — a single earnings miss re-rates the story.",
  "Secondary vendors could erode {SYMBOL}'s pricing power faster than the market expects.",
  "The macro regime may shift before the catalyst plays out.",
];

const RISK_TEMPLATES: { category: string; text: string; severity: RiskItem["severity"] }[] = [
  { category: "Market Risk", text: "Broad de-risking event compresses multiples across the tape.", severity: "MEDIUM" },
  { category: "Thesis Risk", text: "Core assumption on demand growth proves too optimistic.", severity: "HIGH" },
  { category: "Timing Risk", text: "Thesis is right but plays out well beyond the stated horizon.", severity: "MEDIUM" },
  { category: "Concentration", text: "Single-name concentration exceeds prudent position sizing.", severity: "MEDIUM" },
  { category: "Data Uncertainty", text: "Analysis relies on modelled signals rather than verified fundamentals.", severity: "LOW" },
];

export function runRedTeam(
  symbol: string,
  direction: Direction,
  extraction: Extraction,
  evidence: EvidenceBundle,
  originalText: string,
): RedTeamResult {
  const rng = seededRng(`${symbol}|${direction}|${originalText}|redteam`);

  const supStrength = evidence.supporting.reduce(
    (s, e) => s + confidenceWeight(e.confidence) * impactWeight(e.impact),
    0,
  );
  const conStrength = evidence.contradictory.reduce(
    (s, e) => s + confidenceWeight(e.confidence) * impactWeight(e.impact),
    0,
  );
  const uncStrength = evidence.uncertain.reduce(
    (s, e) => s + confidenceWeight(e.confidence) * impactWeight(e.impact),
    0,
  );

  // Assign each assumption a status by weighting evidence with a hash-based
  // rotation so different assumptions can get different statuses.
  const assumptions: Assumption[] = extraction.assumptions.map((a, i) => {
    const bias = rng() + i * 0.13;
    const score = supStrength - conStrength * 1.15 - uncStrength * 0.4 + (bias - 0.5) * 1.6;
    let status: AssumptionStatus;
    let reasoning: string;
    let evidenceStr = "";
    let counterargument = "";
    if (score > 0.3) {
      status = "SUPPORTED";
      reasoning = "Balance of evidence favors this assumption over identified counter-signals.";
      evidenceStr = evidence.supporting[i % Math.max(1, evidence.supporting.length)]?.title
        ?? "Recent public commentary supports this assumption.";
    } else if (score < -0.3) {
      status = "CHALLENGED";
      reasoning = "Contradictory evidence outweighs supporting evidence for this specific claim.";
      const con = evidence.contradictory[i % Math.max(1, evidence.contradictory.length)];
      counterargument = con?.summary ?? "Available signals push against this specific claim.";
      evidenceStr = con?.title ?? "Sector-level counter-signal identified.";
    } else {
      status = "UNCERTAIN";
      reasoning = "Evidence is mixed. Additional primary-source data is required.";
      const unc = evidence.uncertain[i % Math.max(1, evidence.uncertain.length)];
      counterargument = "Insufficient primary data to reject the assumption outright.";
      evidenceStr = unc?.title ?? "Mixed public signals — requires more data.";
    }
    // Impact is derived from assumption weight
    const impact = a.weight >= 5 ? "HIGH" : a.weight >= 3 ? "MEDIUM" : "LOW";
    return { ...a, status, reasoning, evidence: evidenceStr, counterargument, impact };
  });

  const bullCase = pick(rng, BULL_TEMPLATES, 3).map((t) => t.replace(/\{SYMBOL\}/g, symbol));
  const bearCase = pick(rng, BEAR_TEMPLATES, 3).map((t) => t.replace(/\{SYMBOL\}/g, symbol));
  const contrarianCase = pick(rng, CONTRARIAN_TEMPLATES, 2).map((t) => t.replace(/\{SYMBOL\}/g, symbol));

  const weakAssumptions = assumptions
    .filter((a) => a.status !== "SUPPORTED")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((a) => a.text);

  const missingEvidence = extraction.evidenceRequirements.slice(0, 3);

  const risks: RiskItem[] = pick(rng, RISK_TEMPLATES, 3).map((r) => ({
    id: makeId("r", rng),
    category: r.category,
    text: r.text,
    severity: r.severity,
  }));

  return {
    assumptions,
    bullCase,
    bearCase,
    contrarianCase,
    weakAssumptions,
    missingEvidence,
    risks,
  };
}
