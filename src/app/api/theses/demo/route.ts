import { db } from "@/db";
import { theses } from "@/db/schema";
import { runPipeline } from "@/lib/agents/pipeline";
import { logEvent } from "@/lib/monitor";

export const dynamic = "force-dynamic";

const DEMO = {
  symbol: "NVDA",
  direction: "long" as const,
  timeHorizon: "3M",
  positionSize: "5000",
  riskTolerance: "moderate",
  originalText:
    "I believe NVIDIA will outperform over the next three months because AI infrastructure spending will continue growing, hyperscaler capex commitments remain intact, and NVIDIA maintains pricing power against emerging competition.",
  catalysts: "Q4 earnings, GTC keynote, hyperscaler capex guides",
  expectedOutcome: "15–25% upside over the next 3 months",
};

/**
 * POST /api/theses/demo
 *
 * One-click seed: creates the flagship NVDA "AI infrastructure" demo thesis
 * so a judge can experience the full flow in seconds without typing anything.
 */
export async function POST() {
  try {
    const analysis = await runPipeline(DEMO);
    const [row] = await db
      .insert(theses)
      .values({
        symbol: DEMO.symbol,
        assetType: "STOCK",
        direction: DEMO.direction,
        timeHorizon: DEMO.timeHorizon,
        positionSize: DEMO.positionSize,
        riskTolerance: DEMO.riskTolerance,
        originalText: DEMO.originalText,
        catalysts: DEMO.catalysts,
        expectedOutcome: DEMO.expectedOutcome,
        originalAnalysis: analysis,
        originalExtraction: analysis.extraction,
        initialScore: analysis.score,
        analysis,
        currentScore: analysis.score,
        status:
          analysis.verdict.status === "VALIDATED_FOR_PAPER_TEST"
            ? "VALIDATED"
            : analysis.verdict.status === "REJECTED" || analysis.verdict.status === "THESIS_TOO_FRAGILE"
              ? "INVALIDATED"
              : "NEEDS_EVIDENCE",
      })
      .returning();
    await logEvent(row.id, {
      kind: "THESIS_CREATED",
      message: `Demo thesis created for judge walkthrough. Initial score ${analysis.score}/100.`,
      scoreAfter: analysis.score,
    });
    return Response.json({ ok: true, data: row });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
