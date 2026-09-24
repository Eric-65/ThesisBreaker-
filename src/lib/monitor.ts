import { db } from "@/db";
import { monitoringEvents, theses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { runPipeline } from "./agents/pipeline";
import type { AnalysisResult, MonitoringEventPayload, Direction } from "./types";

export async function logEvent(thesisId: string, payload: MonitoringEventPayload) {
  await db.insert(monitoringEvents).values({
    thesisId,
    kind: payload.kind,
    message: payload.message,
    scoreBefore: payload.scoreBefore ?? null,
    scoreAfter: payload.scoreAfter ?? null,
    meta: payload.meta ?? null,
  });
}

export async function listEvents(thesisId: string) {
  return db
    .select()
    .from(monitoringEvents)
    .where(eq(monitoringEvents.thesisId, thesisId))
    .orderBy(desc(monitoringEvents.createdAt))
    .limit(200);
}

/**
 * Re-runs the agent pipeline against the SAME original thesis text
 * (never rewriting the original), captures the new score, appends
 * monitoring events for any material changes, and updates
 * `currentScore` + `analysis` on the thesis row.
 *
 * The original assumptions and initial score are preserved so the
 * user can always compare "what I believed then" vs "now".
 */
export async function reevaluateThesis(thesisId: string) {
  const [row] = await db.select().from(theses).where(eq(theses.id, thesisId)).limit(1);
  if (!row) throw new Error("thesis not found");

  const scoreBefore = row.currentScore;
  const prev = row.analysis as AnalysisResult;

  const next = await runPipeline({
    symbol: row.symbol,
    direction: row.direction as Direction,
    timeHorizon: row.timeHorizon,
    originalText: row.originalText,
    catalysts: row.catalysts ?? undefined,
    expectedOutcome: row.expectedOutcome ?? undefined,
  });

  const scoreAfter = next.score;

  await db
    .update(theses)
    .set({
      analysis: next,
      currentScore: scoreAfter,
      status:
        row.status === "PAPER_TRADED"
          ? scoreAfter < row.initialScore - 15
            ? "WEAKENING"
            : row.status
          : next.verdict.status === "VALIDATED_FOR_PAPER_TEST"
            ? "VALIDATED"
            : next.verdict.status === "REJECTED" || next.verdict.status === "THESIS_TOO_FRAGILE"
              ? "INVALIDATED"
              : "NEEDS_EVIDENCE",
      updatedAt: new Date(),
    })
    .where(eq(theses.id, thesisId));

  const prevAssumptions = new Map(prev.assumptions.map((a) => [a.text, a.status]));
  const weakened: string[] = [];
  const strengthened: string[] = [];
  for (const a of next.assumptions) {
    const before = prevAssumptions.get(a.text);
    if (!before) continue;
    if (before !== "CHALLENGED" && a.status === "CHALLENGED") weakened.push(a.text);
    else if (before === "CHALLENGED" && a.status === "SUPPORTED") strengthened.push(a.text);
  }
  const prevContraTitles = new Set(prev.contradictoryEvidence.map((e) => e.title));
  const newContras = next.contradictoryEvidence
    .filter((e) => !prevContraTitles.has(e.title))
    .map((e) => e.title);

  const diffMessageBits: string[] = [`Score ${scoreBefore} → ${scoreAfter}.`];
  if (weakened.length > 0) diffMessageBits.push(`${weakened.length} weakened.`);
  if (strengthened.length > 0) diffMessageBits.push(`${strengthened.length} strengthened.`);
  if (newContras.length > 0) diffMessageBits.push(`${newContras.length} new contradictions.`);

  await logEvent(thesisId, {
    kind: "THESIS_RE_CHALLENGED",
    message: diffMessageBits.join(" "),
    scoreBefore,
    scoreAfter,
    meta: {
      weakenedAssumptions: weakened,
      strengthenedAssumptions: strengthened,
      newContradictions: newContras,
    },
  });

  for (const text of weakened) {
    await logEvent(thesisId, {
      kind: "ASSUMPTION_WEAKENED",
      message: `Assumption weakened: "${text}"`,
      meta: { assumption: text },
    });
  }
  for (const text of strengthened) {
    await logEvent(thesisId, {
      kind: "ASSUMPTION_STRENGTHENED",
      message: `Assumption strengthened: "${text}"`,
      meta: { assumption: text },
    });
  }

  // Log each new contradiction as its own event so the alerts feed shows them individually.
  for (const title of newContras) {
    await logEvent(thesisId, {
      kind: "CONTRADICTION_DETECTED",
      message: `New contradiction: ${title}`,
      meta: { title },
    });
  }

  if (scoreAfter <= row.initialScore - 20 && row.status === "PAPER_TRADED") {
    await logEvent(thesisId, {
      kind: "INVALIDATION_TRIGGERED",
      message:
        "Score has fallen more than 20 points from initial. Review the original thesis. This does NOT auto-close the paper position.",
      scoreBefore: row.initialScore,
      scoreAfter,
    });
  }

  return { scoreBefore, scoreAfter, analysis: next };
}
