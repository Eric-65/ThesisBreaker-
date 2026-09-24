import type { AnalysisResult, Direction, Extraction, InvalidationCondition } from "../types";
import { extractThesis } from "./extractor";
import { gatherEvidence, confidenceWeight, impactWeight } from "./evidence";
import { runRedTeam } from "./redTeam";
import { buildVerdict, scoreThesis } from "./score";
import { seededRng } from "./rand";

/**
 * AgentPipeline — the full decision pipeline for a thesis.
 *
 *   USER TEXT
 *     ↓  ThesisExtractor
 *   Extraction (main claim, assumptions, catalysts, invalidations)
 *     ↓  EvidenceEngine (Alpaca snapshot + model interpretation + demo fill)
 *   Evidence bundle
 *     ↓  RedTeamAgent (bull / bear / contrarian, assumption verdicts, risks)
 *   Red-team result
 *     ↓  ScoreEngine (deterministic 25/25/20/15/15 rubric)
 *   Score breakdown
 *     ↓  VerdictEngine
 *   Verdict + AnalysisResult
 */

export interface PipelineInput {
  symbol: string;
  direction: Direction;
  timeHorizon: string;
  originalText: string;
  catalysts?: string;
  expectedOutcome?: string;
  extractionOverride?: Extraction; // if user edited assumptions
  assetType?: "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
}

export async function runPipeline(input: PipelineInput): Promise<AnalysisResult> {
  const extraction =
    input.extractionOverride ??
    extractThesis({
      symbol: input.symbol,
      direction: input.direction,
      timeHorizon: input.timeHorizon,
      originalText: input.originalText,
      catalysts: input.catalysts,
      expectedOutcome: input.expectedOutcome,
    });

  const evidence = await gatherEvidence(
    input.symbol,
    input.direction,
    extraction,
    input.originalText,
    input.assetType,
  );

  const redTeam = runRedTeam(
    input.symbol,
    input.direction,
    extraction,
    evidence,
    input.originalText,
  );

  const breakdown = scoreThesis({
    extraction,
    assumptions: redTeam.assumptions,
    supporting: evidence.supporting,
    contradictory: evidence.contradictory,
    uncertain: evidence.uncertain,
    risks: redTeam.risks,
  });

  const verdict = buildVerdict({
    breakdown,
    assumptions: redTeam.assumptions,
    supporting: evidence.supporting,
    contradictory: evidence.contradictory,
    risks: redTeam.risks,
    missingEvidence: redTeam.missingEvidence,
    invalidationConditions: extraction.invalidationConditions,
  });

  // Strongest contradiction = highest confidence × impact contradictory item
  const strongestContra = [...evidence.contradictory].sort(
    (a, b) => confidenceWeight(b.confidence) * impactWeight(b.impact) - confidenceWeight(a.confidence) * impactWeight(a.impact),
  )[0];

  // Convert plain invalidation strings into structured InvalidationCondition[]
  // with a deterministic status per seed. Most start NOT_TRIGGERED; if there's
  // material contradictory evidence, promote 1-2 to WATCHING.
  const rngInv = seededRng(`${input.symbol}|invalidations|${input.originalText}`);
  const contraCount = evidence.contradictory.length;
  const invalidations: InvalidationCondition[] = extraction.invalidationConditions.map((text, i) => {
    let status: InvalidationCondition["status"] = "NOT_TRIGGERED";
    let detail = "No evidence yet suggests this condition has been met.";
    // First condition often gets escalated when contradictions exist
    if (contraCount >= 2 && i === 0) {
      status = "WATCHING";
      detail = "Contradictory evidence is starting to accumulate. Monitor closely.";
    } else if (contraCount >= 3 && i === 1 && rngInv() > 0.5) {
      status = "WATCHING";
      detail = "Sector signals warrant closer monitoring of this condition.";
    }
    return {
      id: `inv_${i}`,
      text,
      status,
      detail,
    };
  });

  return {
    claim: extraction.mainClaim,
    timeframe: input.timeHorizon,
    extraction: { ...extraction, invalidations },
    assumptions: redTeam.assumptions,
    bullCase: redTeam.bullCase,
    bearCase: redTeam.bearCase,
    contrarianCase: redTeam.contrarianCase,
    supportingEvidence: evidence.supporting,
    contradictoryEvidence: evidence.contradictory,
    uncertainEvidence: evidence.uncertain,
    weakAssumptions: redTeam.weakAssumptions,
    missingEvidence: redTeam.missingEvidence,
    invalidationConditions: extraction.invalidationConditions,
    invalidations,
    riskFactors: redTeam.risks,
    scoreBreakdown: breakdown,
    score: breakdown.total,
    verdict,
    strongestContradiction: strongestContra?.title
      ? `${strongestContra.title} — ${strongestContra.summary}`
      : undefined,
    demo: evidence.mode === "demo",
    dataMode: evidence.mode,
  };
}

export { extractThesis };
