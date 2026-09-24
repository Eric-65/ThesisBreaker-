export type Direction = "long" | "short";

export type EvidenceKind = "supporting" | "contradictory" | "uncertain";

export type AssumptionStatus = "SUPPORTED" | "UNCERTAIN" | "CHALLENGED";

export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type Impact = "LOW" | "MEDIUM" | "HIGH";
export type Severity = "LOW" | "MEDIUM" | "HIGH";

export interface Assumption {
  id: string;
  text: string;
  status: AssumptionStatus;
  weight: number; // 1-5
  reasoning: string;
  evidence?: string; // short factual snippet supporting/against
  counterargument?: string; // if CHALLENGED/UNCERTAIN, why
  impact?: Impact; // how much this assumption matters
}

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  title: string;
  summary: string;
  source: string; // Alpaca Market Data, Model Reasoning, Demo Signal, etc.
  sourceKind: "FACT" | "INTERPRETATION" | "DEMO";
  publishedAt?: string;
  relevance: Impact;
  confidence: Confidence;
  impact: Impact;
}

export interface RiskItem {
  id: string;
  category: string;
  text: string;
  severity: Severity;
}

export type InvalidationStatus = "NOT_TRIGGERED" | "WATCHING" | "TRIGGERED";

export interface InvalidationCondition {
  id: string;
  text: string;
  status: InvalidationStatus;
  detail: string;
}

export interface Extraction {
  mainClaim: string;
  direction: Direction;
  timeHorizon: string;
  catalysts: string[];
  assumptions: Assumption[];
  invalidationConditions: string[]; // legacy plain-text list preserved for compat
  invalidations?: InvalidationCondition[]; // richer per-condition state
  evidenceRequirements: string[];
  expectedOutcome: string;
}

export interface ScoreBreakdown {
  evidence: { earned: number; max: 25 };
  assumptions: { earned: number; max: 25 };
  contradictions: { earned: number; max: 20 };
  risk: { earned: number; max: 15 };
  invalidation: { earned: number; max: 15 };
  total: number; // 0-100
}

export type ScoreBand = "WEAK" | "FRAGILE" | "TESTABLE" | "STRONG" | "HIGH_CONVICTION";

export type VerdictStatus =
  | "VALIDATED_FOR_PAPER_TEST"
  | "NEEDS_MORE_EVIDENCE"
  | "THESIS_TOO_FRAGILE"
  | "REJECTED";

export interface Verdict {
  score: number;
  band: ScoreBand;
  status: VerdictStatus;
  summary: string;
  strongestFactor: string;
  weakestAssumption: string;
  largestRisk: string;
  missingEvidence: string[];
  invalidationConditions: string[];
  nextAction: string;
}

export interface AnalysisResult {
  claim: string;
  timeframe: string;
  extraction: Extraction;
  assumptions: Assumption[];
  bullCase: string[];
  bearCase: string[];
  contrarianCase: string[];
  supportingEvidence: EvidenceItem[];
  contradictoryEvidence: EvidenceItem[];
  uncertainEvidence: EvidenceItem[];
  weakAssumptions: string[];
  missingEvidence: string[];
  invalidationConditions: string[];
  invalidations: InvalidationCondition[];
  riskFactors: RiskItem[];
  scoreBreakdown: ScoreBreakdown;
  score: number;
  verdict: Verdict;
  strongestContradiction?: string;
  demo: boolean;
  dataMode: "demo" | "live"; // live means Alpaca-connected evidence
}

export type ThesisStatus =
  | "DRAFT"
  | "ANALYZING"
  | "CHALLENGED"
  | "NEEDS_EVIDENCE"
  | "VALIDATED"
  | "PAPER_TRADED"
  | "WEAKENING"
  | "INVALIDATED";

export interface RiskCheck {
  key: string;
  label: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

export interface RiskGateResult {
  ok: boolean;
  checks: RiskCheck[];
  blockedReason?: string;
  estimatedPrice: number;
  quantity: number;
  estimatedNotional: number;
  buyingPower: number;
  maxPositionPercent: number;
  maxNotional: number;
}

export interface MonitoringEventPayload {
  kind:
    | "SCORE_UPDATE"
    | "ASSUMPTION_WEAKENED"
    | "ASSUMPTION_STRENGTHENED"
    | "CONTRADICTION_DETECTED"
    | "INVALIDATION_TRIGGERED"
    | "PAPER_ORDER_SUBMITTED"
    | "PAPER_ORDER_FILLED"
    | "THESIS_CREATED"
    | "THESIS_RE_CHALLENGED";
  message: string;
  scoreBefore?: number;
  scoreAfter?: number;
  meta?: Record<string, unknown>;
}
