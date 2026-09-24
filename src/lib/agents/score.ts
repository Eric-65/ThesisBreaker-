import type {
  Assumption,
  EvidenceItem,
  Extraction,
  RiskItem,
  ScoreBand,
  ScoreBreakdown,
  Verdict,
  VerdictStatus,
} from "../types";
import { confidenceWeight, impactWeight } from "./evidence";

/**
 * ScoreEngine (deterministic)
 *
 * Produces a 0-100 thesis-quality score using a fixed rubric:
 *   Evidence Support:       25%
 *   Assumption Strength:    25%
 *   Contradictory Evidence: 20%
 *   Risk Quality:           15%
 *   Invalidation Clarity:   15%
 *
 * This score reflects thesis QUALITY, not probability of profit.
 */
export function scoreThesis(input: {
  extraction: Extraction;
  assumptions: Assumption[];
  supporting: EvidenceItem[];
  contradictory: EvidenceItem[];
  uncertain: EvidenceItem[];
  risks: RiskItem[];
}): ScoreBreakdown {
  const { extraction, assumptions, supporting, contradictory, uncertain, risks } = input;

  // --- Evidence Support (25) — weighted quantity of supporting evidence ---
  const supStrength = supporting.reduce(
    (s, e) => s + confidenceWeight(e.confidence) * impactWeight(e.impact),
    0,
  );
  // ~3 medium/medium items -> ~1.4 -> ~18/25; 5+ strong -> ~24/25
  const evidenceEarned = Math.round(Math.min(25, Math.max(0, supStrength * 8 + 4)));

  // --- Assumption Strength (25) — weighted average of assumption statuses ---
  const totalWeight = assumptions.reduce((s, a) => s + a.weight, 0) || 1;
  const supportedWeight = assumptions
    .filter((a) => a.status === "SUPPORTED")
    .reduce((s, a) => s + a.weight, 0);
  const uncertainWeight = assumptions
    .filter((a) => a.status === "UNCERTAIN")
    .reduce((s, a) => s + a.weight * 0.5, 0);
  const assumptionsEarned = Math.round(((supportedWeight + uncertainWeight) / totalWeight) * 25);

  // --- Contradictory Evidence (20) — inverted: fewer/weaker contras -> more points ---
  const conStrength = contradictory.reduce(
    (s, e) => s + confidenceWeight(e.confidence) * impactWeight(e.impact),
    0,
  );
  const uncStrength = uncertain.reduce(
    (s, e) => s + confidenceWeight(e.confidence) * impactWeight(e.impact),
    0,
  );
  const contraPenalty = Math.min(20, Math.round(conStrength * 7 + uncStrength * 2));
  const contradictionsEarned = Math.max(0, 20 - contraPenalty);

  // --- Risk Quality (15) — better score if risks are identified and mostly low/medium ---
  const highRisks = risks.filter((r) => r.severity === "HIGH").length;
  const medRisks = risks.filter((r) => r.severity === "MEDIUM").length;
  const riskEarned = Math.max(0, Math.min(15, 15 - highRisks * 4 - medRisks));

  // --- Invalidation Clarity (15) — 1 IC = 5pt, 2 = 10pt, 3+ = 15pt ---
  const ic = extraction.invalidationConditions.length;
  const invalidationEarned = Math.min(15, ic * 5);

  const total = Math.max(
    0,
    Math.min(100, evidenceEarned + assumptionsEarned + contradictionsEarned + riskEarned + invalidationEarned),
  );

  return {
    evidence: { earned: evidenceEarned, max: 25 },
    assumptions: { earned: assumptionsEarned, max: 25 },
    contradictions: { earned: contradictionsEarned, max: 20 },
    risk: { earned: riskEarned, max: 15 },
    invalidation: { earned: invalidationEarned, max: 15 },
    total,
  };
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return "HIGH_CONVICTION";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "TESTABLE";
  if (score >= 40) return "FRAGILE";
  return "WEAK";
}

export function verdictStatus(
  score: number,
  band: ScoreBand,
  breakdown: ScoreBreakdown,
): VerdictStatus {
  if (band === "WEAK") return "REJECTED";
  if (band === "FRAGILE") return "THESIS_TOO_FRAGILE";
  // Extra guard: if we have HIGH-severity contradictions, force NEEDS_MORE_EVIDENCE
  if (band === "STRONG" || band === "HIGH_CONVICTION") {
    if (breakdown.contradictions.earned <= 8) return "NEEDS_MORE_EVIDENCE";
    return "VALIDATED_FOR_PAPER_TEST";
  }
  return "NEEDS_MORE_EVIDENCE";
}

export function buildVerdict(input: {
  breakdown: ScoreBreakdown;
  assumptions: Assumption[];
  supporting: EvidenceItem[];
  contradictory: EvidenceItem[];
  risks: RiskItem[];
  missingEvidence: string[];
  invalidationConditions: string[];
}): Verdict {
  const { breakdown, assumptions, supporting, contradictory, risks, missingEvidence, invalidationConditions } = input;
  const score = breakdown.total;
  const band = scoreBand(score);
  const status = verdictStatus(score, band, breakdown);

  const strongest = [...supporting].sort(
    (a, b) => confidenceWeight(b.confidence) * impactWeight(b.impact) - confidenceWeight(a.confidence) * impactWeight(a.impact),
  )[0];

  const weakest = [...assumptions]
    .filter((a) => a.status !== "SUPPORTED")
    .sort((a, b) => b.weight - a.weight)[0];

  const largest =
    [...risks].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0] ??
    ({ text: "General market risk.", severity: "MEDIUM" } as RiskItem);

  const bigContra = contradictory.length;
  const summary =
    status === "VALIDATED_FOR_PAPER_TEST"
      ? "The thesis survives red-team analysis. Supporting evidence outweighs the challenges, and no critical assumption has been invalidated."
      : status === "NEEDS_MORE_EVIDENCE"
        ? `The core thesis is plausible, but ${bigContra > 0 ? `${bigContra} contradictory signal${bigContra === 1 ? "" : "s"} and ` : ""}at least one important assumption remains weak.`
        : status === "THESIS_TOO_FRAGILE"
          ? "The thesis is too fragile in its current form. Multiple assumptions lack support and contradictions are material."
          : "The thesis has fundamental weaknesses. Multiple core assumptions are contradicted by available evidence.";

  const nextAction =
    status === "VALIDATED_FOR_PAPER_TEST"
      ? "Send to Alpaca paper trading with the configured position size."
      : status === "NEEDS_MORE_EVIDENCE"
        ? "Gather primary evidence on the weakest assumption, then re-challenge."
        : status === "THESIS_TOO_FRAGILE"
          ? "Rework the assumptions or reduce position size before re-challenging."
          : "Do not paper trade. The thesis needs structural revision.";

  return {
    score,
    band,
    status,
    summary,
    strongestFactor: strongest?.title ?? strongest?.summary ?? "No standout supporting evidence.",
    weakestAssumption: weakest?.text ?? "No materially weak assumption identified.",
    largestRisk: largest.text,
    missingEvidence,
    invalidationConditions,
    nextAction,
  };
}

function severityRank(s: string): number {
  if (s === "HIGH") return 3;
  if (s === "MEDIUM") return 2;
  return 1;
}

export function bandLabel(b: ScoreBand): string {
  switch (b) {
    case "WEAK":
      return "WEAK";
    case "FRAGILE":
      return "FRAGILE";
    case "TESTABLE":
      return "TESTABLE";
    case "STRONG":
      return "STRONG";
    case "HIGH_CONVICTION":
      return "HIGH CONVICTION";
  }
}

export function verdictLabel(v: VerdictStatus): string {
  switch (v) {
    case "VALIDATED_FOR_PAPER_TEST":
      return "VALIDATED FOR PAPER TEST";
    case "NEEDS_MORE_EVIDENCE":
      return "NEEDS MORE EVIDENCE";
    case "THESIS_TOO_FRAGILE":
      return "THESIS TOO FRAGILE";
    case "REJECTED":
      return "REJECTED";
  }
}
