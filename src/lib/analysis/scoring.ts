import type { Assumption, AssumptionStatus, Verdict } from "./types";

const RANK: Record<Verdict, number> = { PASS: 0, REVISE: 1, BLOCK: 2 };

export function statusFromFragility(f: number): AssumptionStatus {
  if (f >= 70) return "broken";
  if (f >= 40) return "weak";
  return "holds";
}

/** Overall fragility: a chain breaks at its weakest link, but many weak links matter too. */
export function overallFragility(assumptions: Assumption[]): number {
  if (!assumptions.length) return 0;
  const max = Math.max(...assumptions.map((a) => a.fragility));
  const mean = assumptions.reduce((s, a) => s + a.fragility, 0) / assumptions.length;
  return Math.round(0.6 * max + 0.4 * mean);
}

/** The verdict the rules alone would give. */
export function ruleVerdict(assumptions: Assumption[]): Verdict {
  const broken = assumptions.filter((a) => a.status === "broken");
  const weak = assumptions.filter((a) => a.status === "weak");
  const max = Math.max(0, ...assumptions.map((a) => a.fragility));
  if (broken.length >= 2 || max >= 85) return "BLOCK";
  if (broken.length >= 1 || weak.length >= 2) return "REVISE";
  return "PASS";
}

/**
 * Guardrail on the model's verdict: the rules may escalate it (PASS→REVISE,
 * REVISE→BLOCK) but never soften it. Returns the verdict and a note if changed.
 */
export function guardVerdict(model: Verdict, assumptions: Assumption[]): { verdict: Verdict; note: string | null } {
  const rules = ruleVerdict(assumptions);
  if (RANK[rules] > RANK[model]) {
    return {
      verdict: rules,
      note: `Model said ${model}; escalated to ${rules} because the assumption scores cross the ${rules} threshold.`,
    };
  }
  return { verdict: model, note: null };
}

/** Use the model's pick unless it is clearly not the most fragile assumption. */
export function pickWeakest(assumptions: Assumption[], proposedId?: string | null): string {
  const sorted = [...assumptions].sort((a, b) => b.fragility - a.fragility);
  const proposed = assumptions.find((a) => a.id === proposedId);
  if (proposed && sorted[0].fragility - proposed.fragility <= 10) return proposed.id;
  return sorted[0].id;
}
